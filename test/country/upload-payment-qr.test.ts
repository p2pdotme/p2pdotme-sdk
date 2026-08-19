import { describe, expect, it } from "vitest";
import {
	COUNTRY_OPTIONS,
	uploadsPaymentQR,
	usesCatalogPaymentForm,
	usesPackedPaymentId,
} from "../../src/country/countries";
import { PEN_COUNTRY_OPTION } from "../../src/country/currencies/pen";

describe("uploadPaymentQR", () => {
	it("is true for Peru (PEN) and Venezuela (VEN)", () => {
		expect(PEN_COUNTRY_OPTION.uploadPaymentQR).toBe(true);
		expect(typeof PEN_COUNTRY_OPTION.validateQr).toBe("function");
		expect(COUNTRY_OPTIONS.filter((c) => c.uploadPaymentQR).map((c) => c.currency)).toEqual([
			"VEN",
			"PEN",
		]);
	});

	it("uploadsPaymentQR reads the flag from COUNTRY_OPTIONS", () => {
		expect(uploadsPaymentQR("PEN")).toBe(true);
		expect(uploadsPaymentQR("VEN")).toBe(true);
		expect(uploadsPaymentQR("INR")).toBe(false);
		expect(uploadsPaymentQR("BRL")).toBe(false);
		expect(uploadsPaymentQR(null)).toBe(false);
	});

	it("usesPackedPaymentId follows validateQr", () => {
		expect(usesPackedPaymentId("PEN")).toBe(true);
		expect(usesPackedPaymentId("VEN")).toBe(true);
		expect(usesPackedPaymentId("CUP")).toBe(false);
	});

	it("usesCatalogPaymentForm is true for QR-upload and multi-field currencies", () => {
		expect(usesCatalogPaymentForm("PEN")).toBe(true);
		expect(usesCatalogPaymentForm("VEN")).toBe(true);
		expect(usesCatalogPaymentForm("CUP")).toBe(true);
		expect(usesCatalogPaymentForm("NGN")).toBe(true);
		expect(usesCatalogPaymentForm("INR")).toBe(false);
	});
});
