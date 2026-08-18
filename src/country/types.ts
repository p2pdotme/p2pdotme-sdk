import type { CurrencyCode } from "../types";

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
	 * Merchant/seller provides payment details by uploading a QR image
	 * (e.g. Yape/Plin). Distinct from PAY, where the buyer scans a QR.
	 */
	readonly uploadPaymentQR: boolean;
	/**
	 * Stored payment ID may pack an optional QR payload with typed fields as
	 * `qr||field|field`. VEN always; PEN when the seller uploads a Yape/Plin QR.
	 */
	readonly packedPaymentId?: boolean;
	/** Structural check for a standalone QR payload (no `||` pack). */
	readonly validateQr?: (payload: string) => boolean;
}
