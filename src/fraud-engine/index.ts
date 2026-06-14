// ── Main entry point ────────────────────────────────────────────────────

export { createFraudEngine } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type {
	ActivityType,
	BuyOrderDetails,
	DeviceDetails,
	FingerprintLogResult,
	FraudCheckApiResponse,
	FraudCheckResult,
	FraudEngine,
	FraudEngineConfig,
	FraudEngineSigner,
	LinkOrderResult,
	ProcessBuyOrderResult,
	UserDetails,
} from "./types";

// ── Logger ──────────────────────────────────────────────────────────────

export { type Logger, noopLogger } from "../lib";

// ── Errors ──────────────────────────────────────────────────────────────

export { FraudEngineError, type FraudEngineErrorCode } from "./errors";

// ── Low-level exports (for advanced use) ────────────────────────────────

export { fetchIpAddress, getBasicDeviceDetails, getDeviceDetails } from "./device";
export { getOrCreateDeviceHash } from "./device-hash";
export { encryptPayload } from "./encryption";
export { getFingerprint, loadFingerprintAgent } from "./fingerprint";
export { cleanupSeonStorage, getSeonSession, initSeon } from "./seon";
export { getSignedHeaders } from "./signing";
