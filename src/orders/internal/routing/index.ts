// ── Main entry point ────────────────────────────────────────────────────

export { createOrderRouter, type OrderRouter } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type { OrderRoutingConfig, SelectCircleParams } from "./types";

// ── Errors ──────────────────────────────────────────────────────────────

export { OrderRoutingError, type OrderRoutingErrorCode } from "./errors";
