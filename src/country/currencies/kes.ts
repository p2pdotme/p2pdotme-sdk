import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const KES_PHONE_PLACEHOLDER = "0712345678";
export const KES_TILL_PLACEHOLDER = "123456";
export const KES_PHONE_VALIDATION_ERROR = "Please enter a valid M-Pesa phone number";
export const KES_TILL_VALIDATION_ERROR = "Please enter a valid M-Pesa till number";

/**
 * Validates a Kenyan M-Pesa phone number (Send Money). Accepts the
 * `07XXXXXXXX`, `01XXXXXXXX`, `2547XXXXXXXX`, `2541XXXXXXXX`, or bare
 * `7XXXXXXXX`/`1XXXXXXXX` forms.
 */
export function validateKenyanPhone(phone: string): boolean {
	if (!phone || phone.trim().length === 0) return false;

	const cleaned = phone.trim().replace(/\D/g, "");

	return (
		/^254[17]\d{8}$/.test(cleaned) || /^0[17]\d{8}$/.test(cleaned) || /^[17]\d{8}$/.test(cleaned)
	);
}

/**
 * Validates a Kenyan M-Pesa Buy Goods till number (5–7 digits).
 */
export function validateKenyanTill(till: string): boolean {
	if (!till || till.trim().length === 0) return false;

	const cleaned = till.trim().replace(/\D/g, "");

	return /^\d{5,7}$/.test(cleaned);
}

/** Payment ID field configuration for KES (Kenya, M-Pesa). Fill phone number or till number. */
export const KES_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "phone",
		label: "PHONE_NUMBER",
		placeholder: KES_PHONE_PLACEHOLDER,
		displayLabel: "Phone Number",
		validate: validateKenyanPhone,
		validationErrorMessage: KES_PHONE_VALIDATION_ERROR,
		optional: true,
	},
	{
		key: "till",
		label: "TILL_NUMBER",
		placeholder: KES_TILL_PLACEHOLDER,
		displayLabel: "Till Number",
		validate: validateKenyanTill,
		validationErrorMessage: KES_TILL_VALIDATION_ERROR,
		optional: true,
	},
];

/** Country option for Kenya (KES). M-Pesa phone number or till number; no PAY flow. */
export const KES_COUNTRY_OPTION: CountryOption = {
	country: "Kenya",
	currency: CURRENCY.KES,
	symbolNative: "KSh",
	locale: "en-KE",
	paymentMethod: "MPESA",
	paymentAddressName: "MPESA_DETAILS",
	timezone: "Africa/Nairobi",
	timezone_name: "EAT",
	flag: "🇰🇪",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1f0-1f1ea.png",
	phoneCode: "+254",
	telegramSupportChannel: "https://t.me/p2pmekenya",
	twitterUsername: "p2pmekenya",
	smsCountryCodes: ["KE"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: ["PAY"],
};
