import type { Address } from "viem";
import type { PublicClientLike } from "../types";

export type { CurrencyScopedParams } from "./validation";

// ── Client config ───────────────────────────────────────────────────────

export interface PricesConfig {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

// ── Price config ────────────────────────────────────────────────────────

export interface PriceConfig {
	readonly buyPrice: bigint;
	readonly sellPrice: bigint;
	readonly buyPriceOffset: bigint;
	readonly baseSpread: bigint;
}

// ── Reputation-per-USDC limit ───────────────────────────────────────────

/**
 * Per-currency USDC transaction limit granted per Reputation Point (RP).
 * Default is 1 RP = 2 USDC everywhere except India (INR), which has its own
 * multiplier set on-chain.
 *
 *   multiplier = denominator / numerator   // USDC per RP
 */
export interface ReputationLimit {
	readonly numerator: bigint;
	readonly denominator: bigint;
	/** USDC per Reputation Point, computed from the rational form. */
	readonly multiplier: number;
}
