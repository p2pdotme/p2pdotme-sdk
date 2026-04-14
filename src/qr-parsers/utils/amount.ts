/**
 * Parse a fiat amount string and convert to usdc using sellPrice.
 * Returns null if the amount is not parseable or <= 0.
 */
export function parseAmount(
	amountStr: string,
	sellPrice: number,
): { usdc: number; fiat: number } | null {
	if (!amountStr || amountStr.trim() === "") return null;

	const fiat = parseFloat(amountStr.trim());
	if (Number.isNaN(fiat) || fiat <= 0) return null;

	return { usdc: fiat / sellPrice, fiat };
}
