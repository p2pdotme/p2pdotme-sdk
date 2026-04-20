// ── Main entry point ────────────────────────────────────────────────────

export { createProfile, type Profile } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type { TxLimits } from "../contracts/tx-limits";
export type {
	Balances,
	GetBalancesParams,
	ProfileConfig,
	PublicClientLike,
	TxLimitsParams,
	UsdcAllowanceParams,
	UsdcBalanceParams,
} from "./types";

// ── Errors ──────────────────────────────────────────────────────────────

export { ProfileError, type ProfileErrorCode } from "./errors";
