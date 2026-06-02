// ── Main entry point ────────────────────────────────────────────────────

export { createStake, type StakeClient } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type {
	ExecuteBase,
	GetP2pTokenBalanceParams,
	GetStakeBoostConfigParams,
	GetUserStakeParams,
	PreparedTx,
	RawStakeBoostGlobals,
	RawUserStake,
	StakeBoostConfig,
	StakeBoostGlobals,
	StakeConfig,
	StakeParams,
	StakeStatus,
	TopUpParams,
	TxResult,
	UserStake,
} from "./types";

// ── Errors ──────────────────────────────────────────────────────────────

export { StakeError, type StakeErrorCode } from "./errors";
