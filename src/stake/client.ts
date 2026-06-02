import type { ResultAsync } from "neverthrow";
import { getUserStake } from "../contracts/p2p-stake";
import { type ClaimUnstakeAction, createClaimUnstakeAction } from "./actions/claim-unstake";
import {
	createRequestUnstakeAction,
	type RequestUnstakeAction,
} from "./actions/request-unstake";
import { createStakeAction, type StakeAction } from "./actions/stake";
import { createTopUpAction, type TopUpAction } from "./actions/top-up";
import type { StakeError } from "./errors";
import { normalizeUserStake } from "./normalize";
import type { StakeConfig, UserStake } from "./types";
import type { GetUserStakeParams } from "./validation";

export interface StakeClient {
	// ── Reads ───────────────────────────────────────────────────────────

	/** Reads the on-chain stake record for a user (stakedAmount, cooldownEnd, status). */
	getUserStake(params: GetUserStakeParams): ResultAsync<UserStake, StakeError>;

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
	const { publicClient, diamondAddress } = config;

	return {
		getUserStake: (params) =>
			getUserStake(publicClient, diamondAddress, params).map(normalizeUserStake),

		stake: createStakeAction({ publicClient, diamondAddress }),
		topUp: createTopUpAction({ publicClient, diamondAddress }),
		requestUnstake: createRequestUnstakeAction({ publicClient, diamondAddress }),
		claimUnstake: createClaimUnstakeAction({ publicClient, diamondAddress }),
	};
}
