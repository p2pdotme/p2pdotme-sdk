import { CURRENCY } from "../currency";
import { isPhilippinePayQr, payQrCandidate } from "../qr-validator";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const PHP_PLACEHOLDER_PHONE = "9171234567";
export const PHP_PLACEHOLDER_BANK = "GCash";

export const PHP_VALIDATION_ERROR_PHONE =
	"Please enter a valid Philippine mobile number (e.g., 9171234567)";
export const PHP_BANK_NAME_VALIDATION_ERROR = "Please enter the receiving bank or e-wallet";

/**
 * Validates a Philippine mobile number for InstaPay (GCash / Maya).
 * Mobile numbers are 10 digits starting with 9, and are commonly written
 * locally as `09XXXXXXXXX` or internationally as `+63 9XXXXXXXXX`.
 */
export function validatePhilippinePhoneNumber(phoneNumber: string): boolean {
	if (!phoneNumber || phoneNumber.trim().length === 0) return false;
	if (/[a-zA-Z]/.test(phoneNumber)) return false;

	const cleaned = phoneNumber.trim().replace(/\D/g, "");

	if (/^9\d{9}$/.test(cleaned)) return true;
	if (/^09\d{9}$/.test(cleaned)) return true;
	if (/^639\d{9}$/.test(cleaned)) return true;

	return false;
}

/**
 * Payment ID field configuration for PHP (Philippines, InstaPay).
 *
 * InstaPay is an interbank rail, so the receiving institution has to be named
 * alongside the number — it may be an e-wallet (GCash, Maya), a digital bank
 * (GoTyme) or a local bank. For e-wallets the account number is the mobile
 * number the wallet is registered to.
 */
export const PHP_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "phone",
		label: "PHONE_NUMBER",
		placeholder: PHP_PLACEHOLDER_PHONE,
		displayLabel: "Phone Number",
		validate: validatePhilippinePhoneNumber,
		validationErrorMessage: PHP_VALIDATION_ERROR_PHONE,
	},
	{
		key: "bank-name",
		label: "BANK_NAME",
		placeholder: PHP_PLACEHOLDER_BANK,
		displayLabel: "Bank Name",
		validate: (v: string) => v.trim().length > 0,
		validationErrorMessage: PHP_BANK_NAME_VALIDATION_ERROR,
	},
];

/**
 * Country option for the Philippines (PHP).
 *
 * Payment channel is InstaPay — merchants are free to receive through GCash or
 * Maya, both of which settle over InstaPay. Scan & Pay supports the QR Ph
 * standard only (wallet-proprietary GCash-only / Maya-only QRs are ignored),
 * mirroring how QRIS is handled for Indonesia, so PAY stays enabled.
 */
export const PHP_COUNTRY_OPTION: CountryOption = {
	country: "Philippines",
	currency: CURRENCY.PHP,
	symbolNative: "₱",
	locale: "en-PH",
	paymentMethod: "INSTAPAY",
	paymentAddressName: "PHONE_NUMBER",
	timezone: "Asia/Manila",
	timezone_name: "PST",
	flag: "🇵🇭",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1f5-1f1ed.png",
	phoneCode: "+63",
	telegramSupportChannel: "https://t.me/p2pdotmeph",
	twitterUsername: "p2pdotmeph",
	smsCountryCodes: ["PH"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: [],
	getPayQrPayload: (paymentId) => {
		const candidate = payQrCandidate(paymentId);
		return isPhilippinePayQr(candidate) ? candidate : null;
	},
};
