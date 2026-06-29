import { describe, expect, it } from "vitest";
import { parseDeUna } from "../../src/qr-parsers/parsers/ecu";

const SELL_PRICE = 1;
const SAMPLE_QR =
	"https://pagar.deuna.app/demo/merchant?id=demomerchant123";

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

describe("parseDeUna (ECU)", () => {
	it("parses the merchant id from a DeUna URL", () => {
		const data = unwrap(parseDeUna(SAMPLE_QR, SELL_PRICE));
		expect(data.paymentAddress).toBe("demomerchant123");
		expect(data.amount).toBeUndefined();
	});

	it("trims surrounding whitespace", () => {
		const data = unwrap(parseDeUna(`  ${SAMPLE_QR}  `, SELL_PRICE));
		expect(data.paymentAddress).toBe("demomerchant123");
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseDeUna(input, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when the id param is missing", () => {
		const result = parseDeUna("https://pagar.deuna.app/demo/merchant", SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR for a non-DeUna host", () => {
		const result = parseDeUna("https://evil.example.com/merchant?id=abc", SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR for a non-URL string", () => {
		const result = parseDeUna("not a url", SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});
