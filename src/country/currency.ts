/**
 * All supported currency symbols. Single source of truth for the SDK.
 *
 * Lives alongside the country metadata so that adding a currency is a
 * single-folder operation: drop a new file in `currencies/<code>.ts`, add it
 * to this map, and both `COUNTRY_OPTIONS` and `ZodCurrencySchema` pick it up.
 */
export const CURRENCY = {
	IDR: "IDR",
	INR: "INR",
	BRL: "BRL",
	ARS: "ARS",
	MEX: "MEX",
	VEN: "VEN",
	EUR: "EUR",
	NGN: "NGN",
	USD: "USD",
	COP: "COP",
} as const;

/** Union of supported currency codes. */
export type CurrencyCode = (typeof CURRENCY)[keyof typeof CURRENCY];

/**
 * Tuple form of the currency codes — used by `z.enum(...)` in the shared
 * validation layer. Narrow tuple type required by Zod.
 */
export const CURRENCY_CODES = Object.values(CURRENCY) as [CurrencyCode, ...CurrencyCode[]];
