import { describe, expect, it } from "vitest";
import { COUNTRY_OPTIONS, uploadsPaymentQR } from "../../src/country/countries";
import { PEN_COUNTRY_OPTION } from "../../src/country/currencies/pen";

describe("uploadPaymentQR", () => {
	it("is true only for Peru (PEN)", () => {
		expect(PEN_COUNTRY_OPTION.uploadPaymentQR).toBe(true);
		expect(PEN_COUNTRY_OPTION.packedPaymentId).toBe(true);
		expect(COUNTRY_OPTIONS.filter((c) => c.uploadPaymentQR).map((c) => c.currency)).toEqual([
			"PEN",
		]);
	});

	it("uploadsPaymentQR reads the flag from COUNTRY_OPTIONS", () => {
		expect(uploadsPaymentQR("PEN")).toBe(true);
		expect(uploadsPaymentQR("INR")).toBe(false);
		expect(uploadsPaymentQR("BRL")).toBe(false);
		expect(uploadsPaymentQR("VEN")).toBe(false);
		expect(uploadsPaymentQR(null)).toBe(false);
	});
});
