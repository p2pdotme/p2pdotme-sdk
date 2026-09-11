import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const IDR_PLACEHOLDER = "8123456789";
export const IDR_VALIDATION_ERROR =
	"Please enter a valid Indonesian phone number (e.g., 8123456789)";
export const IDR_BANK_ACCOUNT_PLACEHOLDER = "1234567890";
export const IDR_BANK_ACCOUNT_VALIDATION_ERROR =
	"Please enter a valid Indonesian bank account number (8-18 digits)";

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

/**
 * Validates Indonesian bank account number.
 * Digits only (spaces/dashes tolerated), 8-18 digits to cover BCA (10), Mandiri (13),
 * BRI (15), BNI (10), CIMB Niaga (13-14), Permata (16), SeaBank (10-12), Bank Jago (10).
 */
export function validateIndonesianBankAccount(accountNumber: string): boolean {
	if (!accountNumber || accountNumber.trim().length === 0) return false;
	if (/[a-zA-Z]/.test(accountNumber)) return false;
	const cleaned = accountNumber.replace(/[\s-]/g, "");
	return /^\d{8,18}$/.test(cleaned);
}

export type IndonesianPaymentProviderType = "bank" | "e-wallet";

export interface IndonesianPaymentProviderOption {
	/** Display name for the consumer-rendered provider list. */
	readonly name: string;
	readonly type: IndonesianPaymentProviderType;
}

/** E-wallets and banks a seller can be paid through in Indonesia. */
export const IDR_PAYMENT_PROVIDERS = [
	{ name: "GoPay", type: "e-wallet" },
	{ name: "DANA", type: "e-wallet" },
	{ name: "ShopeePay", type: "e-wallet" },
	{ name: "OVO", type: "e-wallet" },
	{ name: "LinkAja", type: "e-wallet" },
	{ name: "iSaku", type: "e-wallet" },
	{ name: "Sakuku", type: "e-wallet" },
	{ name: "AstraPay", type: "e-wallet" },
	{ name: "Bank Jago", type: "bank" },
	{ name: "BCA", type: "bank" },
	{ name: "Mandiri", type: "bank" },
	{ name: "BRI", type: "bank" },
	{ name: "BNI", type: "bank" },
	{ name: "CIMB Niaga", type: "bank" },
	{ name: "Permata Bank", type: "bank" },
	{ name: "SeaBank", type: "bank" },
] as const satisfies readonly IndonesianPaymentProviderOption[];

/**
 * Resolves whether a provider name is a bank or an e-wallet (case-insensitive).
 * Returns `null` when the name is not in `IDR_PAYMENT_PROVIDERS`.
 */
export function getIndonesianPaymentProviderType(
	name: string,
): IndonesianPaymentProviderType | null {
	const normalized = name.trim().toLowerCase();
	if (!normalized) return null;
	const match = IDR_PAYMENT_PROVIDERS.find((option) => option.name.toLowerCase() === normalized);
	return match?.type ?? null;
}

export interface IndonesianPaymentIdParts {
	readonly provider: string;
	readonly type: IndonesianPaymentProviderType;
	/** Bank account number or e-wallet phone number. */
	readonly value: string;
}

/**
 * Parses a stored Indonesian payment ID packed as `Provider|number`.
 * Returns `null` when the value is not packed or the provider is unknown.
 */
export function parseIndonesianPaymentId(paymentId: string): IndonesianPaymentIdParts | null {
	const sepIndex = paymentId.indexOf("|");
	if (sepIndex < 0) return null;
	const provider = paymentId.slice(0, sepIndex).trim();
	const value = paymentId.slice(sepIndex + 1).trim();
	const type = getIndonesianPaymentProviderType(provider);
	if (!type || !value) return null;
	return { provider, type, value };
}

export interface IndonesianPaymentIdDisplayPart {
	readonly key: string;
	/** Raw English label (mirrors `PaymentIdFieldConfig.displayLabel`). */
	readonly label: string;
	/** i18n key (mirrors `PaymentIdFieldConfig.label`). */
	readonly labelKey: string;
	readonly value: string;
}

export interface IndonesianStoredPaymentIdDisplay {
	/** i18n key for the number label (bank → ACCOUNT_NUMBER, e-wallet → PHONE_NUMBER). */
	readonly paymentAddressName: string;
	/** Row parts: payment method, then the number. */
	readonly parts: readonly IndonesianPaymentIdDisplayPart[];
	/** Single-line preview, e.g. `OVO · 8123456789`. */
	readonly display: string;
	/** Bare number for copy actions. */
	readonly copyValue: string;
}

/**
 * Display details for a stored IDR payment ID packed as `Provider|number`.
 * Returns `null` for other currencies and unpacked values, so callers fall back
 * to the generic catalog formatting.
 */
export function resolveIndonesianStoredPaymentIdDisplay(
	currency: string,
	paymentId: string,
): IndonesianStoredPaymentIdDisplay | null {
	if (currency !== CURRENCY.IDR) return null;
	const parsed = parseIndonesianPaymentId(paymentId);
	if (!parsed) return null;

	const isBank = parsed.type === "bank";
	const paymentAddressName = isBank ? "ACCOUNT_NUMBER" : "PHONE_NUMBER";
	return {
		paymentAddressName,
		parts: [
			{ key: "provider", label: "Payment Method", labelKey: "PAYMENT_METHOD", value: parsed.provider },
			{
				key: "account",
				label: isBank ? "Account Number" : "Phone Number",
				labelKey: paymentAddressName,
				value: parsed.value,
			},
		],
		display: `${parsed.provider} · ${parsed.value}`,
		copyValue: parsed.value,
	};
}

/**
 * Validates a payment ID for the given Indonesian provider:
 * bank providers require a bank account number, e-wallets require a phone number.
 * Unknown providers fall back to phone number validation.
 */
export function validateIndonesianPaymentId(providerName: string, value: string): boolean {
	return getIndonesianPaymentProviderType(providerName) === "bank"
		? validateIndonesianBankAccount(value)
		: validateIndonesianPhoneNumber(value);
}

/**
 * Validates a stored Indonesian payment ID packed as `Provider|number`
 * against the provider type. Anything else is invalid.
 */
export function validateIndonesianStoredPaymentId(paymentId: string): boolean {
	const parsed = parseIndonesianPaymentId(paymentId);
	if (!parsed) return false;
	return validateIndonesianPaymentId(parsed.provider, parsed.value);
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
