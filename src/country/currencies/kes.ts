import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const KES_PHONE_PLACEHOLDER = "0712345678";
export const KES_TILL_PLACEHOLDER = "123456";
export const KES_PAYBILL_PLACEHOLDER = "542542";
export const KES_PAYBILL_ACCOUNT_PLACEHOLDER = "00403881496150";
export const KES_PHONE_VALIDATION_ERROR = "Please enter a valid M-Pesa phone number";
export const KES_TILL_VALIDATION_ERROR = "Please enter a valid M-Pesa till number";
export const KES_PAYBILL_VALIDATION_ERROR = "Please enter a valid M-Pesa paybill number";
export const KES_PAYBILL_ACCOUNT_VALIDATION_ERROR = "Please enter a valid paybill account number";

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

/**
 * Validates a Kenyan M-Pesa Pay Bill business number (5–7 digits).
 */
export function validateKenyanPaybill(paybill: string): boolean {
	if (!paybill || paybill.trim().length === 0) return false;

	const cleaned = paybill.trim().replace(/\s/g, "");

	return /^\d{5,7}$/.test(cleaned);
}

/**
 * Validates a Kenyan M-Pesa Pay Bill account number: 1–20 letters/digits
 * (bank paybills use the bank account number, e.g. `00403881496150`).
 */
export function validateKenyanPaybillAccount(account: string): boolean {
	if (!account || account.trim().length === 0) return false;

	const cleaned = account.trim().replace(/\s/g, "");

	return /^[A-Za-z0-9]{1,20}$/.test(cleaned);
}

/**
 * Payment ID field configuration for KES (Kenya, M-Pesa). Fill a phone number,
 * till number, or paybill number + account number (stored `phone|till|paybill|account`).
 */
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
	{
		key: "paybill",
		label: "PAYBILL_NUMBER",
		placeholder: KES_PAYBILL_PLACEHOLDER,
		displayLabel: "Paybill Number",
		validate: validateKenyanPaybill,
		validationErrorMessage: KES_PAYBILL_VALIDATION_ERROR,
		optional: true,
		requires: ["paybillAccount"],
	},
	{
		key: "paybillAccount",
		label: "PAYBILL_ACCOUNT_NUMBER",
		placeholder: KES_PAYBILL_ACCOUNT_PLACEHOLDER,
		displayLabel: "Account Number",
		validate: validateKenyanPaybillAccount,
		validationErrorMessage: KES_PAYBILL_ACCOUNT_VALIDATION_ERROR,
		optional: true,
		requires: ["paybill"],
	},
];

/** Country option for Kenya (KES). M-Pesa phone, till, or paybill + account; no PAY flow. */
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
