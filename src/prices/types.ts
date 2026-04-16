import type { Address } from "viem";
import type { PublicClientLike } from "../types";

export type { GetPriceConfigParams, GetRpPerUsdtLimitParams } from "./validation";

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

// ── RP-to-USDC limit ratio ──────────────────────────────────────────────

export interface RpPerUsdtLimit {
	readonly numerator: bigint;
	readonly denominator: bigint;
	/** The USDC multiplier per RP: denominator / numerator. */
	readonly multiplier: number;
}
