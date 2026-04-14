import { CURRENCY } from "../../constants";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const NGN_PLACEHOLDER = "0123456789";
export const NGN_PLACEHOLDER_BANK = "Bank Name";
export const NGN_VALIDATION_ERROR = "Please enter a valid 10-digit account number";

/**
 * Validates Nigerian bank account number (NUBAN format, 10 digits).
 */
export function validateNigerianAccountNumber(accountNumber: string): boolean {
	if (!accountNumber || accountNumber.trim().length === 0) return false;
	const cleaned = accountNumber.trim().replace(/\D/g, "");
	return /^\d{10}$/.test(cleaned);
}

/** Payment ID field configuration for NGN (Nigeria, NIP). */
export const NGN_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "account",
		label: "ACCOUNT_NUMBER",
		placeholder: NGN_PLACEHOLDER,
		displayLabel: "Account Number",
		validate: validateNigerianAccountNumber,
		validationErrorMessage: NGN_VALIDATION_ERROR,
	},
	{
		key: "bank-name",
		label: "BANK_NAME",
		placeholder: NGN_PLACEHOLDER_BANK,
		displayLabel: "Bank Name",
		validate: (v: string) => v.trim().length > 0,
		validationErrorMessage: NGN_VALIDATION_ERROR,
	},
];

/** Country option for Nigeria (NGN). */
export const NGN_COUNTRY_OPTION: CountryOption = {
	country: "Nigeria",
	currency: CURRENCY.NGN,
	symbolNative: "₦",
	locale: "en-NG",
	paymentMethod: "NIP",
	paymentAddressName: "ACCOUNT_NUMBER",
	timezone: "Africa/Lagos",
	timezone_name: "WAT",
	flag: "🇳🇬",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1f3-1f1ec.png",
	phoneCode: "+234",
	telegramSupportChannel: "https://t.me/p2pmeNigeria",
	twitterUsername: "p2pmeNigeria",
	smsCountryCodes: ["NG"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: ["PAY"],
};
