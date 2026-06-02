// ── Main entry point ────────────────────────────────────────────────────

export { createStake, type StakeClient } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type {
	ExecuteBase,
	GetUserStakeParams,
	PreparedTx,
	RawUserStake,
	StakeConfig,
	StakeParams,
	StakeStatus,
	TopUpParams,
	TxResult,
	UserStake,
} from "./types";

// ── Errors ──────────────────────────────────────────────────────────────

export { StakeError, type StakeErrorCode } from "./errors";
