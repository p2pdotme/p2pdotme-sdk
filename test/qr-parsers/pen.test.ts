import { describe, expect, it } from "vitest";
import { parsePeru } from "../../src/qr-parsers/parsers/pen";
import { calculateCRC16 } from "../../src/qr-parsers/utils/crc16";

const SELL_PRICE = 3.75;

// Real Yape QR sample (static, no amount) — currency 604 (PEN), country PE.
const SAMPLE =
	"0002010102113932acfba6cb922753c690f09280f365d7a25204561153036045802PE5906YAPERO6004Lima6304ECE9";

// Real Entel bill-payment QR (dynamic). The app shows "S/ 277.00" but tag 54
// carries "27700" — the amount in céntimos, with no decimal point.
const ENTEL_SAMPLE =
	"000201010212263700028001039030220261108092106031037005204482953036045405277005802PE5924Entel Recibos PEN 277.006004Lima80550003ID10144hPTweUnB+5ptkADgff67pWVJt9L+/wKftVCCu7jnj28=90260005GLOSA0113Entel Recibos91230007FECVCTO01082026110892140005QUOTA010116304F133";

function tlv(tag: string, value: string): string {
	return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

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

	it("reads the Entel bill QR amount as S/ 277.00, not 27,700", () => {
		const data = unwrap(parsePeru(ENTEL_SAMPLE, SELL_PRICE));
		expect(data.paymentAddress).toBe(ENTEL_SAMPLE);
		expect(data.amount).toEqual({ fiat: 277, usdc: 277 / SELL_PRICE });
	});

	it("keeps a decimal amount as soles even for a céntimos issuer", () => {
		const qr = withCRC(
			`000201${tlv("26", tlv("00", "80"))}${tlv("53", "604")}${tlv("54", "277.00")}${tlv("58", "PE")}`,
		);
		expect(unwrap(parsePeru(qr, SELL_PRICE)).amount).toEqual({ fiat: 277, usdc: 277 / SELL_PRICE });
	});

	it("keeps an integer amount as soles for other issuers", () => {
		const qr = withCRC(
			`000201${tlv("26", tlv("00", "81"))}${tlv("53", "604")}${tlv("54", "27700")}${tlv("58", "PE")}`,
		);
		expect(unwrap(parsePeru(qr, SELL_PRICE)).amount).toEqual({
			fiat: 27700,
			usdc: 27700 / SELL_PRICE,
		});
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

	it("returns INVALID_QR when CRC does not match (same rule as SELL upload)", () => {
		const corrupted = SAMPLE.replace("6304ECE9", "6304FFFF");
		const result = parsePeru(corrupted, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});
