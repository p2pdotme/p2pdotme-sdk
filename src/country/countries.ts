import {
	ARS_COUNTRY_OPTION,
	BRL_COUNTRY_OPTION,
	COP_COUNTRY_OPTION,
	CUP_COUNTRY_OPTION,
	ECU_COUNTRY_OPTION,
	EUR_COUNTRY_OPTION,
	IDR_COUNTRY_OPTION,
	INR_COUNTRY_OPTION,
	MEX_COUNTRY_OPTION,
	NGN_COUNTRY_OPTION,
	PEN_COUNTRY_OPTION,
	PHP_COUNTRY_OPTION,
	USD_COUNTRY_OPTION,
	VEN_COUNTRY_OPTION,
} from "./currencies";
import type { CurrencyCode } from "./currency";
import type { CountryOption } from "./types";

/** All supported countries with their currency metadata, payment methods, and display config. */
export const COUNTRY_OPTIONS: readonly CountryOption[] = [
	INR_COUNTRY_OPTION,
	IDR_COUNTRY_OPTION,
	BRL_COUNTRY_OPTION,
	ARS_COUNTRY_OPTION,
	MEX_COUNTRY_OPTION,
	VEN_COUNTRY_OPTION,
	NGN_COUNTRY_OPTION,
	COP_COUNTRY_OPTION,
	CUP_COUNTRY_OPTION,
	ECU_COUNTRY_OPTION,
	PEN_COUNTRY_OPTION,
	PHP_COUNTRY_OPTION,
	EUR_COUNTRY_OPTION,
	USD_COUNTRY_OPTION,
];

/**
 * Whether the merchant/seller provides payment details by uploading a QR image.
 * Distinct from PAY (`disabledPaymentTypes`), where the buyer scans a QR.
 */
export function uploadsPaymentQR(currency: CurrencyCode | null | undefined): boolean {
	if (!currency) return false;
	return COUNTRY_OPTIONS.some((c) => c.currency === currency && c.uploadPaymentQR);
}

/**
 * Whether the currency stores an optional QR packed with typed fields
 * (`qr||field|field`) and uses the packed payment-ID form.
 */
export function usesPackedPaymentId(currency: CurrencyCode | null | undefined): boolean {
	if (!currency) return false;
	return COUNTRY_OPTIONS.some((c) => c.currency === currency && c.packedPaymentId);
}
