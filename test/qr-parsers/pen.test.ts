import { describe, expect, it } from "vitest";
import { parsePeru } from "../../src/qr-parsers/parsers/pen";
import { calculateCRC16 } from "../../src/qr-parsers/utils/crc16";

const SELL_PRICE = 3.75;

// Real Yape QR sample (static, no amount) — currency 604 (PEN), country PE.
const SAMPLE =
	"0002010102113932acfba6cb922753c690f09280f365d7a25204561153036045802PE5906YAPERO6004Lima6304ECE9";

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

describe("parsePeru (PEN)", () => {
	it("parses the real Yape QR sample and returns the raw payload verbatim", () => {
		const data = unwrap(parsePeru(SAMPLE, SELL_PRICE));
		expect(data.paymentAddress).toBe(SAMPLE);
		expect(data.amount).toBeUndefined();
	});

	it("parses an amount (tag 54) and converts to usdc", () => {
		const withAmount = withCRC(
			`000201${tlv("53", "604")}${tlv("54", "1500")}${tlv("58", "PE")}${tlv("59", "YAPERO")}`,
		);
		const data = unwrap(parsePeru(withAmount, SELL_PRICE));
		expect(data.paymentAddress).toBe(withAmount);
		expect(data.amount).toEqual({ fiat: 1500, usdc: 1500 / SELL_PRICE });
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parsePeru(input, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR for a non-Peru currency (tag 53 not 604)", () => {
		const tweaked = SAMPLE.replace("5303604", "5303840");
		const result = parsePeru(tweaked, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when the CRC has been tampered with", () => {
		// Corrupt the merchant name (tag 59) without recomputing the CRC.
		const tampered = SAMPLE.replace("5906YAPERO", "5906YAPERX");
		const result = parsePeru(tampered, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when the CRC tag is missing", () => {
		const noCrc = `000201${tlv("53", "604")}${tlv("58", "PE")}${tlv("59", "YAPERO")}`;
		const result = parsePeru(noCrc, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});
