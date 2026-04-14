import { CURRENCY } from "../../constants";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const INR_PLACEHOLDER = "merchant@upi";
export const INR_VALIDATION_ERROR = "Please enter a valid UPI ID (e.g., username@bankname)";

/**
 * Validates UPI ID format.
 * UPI ID format: username@bankname (e.g., john@paytm, user@ybl, 8658404239@kotak811)
 */
export function validateUPIId(upiId: string): boolean {
	if (!upiId || upiId.trim().length === 0) return false;
	const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;
	return upiRegex.test(upiId.trim());
}

/** Payment ID field configuration for INR (India, UPI). */
export const INR_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "upi",
		label: "UPI_ID",
		placeholder: INR_PLACEHOLDER,
		displayLabel: "UPI ID",
		validate: validateUPIId,
		validationErrorMessage: INR_VALIDATION_ERROR,
	},
];

/** Country option for India (INR). */
export const INR_COUNTRY_OPTION: CountryOption = {
	country: "India",
	currency: CURRENCY.INR,
	symbolNative: "₹",
	locale: "en-IN",
	paymentMethod: "UPI",
	paymentAddressName: "UPI_ID",
	timezone: "Asia/Kolkata",
	timezone_name: "IST",
	flag: "🇮🇳",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1ee-1f1f3.png",
	phoneCode: "+91",
	telegramSupportChannel: "https://t.me/P2Pdotme",
	twitterUsername: "P2Pdotme",
	smsCountryCodes: ["IN"],
	precision: 2,
	isAlpha: false,
	disabled: false,
	disabledPaymentTypes: [],
};
