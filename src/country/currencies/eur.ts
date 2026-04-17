import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const EUR_PLACEHOLDER = "@username or email";
export const EUR_VALIDATION_ERROR = "Please enter a valid Revolut ID (username, email, or phone)";

/**
 * Validates Revolut ID (username, email, or phone number).
 */
export function validateRevolutId(revolutId: string): boolean {
	if (!revolutId || revolutId.trim().length === 0) return false;

	const trimmed = revolutId.trim();

	if (/^@?[a-zA-Z0-9._-]{3,30}$/.test(trimmed)) return true;
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
	if (/^\+?\d{7,15}$/.test(trimmed)) return true;

	return false;
}

/** Payment ID field configuration for EUR (Revolut EUR). */
export const EUR_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "revolut",
		label: "REVOLUT_ID",
		placeholder: EUR_PLACEHOLDER,
		displayLabel: "Revolut ID",
		validate: validateRevolutId,
		validationErrorMessage: EUR_VALIDATION_ERROR,
	},
];

/** Country option for Revolut EUR. */
export const EUR_COUNTRY_OPTION: CountryOption = {
	country: "Revolut EUR",
	currency: CURRENCY.EUR,
	symbolNative: "€",
	locale: "de-DE",
	paymentMethod: "REVOLUT",
	paymentAddressName: "REVOLUT_ID",
	timezone: "Europe/Berlin",
	timezone_name: "CET",
	flag: "",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f310.png",
	phoneCode: "",
	telegramSupportChannel: "https://t.me/P2Pdotme",
	twitterUsername: "P2Pdotme",
	smsCountryCodes: [],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: ["PAY"],
};
