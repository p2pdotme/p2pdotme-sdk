import { CURRENCY } from "../../constants";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const IDR_PLACEHOLDER = "8123456789";
export const IDR_VALIDATION_ERROR =
	"Please enter a valid Indonesian phone number (e.g., 8123456789)";

/**
 * Validates Indonesian phone number.
 * Validates just the number part (9-12 digits).
 */
export function validateIndonesianPhoneNumber(phoneNumber: string): boolean {
	if (!phoneNumber || phoneNumber.trim().length === 0) return false;
	if (/[a-zA-Z]/.test(phoneNumber)) return false;
	const cleaned = phoneNumber.replace(/\D/g, "");
	return /^\d{9,12}$/.test(cleaned);
}

/** Payment ID field configuration for IDR (Indonesia, QRIS). */
export const IDR_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "phone",
		label: "PHONE_NUMBER",
		placeholder: IDR_PLACEHOLDER,
		displayLabel: "Phone Number",
		validate: validateIndonesianPhoneNumber,
		validationErrorMessage: IDR_VALIDATION_ERROR,
	},
];

/** Country option for Indonesia (IDR). */
export const IDR_COUNTRY_OPTION: CountryOption = {
	country: "Indonesia",
	currency: CURRENCY.IDR,
	symbolNative: "Rp",
	locale: "id-ID",
	paymentMethod: "QRIS",
	paymentAddressName: "PHONE_NUMBER",
	timezone: "Asia/Jakarta",
	timezone_name: "WIB",
	flag: "🇮🇩",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1ee-1f1e9.png",
	phoneCode: "+62",
	telegramSupportChannel: "https://t.me/p2pmeindonesia",
	twitterUsername: "p2pdotmeID",
	smsCountryCodes: [],
	precision: 0,
	isAlpha: false,
	disabled: false,
	disabledPaymentTypes: [],
};
