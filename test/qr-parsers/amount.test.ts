import { describe, expect, it } from "vitest";
import { parseAmount } from "../../src/qr-parsers/utils/amount";

describe("parseAmount", () => {
	it("parses valid positive amount strings and returns correct values", () => {
		expect(parseAmount("100", 5)).toEqual({ fiat: 100, usdc: 20 });
		expect(parseAmount("10.5", 2.1)).toEqual({ fiat: 10.5, usdc: 5 });
		expect(parseAmount(" 50.0 ", 10)).toEqual({ fiat: 50, usdc: 5 });
	});

	it("returns null for empty or invalid strings", () => {
		expect(parseAmount("", 5)).toBeNull();
		expect(parseAmount("   ", 5)).toBeNull();
		expect(parseAmount("abc", 5)).toBeNull();
		expect(parseAmount("10a", 5)).toEqual({ fiat: 10, usdc: 2 }); // parseFloat parses leading digits
	});

	it("returns null for non-positive amounts", () => {
		expect(parseAmount("0", 5)).toBeNull();
		expect(parseAmount("-10", 5)).toBeNull();
	});

	it("returns null for invalid sellPrice <= 0", () => {
		expect(parseAmount("100", 0)).toBeNull();
		expect(parseAmount("100", -5)).toBeNull();
	});
});
