import type { ResultAsync } from "neverthrow";
import {
	getP2pTokenBalance,
	getStakeBoostConfig,
	getStakeBoostGlobals,
	getUserStake,
} from "../contracts/p2p-stake";
import { type ClaimUnstakeAction, createClaimUnstakeAction } from "./actions/claim-unstake";
import {
	createRequestUnstakeAction,
	type RequestUnstakeAction,
} from "./actions/request-unstake";
import { createStakeAction, type StakeAction } from "./actions/stake";
import { createTopUpAction, type TopUpAction } from "./actions/top-up";
import type { StakeError } from "./errors";
import { normalizeStakeBoostGlobals, normalizeUserStake } from "./normalize";
import type { StakeBoostConfig, StakeBoostGlobals, StakeConfig, UserStake } from "./types";
import type {
	GetP2pTokenBalanceParams,
	GetStakeBoostConfigParams,
	GetUserStakeParams,
} from "./validation";

export interface StakeClient {
	// ── Reads ───────────────────────────────────────────────────────────

	/** Reads the on-chain stake record for a user (stakedAmount, cooldownEnd, status). */
	getUserStake(params: GetUserStakeParams): ResultAsync<UserStake, StakeError>;

	/** Reads the per-currency stake boost config (tokens-per-USD, max boost). */
	getStakeBoostConfig(
		params: GetStakeBoostConfigParams,
	): ResultAsync<StakeBoostConfig, StakeError>;

	/** Reads global stake boost configuration (token addr, cooldowns, totals). */
	getStakeBoostGlobals(): ResultAsync<StakeBoostGlobals, StakeError>;

	/** Reads the P2P token (ERC20) balance for a given address (raw bigint). */
	getP2pTokenBalance(params: GetP2pTokenBalanceParams): ResultAsync<bigint, StakeError>;

	// ── Writes (layered prepare/execute) ────────────────────────────────

	readonly stake: StakeAction;
	readonly topUp: TopUpAction;
	readonly requestUnstake: RequestUnstakeAction;
	readonly claimUnstake: ClaimUnstakeAction;
}

/**
 * Creates the P2P token stake client — exposes a read for the user's stake and
 * prepare/execute write pairs for stake, topUp, requestUnstake, and claimUnstake.
 */
export function createStake(config: StakeConfig): StakeClient {
	const { publicClient, diamondAddress, p2pTokenAddress } = config;

	return {
		getUserStake: (params) =>
			getUserStake(publicClient, diamondAddress, params).map(normalizeUserStake),

		getStakeBoostConfig: (params) => getStakeBoostConfig(publicClient, diamondAddress, params),

		getStakeBoostGlobals: () =>
			getStakeBoostGlobals(publicClient, diamondAddress).map(normalizeStakeBoostGlobals),

		getP2pTokenBalance: (params) => getP2pTokenBalance(publicClient, p2pTokenAddress, params),

		stake: createStakeAction({ publicClient, diamondAddress }),
		topUp: createTopUpAction({ publicClient, diamondAddress }),
		requestUnstake: createRequestUnstakeAction({ publicClient, diamondAddress }),
		claimUnstake: createClaimUnstakeAction({ publicClient, diamondAddress }),
	};
}
