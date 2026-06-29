import { describe, expect, it } from "vitest";
import { COUNTRY_OPTIONS } from "../../src/country/countries";
import { ECU_COUNTRY_OPTION, ECU_PAYMENT_FIELDS } from "../../src/country/currencies/ecu";
import { PAYMENT_ID_FIELDS } from "../../src/country/payment-fields";
import { SUPPORTED_QR_CURRENCIES } from "../../src/qr-parsers/types";

describe("ECU country option", () => {
	it("is registered in COUNTRY_OPTIONS", () => {
		expect(COUNTRY_OPTIONS).toContain(ECU_COUNTRY_OPTION);
	});

	it("has the expected Ecuador metadata", () => {
		expect(ECU_COUNTRY_OPTION.country).toBe("Ecuador");
		expect(ECU_COUNTRY_OPTION.currency).toBe("ECU");
		expect(ECU_COUNTRY_OPTION.locale).toBe("es-EC");
		expect(ECU_COUNTRY_OPTION.symbolNative).toBe("$");
		expect(ECU_COUNTRY_OPTION.disabled).toBe(false);
		expect(ECU_COUNTRY_OPTION.isAlpha).toBe(true);
		expect(ECU_COUNTRY_OPTION.disabledPaymentTypes).toEqual([]);
		expect(ECU_COUNTRY_OPTION.telegramSupportChannel).toBe("https://t.me/Ecuador_P2P");
		expect(ECU_COUNTRY_OPTION.twitterUsername).toBe("P2Pdotme_Ecu");
	});

	it("enables QR/PAY support (appears in SUPPORTED_QR_CURRENCIES)", () => {
		expect(SUPPORTED_QR_CURRENCIES).toContain("ECU");
	});
});

describe("ECU payment fields", () => {
	it("is registered in PAYMENT_ID_FIELDS", () => {
		expect(PAYMENT_ID_FIELDS.ECU).toBe(ECU_PAYMENT_FIELDS);
	});

	it("has 5 fields in the agreed serialization order", () => {
		expect(ECU_PAYMENT_FIELDS.map((f) => f.key)).toEqual([
			"bank-name",
			"account-type",
			"account-number",
			"account-name",
			"cedula",
		]);
	});
});
