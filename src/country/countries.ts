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
import { PAYMENT_ID_FIELDS } from "./payment-fields";
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

export function getCountryOption(
	currency: CurrencyCode | null | undefined,
): CountryOption | undefined {
	if (!currency) return undefined;
	return COUNTRY_OPTIONS.find((c) => c.currency === currency);
}

/**
 * Whether the merchant/seller provides payment details by uploading a QR image.
 * Distinct from PAY (`disabledPaymentTypes`), where the buyer scans a QR.
 */
export function uploadsPaymentQR(currency: CurrencyCode | null | undefined): boolean {
	return getCountryOption(currency)?.uploadPaymentQR === true;
}

/**
 * Whether a stored payment ID may include a QR payload (`qr||fields` or
 * standalone QR). Derived from `validateQr` — no extra flag.
 */
export function usesPackedPaymentId(currency: CurrencyCode | null | undefined): boolean {
	return getCountryOption(currency)?.validateQr != null;
}

/**
 * Apps mount the catalog form (PackedPaymentInput): QR upload and/or
 * more than one typed field.
 */
export function usesCatalogPaymentForm(currency: CurrencyCode | null | undefined): boolean {
	if (!currency) return false;
	return uploadsPaymentQR(currency) || (PAYMENT_ID_FIELDS[currency]?.length ?? 0) > 1;
}
