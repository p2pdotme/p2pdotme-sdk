import { describe, expect, it } from "vitest";
import { parseQRPh } from "../../src/qr-parsers/parsers/php";
import { calculateCRC16 } from "../../src/qr-parsers/utils/crc16";

const SELL_PRICE = 58.5;

// Synthetic QR Ph sample (static, no amount) — currency 608 (PHP), country PH,
// merchant account template tag 27 shaped like a GCash-issued QR Ph. Account
// identifiers are fabricated; the CRC is recomputed so the payload is valid.
const SAMPLE =
	"00020101021127830012com.p2pqrpay0111GXCHPHM2XXX02081234567803150000000000000000417TESTTESTTESTTEST15204601653036085802PH5909TEST SHOP6006Manila61041000630476A9";

function tlv(tag: string, value: string): string {
	return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

/** Append the EMVCo CRC tag (63) so the payload passes checksum verification. */
function withCRC(data: string): string {
	return `${data}6304${calculateCRC16(data)}`;
}

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

describe("parseQRPh (PHP)", () => {
	it("parses a QR Ph payload and returns the raw payload verbatim", () => {
		const data = unwrap(parseQRPh(SAMPLE, SELL_PRICE));
		expect(data.paymentAddress).toBe(SAMPLE);
		expect(data.amount).toBeUndefined();
	});

	it("parses an amount (tag 54) and converts to usdc", () => {
		const payload = withCRC(
			`000201${tlv("53", "608")}${tlv("54", "1500")}${tlv("58", "PH")}${tlv("59", "JUAN D.")}`,
		);
		const data = unwrap(parseQRPh(payload, SELL_PRICE));
		expect(data.paymentAddress).toBe(payload);
		expect(data.amount).toEqual({ fiat: 1500, usdc: 1500 / SELL_PRICE });
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseQRPh(input, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it.each([
		["a non-PH country tag", withCRC(`000201${tlv("53", "608")}${tlv("58", "ID")}`)],
		["a non-PHP currency tag", withCRC(`000201${tlv("53", "360")}${tlv("58", "PH")}`)],
		["a missing country tag", withCRC(`000201${tlv("53", "608")}`)],
	])("rejects %s", (_label, input) => {
		const result = parseQRPh(input, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("INVALID_QR");
			expect(result.error.message).toBe("Not a valid QR Ph code");
		}
	});

	it("rejects a payload whose CRC has been tampered with", () => {
		const tampered = `${SAMPLE.slice(0, -4)}0000`;
		const result = parseQRPh(tampered, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("rejects a non-positive amount", () => {
		const payload = withCRC(
			`000201${tlv("53", "608")}${tlv("54", "0")}${tlv("58", "PH")}`,
		);
		const result = parseQRPh(payload, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_AMOUNT");
	});
});
