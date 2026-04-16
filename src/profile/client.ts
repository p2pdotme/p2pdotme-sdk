import type { ResultAsync } from "neverthrow";
import { getTxLimits, getUsdcAllowance, getUsdcBalance } from "../contracts";
import type { TxLimits } from "../contracts/tx-limits";
import { getBalances } from "./contracts";
import type { ProfileError } from "./errors";
import type {
	Balances,
	GetBalancesParams,
	ProfileConfig,
	TxLimitsParams,
	UsdcAllowanceParams,
	UsdcBalanceParams,
} from "./types";

export interface Profile {
	/** Reads the USDC balance for a given address (raw bigint, 6 decimals). */
	getUsdcBalance(params: UsdcBalanceParams): ResultAsync<bigint, ProfileError>;

	/** Reads the USDC allowance `owner → diamond` (raw bigint, 6 decimals). */
	getUsdcAllowance(params: UsdcAllowanceParams): ResultAsync<bigint, ProfileError>;

	/** Fetches USDC and fiat balance in parallel for a given address and currency. */
	getBalances(params: GetBalancesParams): ResultAsync<Balances, ProfileError>;

	/** Reads buy and sell transaction limits for a given address and currency. */
	getTxLimits(params: TxLimitsParams): ResultAsync<TxLimits, ProfileError>;
}

/** Creates a Profile SDK instance for reading user-scoped balance and limit data. */
export function createProfile(config: ProfileConfig): Profile {
	const { publicClient, diamondAddress, usdcAddress } = config;

	return {
		getUsdcBalance: (params) => getUsdcBalance(publicClient, usdcAddress, params),

		getUsdcAllowance: (params) =>
			getUsdcAllowance(publicClient, usdcAddress, diamondAddress, params),

		getBalances: (params) => getBalances(publicClient, usdcAddress, diamondAddress, params),

		getTxLimits: (params) => getTxLimits(publicClient, diamondAddress, params),
	};
}
