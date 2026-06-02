import type { Address, TransactionReceipt, WalletClient } from "viem";
import type { PublicClientLike } from "../types";

export type {
	GetP2pTokenBalanceParams,
	GetStakeBoostConfigParams,
	GetUserStakeParams,
	StakeParams,
	TopUpParams,
} from "./validation";

// ── Client config ───────────────────────────────────────────────────────

export interface StakeConfig {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
	readonly p2pTokenAddress: Address;
}

// ── Domain types ────────────────────────────────────────────────────────

/**
 * Stake lifecycle state for a user.
 *   0 — None: no active stake.
 *   1 — Active: stake is live.
 *   2 — CooldownRequested: unstake requested; awaiting cooldown end.
 *   3 — Seized: stake was forcefully seized.
 */
export type StakeStatus = "none" | "active" | "cooldown" | "seized";

/** Normalized on-chain stake record for a user. */
export interface UserStake {
	/** Currently staked token amount (raw bigint, token decimals). */
	readonly stakedAmount: bigint;
	/** Unix seconds when cooldown ends (0 if not in cooldown). */
	readonly cooldownEnd: bigint;
	/** Lifecycle status decoded from the on-chain enum. */
	readonly status: StakeStatus;
}

/** Raw tuple returned by `getUserStake` before normalization. */
export interface RawUserStake {
	readonly stakedAmount: bigint;
	readonly cooldownEnd: bigint;
	readonly status: number;
}

/**
 * Per-currency boost config — how many tokens map to 1 USD of boost, and the
 * cap on USD-denominated boost a stake can unlock.
 */
export interface StakeBoostConfig {
	readonly tokensPerUsdNumerator: bigint;
	readonly tokensPerUsdDenominator: bigint;
	readonly maxBoostUsd: bigint;
}

/** Global stake boost configuration shared across all users. */
export interface StakeBoostGlobals {
	readonly p2pToken: Address;
	readonly fraudReserve: Address;
	readonly maxStakeTokens: bigint;
	readonly normalCooldown: bigint;
	readonly blacklistCooldown: bigint;
	readonly tokenDecimals: number;
	readonly totalStaked: bigint;
}

/** Raw tuple returned by `getStakeBoostGlobals` before normalization. */
export type RawStakeBoostGlobals = readonly [
	Address,
	Address,
	bigint,
	bigint,
	bigint,
	number,
	bigint,
];

// ── Tx envelope (writes) ────────────────────────────────────────────────

export interface PreparedTx {
	readonly to: `0x${string}`;
	readonly data: `0x${string}`;
	readonly value: bigint;
}

export interface TxResult {
	readonly hash: `0x${string}`;
	readonly receipt?: TransactionReceipt;
}

export interface ExecuteBase {
	readonly walletClient: WalletClient;
	readonly waitForReceipt?: boolean;
}
