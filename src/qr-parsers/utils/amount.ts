/** Plain decimal, EMVCo-style: digits with an optional single fractional part. */
const DECIMAL_AMOUNT = /^\d+(\.\d+)?$/;

/**
 * Parse a fiat amount string and convert to usdc using sellPrice.
 * Returns null unless the whole string is a finite, positive decimal amount and
 * sellPrice is a finite positive number. Rejects trailing garbage ("12abc"),
 * exponent/Infinity/NaN forms that parseFloat would otherwise accept, and a
 * zero/negative sellPrice that would produce an Infinite or negative usdc value.
 */
export function parseAmount(
	amountStr: string,
	sellPrice: number,
): { usdc: number; fiat: number } | null {
	if (!amountStr) return null;
	const trimmed = amountStr.trim();
	if (!DECIMAL_AMOUNT.test(trimmed)) return null;

	const fiat = Number(trimmed);
	if (!Number.isFinite(fiat) || fiat <= 0) return null;
	if (!Number.isFinite(sellPrice) || sellPrice <= 0) return null;

	return { usdc: fiat / sellPrice, fiat };
}
