import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

// ── Placeholders & error messages ────────────────────────────────────────────

export const ECU_PLACEHOLDER_BANK = "Banco Pichincha";
export const ECU_PLACEHOLDER_ACCOUNT_TYPE = "Savings / Checking";
export const ECU_PLACEHOLDER_ACCOUNT_NUMBER = "2100123456";
export const ECU_PLACEHOLDER_NAME = "Juan Pérez";
export const ECU_PLACEHOLDER_CEDULA = "1710034065";

export const ECU_BANK_VALIDATION_ERROR = "Please enter the bank name";
export const ECU_ACCOUNT_TYPE_VALIDATION_ERROR = "Please enter the account type";
export const ECU_ACCOUNT_NUMBER_VALIDATION_ERROR =
	"Please enter a valid account number (4-20 digits)";
export const ECU_NAME_VALIDATION_ERROR = "Please enter the account holder name";
export const ECU_CEDULA_VALIDATION_ERROR =
	"Please enter a valid identification number (9-13 digits)";

// ── Validators ───────────────────────────────────────────────────────────────

/**
 * Validates an Ecuadorian identification number — 9–13 digits after stripping
 * separators. Covers a 9-digit foreign-national ID, a 10-digit cédula and a
 * 13-digit RUC without enforcing a checksum, since foreign IDs have none.
 */
export function validateEcuadorianCedula(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	const cleaned = value.trim().replace(/\D/g, "");
	return /^\d{9,13}$/.test(cleaned);
}

/** Validates an Ecuadorian bank account number — 4–20 digits after stripping separators. */
export function validateEcuadorianAccountNumber(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	const cleaned = value.trim().replace(/\D/g, "");
	return /^\d{4,20}$/.test(cleaned);
}

/** Validates an account holder name — non-empty, letters/spaces/apostrophe/period/hyphen only. */
export function validateEcuadorianAccountName(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]{1,}$/.test(value.trim());
}

// ── Payment fields ───────────────────────────────────────────────────────────

/** Payment ID field configuration for ECU (Ecuador, bank transfer — all free text). */
export const ECU_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "bank-name",
		label: "BANK_NAME",
		placeholder: ECU_PLACEHOLDER_BANK,
		displayLabel: "Bank",
		validate: (v: string) => v.trim().length > 0,
		validationErrorMessage: ECU_BANK_VALIDATION_ERROR,
	},
	{
		key: "account-type",
		label: "ACCOUNT_TYPE",
		placeholder: ECU_PLACEHOLDER_ACCOUNT_TYPE,
		displayLabel: "Account Type",
		validate: (v: string) => v.trim().length > 0,
		validationErrorMessage: ECU_ACCOUNT_TYPE_VALIDATION_ERROR,
	},
	{
		key: "account-number",
		label: "ACCOUNT_NUMBER",
		placeholder: ECU_PLACEHOLDER_ACCOUNT_NUMBER,
		displayLabel: "Account Number",
		validate: validateEcuadorianAccountNumber,
		validationErrorMessage: ECU_ACCOUNT_NUMBER_VALIDATION_ERROR,
	},
	{
		key: "account-name",
		label: "NAME",
		placeholder: ECU_PLACEHOLDER_NAME,
		displayLabel: "Name",
		validate: validateEcuadorianAccountName,
		validationErrorMessage: ECU_NAME_VALIDATION_ERROR,
	},
	{
		key: "cedula",
		label: "CEDULA",
		placeholder: ECU_PLACEHOLDER_CEDULA,
		displayLabel: "Cédula",
		validate: validateEcuadorianCedula,
		validationErrorMessage: ECU_CEDULA_VALIDATION_ERROR,
	},
];

// ── Country option ───────────────────────────────────────────────────────────

/** Country option for Ecuador (ECU — USD-denominated, bank transfer + DeUna QR). */
export const ECU_COUNTRY_OPTION: CountryOption = {
	country: "Ecuador",
	currency: CURRENCY.ECU,
	internationalFormat: "USD",
	symbolNative: "$",
	locale: "es-EC",
	paymentMethod: "TRANSFERENCIA",
	paymentAddressName: "ECU_BANK_DETAILS",
	timezone: "America/Guayaquil",
	timezone_name: "ECT",
	flag: "🇪🇨",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1ea-1f1e8.png",
	phoneCode: "+593",
	telegramSupportChannel: "https://t.me/Ecuador_P2P",
	twitterUsername: "P2Pdotme_Ecu",
	smsCountryCodes: [],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: [],
};
