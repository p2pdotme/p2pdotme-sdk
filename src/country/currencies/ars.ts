import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const ARS_PLACEHOLDER = "juan.perez";
export const ARS_VALIDATION_ERROR =
	"Please enter a valid CBU/CVU (22 digits) or Alias (6-20 characters)";

/** Validates CBU (Clave Bancaria Uniforme) — Argentine banking key, 22 digits with checksums. */
function validateCBU(cbu: string): boolean {
	if (cbu.length !== 22) return false;
	if (/^(\d)\1{21}$/.test(cbu)) return false;

	const bankCode = cbu.substring(0, 7);
	const bankCheckDigit = parseInt(cbu[7], 10);
	let sum = 0;
	const weights = [7, 1, 3, 9, 7, 1, 3];
	for (let i = 0; i < 7; i++) {
		sum += parseInt(bankCode[i], 10) * weights[i];
	}
	const calculatedBankCheck = (10 - (sum % 10)) % 10;
	if (bankCheckDigit !== calculatedBankCheck) return false;

	const accountNumber = cbu.substring(8, 21);
	const accountCheckDigit = parseInt(cbu[21], 10);
	sum = 0;
	const accountWeights = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];
	for (let i = 0; i < 13; i++) {
		sum += parseInt(accountNumber[i], 10) * accountWeights[i];
	}
	const calculatedAccountCheck = (10 - (sum % 10)) % 10;
	if (accountCheckDigit !== calculatedAccountCheck) return false;

	return true;
}

/**
 * Validates Argentine payment IDs (CBU, CVU, or Alias).
 * CBU/CVU: 22 digits with checksum. Alias: 6-20 alphanumeric characters.
 */
export function validateArgentinePaymentId(paymentId: string): boolean {
	if (!paymentId || paymentId.trim().length === 0) return false;

	const trimmedPaymentId = paymentId.trim();

	if (/^\d{22}$/.test(trimmedPaymentId)) return validateCBU(trimmedPaymentId);
	if (/^[a-zA-Z0-9.\-_]{6,20}$/.test(trimmedPaymentId)) return true;

	return false;
}

/** Payment ID field configuration for ARS (Argentina, ALIAS). */
export const ARS_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "alias",
		label: "ALIAS_ID",
		placeholder: ARS_PLACEHOLDER,
		displayLabel: "Alias",
		validate: validateArgentinePaymentId,
		validationErrorMessage: ARS_VALIDATION_ERROR,
	},
];

/** Country option for Argentina (ARS). */
export const ARS_COUNTRY_OPTION: CountryOption = {
	country: "Argentina",
	currency: CURRENCY.ARS,
	symbolNative: "$",
	locale: "es-AR",
	paymentMethod: "ALIAS",
	paymentAddressName: "ALIAS_ID",
	timezone: "America/Argentina/Buenos_Aires",
	timezone_name: "ART",
	flag: "🇦🇷",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1e6-1f1f7.png",
	phoneCode: "+54",
	telegramSupportChannel: "https://t.me/p2pmeargentina",
	twitterUsername: "p2pmeargentina",
	smsCountryCodes: ["AR"],
	precision: 2,
	isAlpha: false,
	disabled: false,
	disabledPaymentTypes: [],
};
