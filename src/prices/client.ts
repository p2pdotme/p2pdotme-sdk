import type { ResultAsync } from "neverthrow";
import { getPriceConfig, getReputationPerUsdcLimit } from "../contracts";
import type { PricesError } from "./errors";
import type { CurrencyScopedParams, PriceConfig, PricesConfig, ReputationLimit } from "./types";

export interface Prices {
	/** Reads buy/sell price config for a given currency (raw bigint, 6 decimals). */
	getPriceConfig(params: CurrencyScopedParams): ResultAsync<PriceConfig, PricesError>;

	/**
	 * Reads the per-currency USDC transaction limit granted per Reputation Point
	 * (RP). Default is 1 RP = 2 USDC everywhere except INR, which uses its own
	 * on-chain multiplier.
	 */
	getReputationPerUsdcLimit(
		params: CurrencyScopedParams,
	): ResultAsync<ReputationLimit, PricesError>;
}

/**
 * Creates a Prices SDK instance for reading per-currency protocol config:
 * buy/sell prices and the Reputation Points → USDC limit ratio. All reads
 * are currency-scoped — no user context needed.
 */
export function createPrices(config: PricesConfig): Prices {
	const { publicClient, diamondAddress } = config;

	return {
		getPriceConfig: (params) => getPriceConfig(publicClient, diamondAddress, params),
		getReputationPerUsdcLimit: (params) =>
			getReputationPerUsdcLimit(publicClient, diamondAddress, params),
	};
}
