import { CURRENCY } from "../../constants";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const VEN_PLACEHOLDER = "04121234567";
export const VEN_PLACEHOLDER_RIF = "V12345678";
export const VEN_PLACEHOLDER_BANK = "Banesco";

export const VEN_VALIDATION_ERROR = "Please enter a valid phone number (e.g., 04121234567)";
export const VEN_VALIDATION_ERROR_RIF = "Please enter a valid RIF (e.g., V12345678)";
export const VEN_VALIDATION_ERROR_BANK = "Please enter a bank name";

/**
 * Validates Venezuelan phone number for Pago Movil.
 * Format: 04XX-XXXXXXX (11 digits starting with 04).
 */
export function validateVenezuelanPhoneNumber(phoneNumber: string): boolean {
	if (!phoneNumber || phoneNumber.trim().length === 0) return false;

	const cleaned = phoneNumber.trim().replace(/\D/g, "");

	if (/^04\d{9}$/.test(cleaned)) return true;
	if (/^4\d{9}$/.test(cleaned)) return true;

	return false;
}

/**
 * Validates Venezuelan RIF (Registro de Informacion Fiscal).
 * Format: One letter (J/V/E/G/C) followed by 7-9 digits.
 */
export function validateVenezuelanRif(rif: string): boolean {
	if (!rif || rif.trim().length === 0) return false;
	const trimmed = rif.trim().toUpperCase();
	return /^[JVEGC]\d{7,9}$/.test(trimmed);
}

/** Payment ID field configuration for VEN (Venezuela, Pago Móvil). */
export const VEN_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "phone",
		label: "PHONE_NUMBER",
		placeholder: VEN_PLACEHOLDER,
		displayLabel: "Phone",
		validate: validateVenezuelanPhoneNumber,
		validationErrorMessage: VEN_VALIDATION_ERROR,
	},
	{
		key: "rif",
		label: "RIF_LABEL",
		placeholder: VEN_PLACEHOLDER_RIF,
		displayLabel: "RIF",
		validate: validateVenezuelanRif,
		validationErrorMessage: VEN_VALIDATION_ERROR_RIF,
	},
	{
		key: "bank",
		label: "BANK_LABEL",
		placeholder: VEN_PLACEHOLDER_BANK,
		displayLabel: "Banco",
		validate: (v: string) => v.trim().length > 0,
		validationErrorMessage: VEN_VALIDATION_ERROR_BANK,
	},
];

/** Country option for Venezuela (VEN). */
export const VEN_COUNTRY_OPTION: CountryOption = {
	country: "Venezuela",
	currency: CURRENCY.VEN,
	internationalFormat: "VES",
	symbolNative: "Bs",
	locale: "es-VE",
	paymentMethod: "PAGO_MOVIL",
	paymentAddressName: "PAGO_MOVIL_DETAILS",
	timezone: "America/Caracas",
	timezone_name: "VET",
	flag: "🇻🇪",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1fb-1f1ea.png",
	phoneCode: "+58",
	telegramSupportChannel: "https://t.me/p2pmevenezuela",
	twitterUsername: "p2pmevenezuela",
	smsCountryCodes: ["VE"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: [],
};
