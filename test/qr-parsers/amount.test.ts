import { describe, expect, it } from "vitest";
import { parseAmount } from "../../src/qr-parsers/utils/amount";

describe("parseAmount", () => {
	it("parses a plain decimal amount and converts to usdc", () => {
		expect(parseAmount("100", 2)).toEqual({ fiat: 100, usdc: 50 });
		expect(parseAmount("10.50", 5)).toEqual({ fiat: 10.5, usdc: 2.1 });
	});

	it("trims surrounding whitespace", () => {
		expect(parseAmount("  25  ", 5)).toEqual({ fiat: 25, usdc: 5 });
	});

	it("returns null for empty or blank input", () => {
		expect(parseAmount("", 5)).toBeNull();
		expect(parseAmount("   ", 5)).toBeNull();
	});

	it("returns null for non-positive amounts", () => {
		expect(parseAmount("0", 5)).toBeNull();
		expect(parseAmount("-10", 5)).toBeNull();
	});

	// Regression: parseFloat used to accept a valid numeric prefix and ignore the
	// rest, letting malformed QR amount fields through as a bogus "success".
	it("rejects trailing garbage", () => {
		expect(parseAmount("12abc", 5)).toBeNull();
		expect(parseAmount("10 20", 5)).toBeNull();
	});

	// Regression: parseFloat accepted "Infinity" and exponent notation, producing
	// non-finite or unexpected amounts from a QR field.
	it("rejects Infinity, NaN, and exponent notation", () => {
		expect(parseAmount("Infinity", 5)).toBeNull();
		expect(parseAmount("NaN", 5)).toBeNull();
		expect(parseAmount("1e3", 5)).toBeNull();
	});

	// Regression: an unvalidated sellPrice of 0 produced Infinity usdc, and a
	// negative sellPrice produced a negative usdc amount.
	it("rejects a zero, negative, or non-finite sellPrice", () => {
		expect(parseAmount("100", 0)).toBeNull();
		expect(parseAmount("100", -2)).toBeNull();
		expect(parseAmount("100", Number.NaN)).toBeNull();
		expect(parseAmount("100", Number.POSITIVE_INFINITY)).toBeNull();
	});
});
