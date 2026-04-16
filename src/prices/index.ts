// ── Main entry point ────────────────────────────────────────────────────

export { createPrices, type Prices } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type {
	GetPriceConfigParams,
	GetRpPerUsdtLimitParams,
	PriceConfig,
	PricesConfig,
	RpPerUsdtLimit,
} from "./types";

// ── Errors ──────────────────────────────────────────────────────────────

export { PricesError, type PricesErrorCode } from "./errors";
