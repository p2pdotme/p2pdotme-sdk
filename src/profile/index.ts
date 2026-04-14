// ── Main entry point ────────────────────────────────────────────────────

export { createProfile, type Profile } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type { RpPerUsdtLimit, TxLimits } from "../contracts/tx-limits";
export type {
	Balances,
	GetBalancesParams,
	PriceConfig,
	PriceConfigParams,
	ProfileConfig,
	PublicClientLike,
	TxLimitsParams,
	UsdcBalanceParams,
} from "./types";

// ── Errors ──────────────────────────────────────────────────────────────

export { ProfileError, type ProfileErrorCode } from "./errors";
