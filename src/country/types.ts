import type { CurrencyCode } from "../types";

/** Joins an optional QR payload with typed fields (`qr||phone|cci`). */
export const PACKED_PAYMENT_ID_SEP = "||";

export interface PaymentIdFieldConfig {
	readonly key: string;
	readonly label: string;
	readonly placeholder: string;
	readonly displayLabel: string | null;
	readonly validate: (value: string) => boolean;
	readonly validationErrorMessage: string;
	/**
	 * When true, an empty value is allowed. If every field is optional, at least
	 * one field must still be filled (see `validatePaymentIdFields`).
	 */
	readonly optional?: boolean;
}

export interface CountryOption {
	readonly country: string;
	readonly currency: CurrencyCode;
	readonly internationalFormat?: string;
	readonly symbolNative: string;
	readonly locale: string;
	readonly paymentMethod: string;
	readonly paymentAddressName: string;
	readonly timezone: string;
	readonly timezone_name: string;
	readonly flag: string;
	readonly phoneCode?: string;
	readonly flagUrl: string;
	readonly telegramSupportChannel: string;
	readonly twitterUsername: string;
	readonly smsCountryCodes: readonly string[];
	readonly precision: number;
	readonly isAlpha: boolean;
	readonly disabled: boolean;
	readonly disabledPaymentTypes: readonly string[];
	/**
	 * Merchant/seller provides payment details by uploading a QR image.
	 * Distinct from PAY, where the buyer scans a QR. Default: false.
	 */
	readonly uploadPaymentQR?: boolean;
	/** Structural check for a standalone QR payload (no `||` pack). */
	readonly validateQr?: (payload: string) => boolean;
	/**
	 * Fill catalog fields from a validated QR (e.g. Yape/Plin phone in EMVCo).
	 * Only used when the typed fallback did not already set the key.
	 */
	readonly hydrateFieldsFromQr?: (qr: string) => Partial<Record<string, string>>;
}
