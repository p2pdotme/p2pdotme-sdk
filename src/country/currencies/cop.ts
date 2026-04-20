import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const COP_PLACEHOLDER = "juan.perez@nequi.com.co";
export const COP_VALIDATION_ERROR =
	"Please enter a valid Nequi or Daviplata ID (e.g., 3001234567 or email)";

/**
 * Validates Colombian payment ID for Nequi or Daviplata.
 * Accepts a 10-digit phone number starting with 3, or a valid email address.
 */
export function validateColombianPaymentId(paymentId: string): boolean {
	if (!paymentId || paymentId.trim().length === 0) return false;
	const trimmed = paymentId.trim();
	if (/^3\d{9}$/.test(trimmed)) return true;
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
	return false;
}

/** Payment ID field configuration for COP (Colombia, Transferencia). */
export const COP_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "alias",
		label: "ALIAS_TRANSFERENCIA",
		placeholder: COP_PLACEHOLDER,
		displayLabel: "Nequi / Daviplata",
		validate: validateColombianPaymentId,
		validationErrorMessage: COP_VALIDATION_ERROR,
	},
];

/** Country option for Colombia (COP). */
export const COP_COUNTRY_OPTION: CountryOption = {
	country: "Colombia",
	currency: CURRENCY.COP,
	symbolNative: "$",
	locale: "es-CO",
	paymentMethod: "TRANSFERENCIA",
	paymentAddressName: "ALIAS_TRANSFERENCIA",
	timezone: "America/Bogota",
	timezone_name: "COT",
	flag: "🇨🇴",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1e8-1f1f4.png",
	phoneCode: "+57",
	telegramSupportChannel: "https://t.me/p2pmeColombia",
	twitterUsername: "p2pmeColombia",
	smsCountryCodes: ["CO"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: ["PAY"],
};
