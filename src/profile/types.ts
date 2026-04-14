import type { Address } from "viem";
import type { PublicClientLike } from "../types";

export type { PublicClientLike } from "../types";
export type {
	GetBalancesParams,
	PriceConfigParams,
	TxLimitsParams,
	UsdcBalanceParams,
} from "./validation";

// ── Client config ───────────────────────────────────────────────────────

export interface ProfileConfig {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
	readonly usdcAddress: Address;
}

// ── Balance types ───────────────────────────────────────────────────────

export interface Balances {
	/** USDC balance formatted to a number. */
	readonly usdc: number;
	/** Fiat equivalent: usdc * sellPrice. */
	readonly fiat: number;
	/** The sell price used for conversion. */
	readonly sellPrice: number;
}

// ── Price config types ──────────────────────────────────────────────────

export interface PriceConfig {
	readonly buyPrice: bigint;
	readonly sellPrice: bigint;
	readonly buyPriceOffset: bigint;
	readonly baseSpread: bigint;
}
