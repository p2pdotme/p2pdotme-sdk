import type { ResultAsync } from "neverthrow";
import {
	getPriceConfig,
	getRpPerUsdtLimitRational,
	getTxLimits,
	getUsdcBalance,
} from "../contracts";
import type { RpPerUsdtLimit, TxLimits } from "../contracts/tx-limits";
import { getBalances } from "./contracts";
import type { ProfileError } from "./errors";
import type {
	Balances,
	GetBalancesParams,
	PriceConfig,
	PriceConfigParams,
	ProfileConfig,
	TxLimitsParams,
	UsdcBalanceParams,
} from "./types";

export interface Profile {
	/** Reads the USDC balance for a given address (raw bigint, 6 decimals). */
	getUsdcBalance(params: UsdcBalanceParams): ResultAsync<bigint, ProfileError>;

	/** Reads buy/sell price config for a given currency (raw bigint, 6 decimals). */
	getPriceConfig(params: PriceConfigParams): ResultAsync<PriceConfig, ProfileError>;

	/** Fetches USDC and fiat balance in parallel for a given address and currency. */
	getBalances(params: GetBalancesParams): ResultAsync<Balances, ProfileError>;

	/** Reads buy and sell transaction limits for a given address and currency. */
	getTxLimits(params: TxLimitsParams): ResultAsync<TxLimits, ProfileError>;

	/** Reads the RP-to-USDC limit ratio for a given currency. */
	getRpPerUsdtLimitRational(params: PriceConfigParams): ResultAsync<RpPerUsdtLimit, ProfileError>;
}

/** Creates a Profile SDK instance for reading account balance and price data. */
export function createProfile(config: ProfileConfig): Profile {
	const { publicClient, diamondAddress, usdcAddress } = config;

	return {
		getUsdcBalance: (params: UsdcBalanceParams) =>
			getUsdcBalance(publicClient, usdcAddress, params),

		getPriceConfig: (params: PriceConfigParams) =>
			getPriceConfig(publicClient, diamondAddress, params),

		getBalances: (params: GetBalancesParams) =>
			getBalances(publicClient, usdcAddress, diamondAddress, params),

		getTxLimits: (params: TxLimitsParams) => getTxLimits(publicClient, diamondAddress, params),

		getRpPerUsdtLimitRational: (params: PriceConfigParams) =>
			getRpPerUsdtLimitRational(publicClient, diamondAddress, params),
	};
}
