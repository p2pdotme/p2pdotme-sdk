import { CURRENCY } from "../currency";
import { isBolivianPayQr, payQrCandidate, validateBolivianQr } from "../qr-validator";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export { validateBolivianQr };

export const BOB_PLACEHOLDER = "Bank account number (8–20 digits)";
export const BOB_VALIDATION_ERROR = "Please enter a valid Bolivian bank account number";

/**
 * Validates a Bolivian bank account number for QR Simple transfers.
 * Accepts 8–20 digits; spaces and dashes are ignored.
 */
export function validateBolivianAccount(account: string): boolean {
	if (!account || account.trim().length === 0) return false;
	const cleaned = account.trim().replace(/[\s-]/g, "");
	return /^\d{8,20}$/.test(cleaned);
}

/** Payment ID field configuration for BOB (Bolivia, QR Simple). */
export const BOB_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "account",
		label: "ACCOUNT_NUMBER",
		placeholder: BOB_PLACEHOLDER,
		displayLabel: "Cuenta",
		validate: validateBolivianAccount,
		validationErrorMessage: BOB_VALIDATION_ERROR,
	},
];

/** Country option for Bolivia (BOB). */
export const BOB_COUNTRY_OPTION: CountryOption = {
	country: "Bolivia",
	currency: CURRENCY.BOB,
	internationalFormat: "BOB",
	symbolNative: "Bs.",
	locale: "es-BO",
	paymentMethod: "QR_SIMPLE",
	paymentAddressName: "QR_SIMPLE_DETAILS",
	timezone: "America/La_Paz",
	timezone_name: "BOT",
	flag: "🇧🇴",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1e7-1f1f4.png",
	phoneCode: "+591",
	telegramSupportChannel: "https://t.me/p2pme_bolivia_merchants",
	twitterUsername: "p2pmebolivia",
	smsCountryCodes: ["BO"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: [],
	uploadPaymentQR: true,
	validateQr: validateBolivianQr,
	getPayQrPayload: (paymentId) => {
		const candidate = payQrCandidate(paymentId);
		return isBolivianPayQr(candidate) ? candidate : null;
	},
};
