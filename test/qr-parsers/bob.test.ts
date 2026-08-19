import { describe, expect, it } from "vitest";
import { parseBolivia } from "../../src/qr-parsers/parsers/bob";

const SELL_PRICE = 6.96;

function tlv(tag: string, value: string): string {
	return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

// QR Simple EMVCo payload — currency 068 (BOB), country BO.
const SAMPLE = `000201${tlv("53", "068")}${tlv("58", "BO")}${tlv("59", "TIENDA")}6304ABCD`;

describe("parseBolivia (BOB)", () => {
	it("parses a QR Simple payload and returns the raw payload verbatim", () => {
		const data = unwrap(parseBolivia(SAMPLE, SELL_PRICE));
		expect(data.paymentAddress).toBe(SAMPLE);
		expect(data.amount).toBeUndefined();
	});

	it("parses an amount (tag 54) and converts to usdc", () => {
		const withAmount = `000201${tlv("53", "068")}${tlv("54", "1392")}${tlv("58", "BO")}${tlv("59", "TIENDA")}`;
		const data = unwrap(parseBolivia(withAmount, SELL_PRICE));
		expect(data.paymentAddress).toBe(withAmount);
		expect(data.amount).toEqual({ fiat: 1392, usdc: 1392 / SELL_PRICE });
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseBolivia(input, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR for a non-Bolivia currency (tag 53 not 068)", () => {
		const tweaked = SAMPLE.replace("5303068", "5303840");
		const result = parseBolivia(tweaked, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});
