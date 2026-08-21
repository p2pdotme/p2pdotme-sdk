import { describe, expect, it } from "vitest";
import { COUNTRY_OPTIONS, getTransferWarning } from "../../src/country/countries";
import { CUP_COUNTRY_OPTION } from "../../src/country/currencies/cup";

describe("getTransferWarning", () => {
	it("returns the CUP i18n key and nothing else", () => {
		expect(CUP_COUNTRY_OPTION.transferWarning).toBe("CUP_BANDEC_WARNING");
		expect(COUNTRY_OPTIONS.filter((c) => c.transferWarning).map((c) => c.currency)).toEqual([
			"CUP",
		]);
	});

	it("reads the key from COUNTRY_OPTIONS", () => {
		expect(getTransferWarning("CUP")).toBe("CUP_BANDEC_WARNING");
		expect(getTransferWarning("INR")).toBeNull();
		expect(getTransferWarning("BRL")).toBeNull();
		expect(getTransferWarning(null)).toBeNull();
	});
});
