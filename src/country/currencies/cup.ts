import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const CUP_PLACEHOLDER_PHONE = "54004417";
export const CUP_PLACEHOLDER_CARD = "9227 9598 7238 3620";

export const CUP_VALIDATION_ERROR_PHONE =
	"Please enter a valid 8-digit phone number (e.g., 54004417)";
export const CUP_VALIDATION_ERROR_CARD =
	"Please enter a valid 16-digit card number (e.g., 9227 9598 7238 3620)";

/**
 * Validates Cuban phone number for Transfermóvil.
 * Format: 8 digits, optionally prefixed with the +53 country code.
 */
export function validateCubanPhoneNumber(phoneNumber: string): boolean {
	if (!phoneNumber || phoneNumber.trim().length === 0) return false;

	const cleaned = phoneNumber.trim().replace(/\D/g, "");

	if (/^\d{8}$/.test(cleaned)) return true;
	if (/^53\d{8}$/.test(cleaned)) return true;

	return false;
}

/**
 * Validates Cuban bank card number for Transfermóvil.
 * Format: 16 digits, spaces allowed (e.g., "9227 9598 7238 3620").
 */
export function validateCubanCardNumber(cardNumber: string): boolean {
	if (!cardNumber || cardNumber.trim().length === 0) return false;
	const cleaned = cardNumber.trim().replace(/[\s-]/g, "");
	return /^\d{16}$/.test(cleaned);
}

/** Payment ID field configuration for CUP (Cuba, Transfermóvil). */
export const CUP_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "phone",
		label: "PHONE_NUMBER",
		placeholder: CUP_PLACEHOLDER_PHONE,
		displayLabel: "Phone",
		validate: validateCubanPhoneNumber,
		validationErrorMessage: CUP_VALIDATION_ERROR_PHONE,
	},
	{
		key: "card",
		label: "CARD_NUMBER",
		placeholder: CUP_PLACEHOLDER_CARD,
		displayLabel: "Card",
		validate: validateCubanCardNumber,
		validationErrorMessage: CUP_VALIDATION_ERROR_CARD,
	},
];

/** Country option for Cuba (CUP). Transfermóvil transfers only — QR payments are disabled. */
export const CUP_COUNTRY_OPTION: CountryOption = {
	country: "Cuba",
	currency: CURRENCY.CUP,
	symbolNative: "$",
	locale: "es-CU",
	paymentMethod: "TRANSFERMOVIL",
	paymentAddressName: "TRANSFERMOVIL_DETAILS",
	timezone: "America/Havana",
	timezone_name: "CST",
	flag: "🇨🇺",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1e8-1f1fa.png",
	phoneCode: "+53",
	telegramSupportChannel: "https://t.me/p2pdotmecuba",
	twitterUsername: "P2Pdotmecuba",
	smsCountryCodes: ["CU"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: ["PAY"],
};
