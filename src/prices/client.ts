import type { ResultAsync } from "neverthrow";
import { getPriceConfig, getRpPerUsdtLimitRational } from "../contracts";
import type { PricesError } from "./errors";
import type {
	GetPriceConfigParams,
	GetRpPerUsdtLimitParams,
	PriceConfig,
	PricesConfig,
	RpPerUsdtLimit,
} from "./types";

export interface Prices {
	/** Reads buy/sell price config for a given currency (raw bigint, 6 decimals). */
	getPriceConfig(params: GetPriceConfigParams): ResultAsync<PriceConfig, PricesError>;

	/** Reads the RP-to-USDC limit ratio for a given currency. */
	getRpPerUsdtLimitRational(
		params: GetRpPerUsdtLimitParams,
	): ResultAsync<RpPerUsdtLimit, PricesError>;
}

/**
 * Creates a Prices SDK instance for reading per-currency protocol config:
 * buy/sell prices and RP-to-USDC limit ratios. All reads are currency-scoped
 * — no user context needed.
 */
export function createPrices(config: PricesConfig): Prices {
	const { publicClient, diamondAddress } = config;

	return {
		getPriceConfig: (params) => getPriceConfig(publicClient, diamondAddress, params),
		getRpPerUsdtLimitRational: (params) =>
			getRpPerUsdtLimitRational(publicClient, diamondAddress, params),
	};
}
