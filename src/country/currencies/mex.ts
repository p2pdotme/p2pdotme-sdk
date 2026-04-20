import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const MEX_PLACEHOLDER = "012345678901234567";
export const MEX_VALIDATION_ERROR =
	"Please enter a valid CLABE (18 digits), card number, or phone number";

/**
 * Validates Mexican payment IDs (CLABE, card number, or phone number).
 * CLABE: 18 digits. Card: 16 digits. Phone: 10 digits.
 */
export function validateMexicanPaymentId(paymentId: string): boolean {
	if (!paymentId || paymentId.trim().length === 0) return false;

	const trimmed = paymentId.trim().replace(/\D/g, "");

	if (/^\d{18}$/.test(trimmed)) return true;
	if (/^\d{16}$/.test(trimmed)) return true;
	if (/^\d{10}$/.test(trimmed)) return true;

	return false;
}

/** Payment ID field configuration for MEX (Mexico, SPEI). */
export const MEX_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "clabe",
		label: "CLABE_ID",
		placeholder: MEX_PLACEHOLDER,
		displayLabel: "CLABE",
		validate: validateMexicanPaymentId,
		validationErrorMessage: MEX_VALIDATION_ERROR,
	},
];

/** Country option for Mexico (MEX). */
export const MEX_COUNTRY_OPTION: CountryOption = {
	country: "Mexico",
	currency: CURRENCY.MEX,
	internationalFormat: "MXN",
	symbolNative: "Mx",
	locale: "es-MX",
	paymentMethod: "SPEI",
	paymentAddressName: "CLABE_ID",
	timezone: "America/Mexico_City",
	timezone_name: "CST",
	flag: "🇲🇽",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1f2-1f1fd.png",
	phoneCode: "+52",
	telegramSupportChannel: "https://t.me/p2pmemexico",
	twitterUsername: "p2pmemexico",
	smsCountryCodes: ["MX"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: ["PAY"],
};
