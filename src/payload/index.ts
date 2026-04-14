// ── Main entry point ────────────────────────────────────────────────────

export { createPayloadGenerator, type PayloadGenerator } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type { PayloadGeneratorConfig, PlaceOrderPayload, SetSellOrderUpiPayload } from "./types";
export type { PlaceOrderParams, SetSellOrderUpiParams } from "./validation";

// ── Errors ──────────────────────────────────────────────────────────────

export { PayloadError, type PayloadErrorCode } from "./errors";

// ── Crypto & Relay ──────────────────────────────────────────────────────

export { decryptPaymentAddress, encryptPaymentAddress } from "./crypto";
export { cipherParse, cipherStringify } from "./ecies";
export { createRelayIdentity, getRelayIdentity, type RelayIdentity } from "./relay-identity";
