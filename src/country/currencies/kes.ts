import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const KES_PLACEHOLDER = "0712345678 or 123456";
export const KES_VALIDATION_ERROR = "Please enter a valid M-Pesa phone number or till number";

/** Kind of Kenyan M-Pesa payment ID: a mobile phone number or a Buy Goods till number. */
export type KenyanPaymentType = "phone" | "till";

/**
 * Classifies a Kenyan M-Pesa payment ID as a `"phone"` number or a `"till"`
 * number, or `null` if it is neither. Phone numbers accept the `07XXXXXXXX`,
 * `01XXXXXXXX`, `2547XXXXXXXX`, `2541XXXXXXXX`, or bare `7XXXXXXXX`/`1XXXXXXXX`
 * forms; till numbers are 5–7 digits. The two are mutually exclusive by length.
 */
export function getKenyanPaymentType(paymentId: string): KenyanPaymentType | null {
	if (!paymentId || paymentId.trim().length === 0) return null;

	const cleaned = paymentId.trim().replace(/\D/g, "");

	if (
		/^254[17]\d{8}$/.test(cleaned) ||
		/^0[17]\d{8}$/.test(cleaned) ||
		/^[17]\d{8}$/.test(cleaned)
	) {
		return "phone";
	}
	if (/^\d{5,7}$/.test(cleaned)) return "till";

	return null;
}

/**
 * Validates a Kenyan M-Pesa payment ID — either a mobile phone number
 * (Send Money) or a Buy Goods till number.
 */
export function validateKenyanPaymentId(paymentId: string): boolean {
	return getKenyanPaymentType(paymentId) !== null;
}

/** Payment ID field configuration for KES (Kenya, M-Pesa). */
export const KES_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "mpesa",
		label: "MPESA_ID",
		placeholder: KES_PLACEHOLDER,
		displayLabel: "Phone or Till",
		validate: validateKenyanPaymentId,
		validationErrorMessage: KES_VALIDATION_ERROR,
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
