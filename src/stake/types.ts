import type { Address, TransactionReceipt, WalletClient } from "viem";
import type { PublicClientLike } from "../types";

export type { GetUserStakeParams, StakeParams, TopUpParams } from "./validation";

// ── Client config ───────────────────────────────────────────────────────

export interface StakeConfig {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
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
