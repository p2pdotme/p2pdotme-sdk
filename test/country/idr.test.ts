import { describe, expect, it } from "vitest";
import {
	assignStoredPaymentIdToFieldValues,
	formatStoredPaymentIdForDisplay,
	getIndonesianPaymentProviderType,
	IDR_PAYMENT_PROVIDERS,
	PAYMENT_ID_FIELDS,
	packStoredPaymentId,
	validateStoredPaymentId,
} from "../../src/country";

describe("IDR payment providers list", () => {
	it("lists e-wallets and banks with unique names", () => {
		expect(IDR_PAYMENT_PROVIDERS.some((p) => p.type === "e-wallet")).toBe(true);
		expect(IDR_PAYMENT_PROVIDERS.some((p) => p.type === "bank")).toBe(true);
		const names = IDR_PAYMENT_PROVIDERS.map((p) => p.name);
		expect(new Set(names).size).toBe(names.length);
	});
});

describe("getIndonesianPaymentProviderType", () => {
	it("classifies banks and e-wallets case-insensitively", () => {
		expect(getIndonesianPaymentProviderType("BNI")).toBe("bank");
		expect(getIndonesianPaymentProviderType(" bank jago ")).toBe("bank");
		expect(getIndonesianPaymentProviderType("GoPay")).toBe("e-wallet");
		expect(getIndonesianPaymentProviderType("GOPAY")).toBe("e-wallet");
	});

	it("returns null for unknown or empty providers", () => {
		expect(getIndonesianPaymentProviderType("")).toBeNull();
		expect(getIndonesianPaymentProviderType("PayPal")).toBeNull();
	});
});

describe("IDR phone-only payment id", () => {
	it("has a single phone field", () => {
		expect(PAYMENT_ID_FIELDS.IDR.map((f) => f.key)).toEqual(["phone"]);
	});

	it("packs, validates, hydrates and formats a bare phone number", () => {
		expect(packStoredPaymentId("IDR", null, { phone: "8123456789" })).toBe("8123456789");
		expect(validateStoredPaymentId("IDR", "8123456789")).toBe(true);
		expect(validateStoredPaymentId("IDR", "abc")).toBe(false);
		expect(assignStoredPaymentIdToFieldValues("IDR", "8123456789")).toEqual({
			phone: "8123456789",
		});
		expect(formatStoredPaymentIdForDisplay("IDR", "8123456789")).toBe("8123456789");
	});
});
