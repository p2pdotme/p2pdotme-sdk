import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const EGP_PHONE_PLACEHOLDER = "01012345678";
export const EGP_PHONE_VALIDATION_ERROR = "Please enter a valid Vodafone Cash phone number";

/**
 * Validates an Egyptian mobile number for Vodafone Cash. Accepts the local
 * `01XXXXXXXXX` form, the international `201XXXXXXXXX` form (optional `+`),
 * or the bare `1XXXXXXXXX` form. The prefix after the leading `1` must be
 * `0`, `1`, `2`, or `5` (Vodafone, Etisalat, Orange, WE).
 */
export function validateEgyptianPhone(phone: string): boolean {
	if (!phone || phone.trim().length === 0) return false;
	if (/[a-zA-Z]/.test(phone)) return false;

	const cleaned = phone.trim().replace(/\D/g, "");

	return (
		/^201[0125]\d{8}$/.test(cleaned) ||
		/^01[0125]\d{8}$/.test(cleaned) ||
		/^1[0125]\d{8}$/.test(cleaned)
	);
}

/** Payment ID field configuration for EGP (Egypt, Vodafone Cash). */
export const EGP_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "phone",
		label: "PHONE_NUMBER",
		placeholder: EGP_PHONE_PLACEHOLDER,
		displayLabel: "Phone Number",
		validate: validateEgyptianPhone,
		validationErrorMessage: EGP_PHONE_VALIDATION_ERROR,
	},
];

/** Country option for Egypt (EGP). Vodafone Cash phone number; BUY and SELL only, no PAY flow. */
export const EGP_COUNTRY_OPTION: CountryOption = {
	country: "Egypt",
	currency: CURRENCY.EGP,
	symbolNative: "E£",
	locale: "en-EG",
	paymentMethod: "VODAFONE_CASH",
	paymentAddressName: "VODAFONE_CASH_DETAILS",
	timezone: "Africa/Cairo",
	timezone_name: "EET",
	flag: "🇪🇬",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1ea-1f1ec.png",
	phoneCode: "+20",
	telegramSupportChannel: "https://t.me/p2pmeegypt",
	twitterUsername: "p2pmeegypt",
	smsCountryCodes: ["EG"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: ["PAY"],
};
