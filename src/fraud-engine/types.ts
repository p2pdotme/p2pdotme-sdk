import type { Logger } from "../lib";

// ── Signer abstraction ─────────────────────────────────────────────────

export interface FraudEngineSigner {
	/**
	 * The subject address tracked by the fraud engine — the wallet that places
	 * on-chain orders and appears in reports, watchlist, and risk scoring.
	 *
	 * - For thirdweb smart wallets (ERC-4337 / account abstraction) this is the
	 *   smart account address.
	 * - For plain EOA wallets this is the same address that produces signatures.
	 */
	readonly address: string;
	/**
	 * The address of the key that actually produces the EIP-191 signature.
	 * Defaults to {@link address} when omitted.
	 *
	 * Set this only when the tracked subject is a smart wallet whose admin EOA
	 * is the real signer (smart wallet contracts cannot sign EIP-191 directly).
	 * In that case, {@link address} is the smart wallet and `signerAddress` is
	 * the admin EOA.
	 */
	readonly signerAddress?: string;
	signMessage(message: string): Promise<string>;
}

// ── Config ─────────────────────────────────────────────────────────────

export interface FraudEngineConfig {
	readonly apiUrl: string;
	readonly encryptionKey: string;
	readonly seonRegion?: string;
	readonly logger?: Logger;
}

// ── Activity types ─────────────────────────────────────────────────────

export type ActivityType = "buy_order" | "fingerprint";

// ── Device details ─────────────────────────────────────────────────────

export interface DeviceDetails {
	readonly userAgent: string;
	readonly platform: string;
	readonly language: string;
	readonly languages: string[];
	readonly screenWidth: number;
	readonly screenHeight: number;
	readonly devicePixelRatio: number;
	readonly timezone: string;
	readonly timezoneOffset: number;
	readonly cookiesEnabled: boolean;
	readonly doNotTrack: string | null;
	readonly online: boolean;
	readonly connectionType?: string;
	readonly deviceMemory?: number;
	readonly hardwareConcurrency?: number;
	readonly touchSupport: boolean;
	readonly maxTouchPoints: number;
	readonly vendor: string;
	readonly appVersion: string;
	readonly colorDepth: number;
	readonly pixelDepth: number;
	readonly ip?: string;
	readonly seonSession?: string;
}

// ── Buy order details ──────────────────────────────────────────────────

export interface BuyOrderDetails {
	readonly cryptoAmount: number;
	readonly fiatAmount: number;
	readonly currency: string;
	readonly recipientAddress: string;
	readonly fee: number;
	readonly amountAfterFee: number;
	readonly paymentMethod?: string;
	readonly estimatedProcessingTime?: string;
}

// ── User details ───────────────────────────────────────────────────────

export interface UserDetails {
	readonly currency?: string;
	readonly country?: string;
	readonly language?: string;
	readonly loginMethod?: "email" | "google" | "phone" | "passkey" | "unknown";
	readonly loginEmail?: string;
	readonly loginPhone?: string;
}

// ── API responses ──────────────────────────────────────────────────────

export interface FraudCheckApiResponse {
	readonly success: boolean;
	readonly approved: boolean;
	readonly activity_log_id: number;
	readonly message: string;
}

export interface FraudCheckResult {
	readonly approved: boolean;
	readonly activityLogId: number;
	readonly message: string;
	/**
	 * Link an on-chain order ID to this activity log record.
	 * Call after the buy order is placed on-chain (fire-and-forget).
	 * The signer and activityLogId are captured internally — just pass the orderId.
	 */
	linkOrder(
		orderId: string,
	): import("neverthrow").ResultAsync<LinkOrderResult, import("./errors").FraudEngineError>;
}

export interface LinkOrderResult {
	readonly success: boolean;
	readonly message: string;
}

export interface FingerprintLogResult {
	readonly success: boolean;
	readonly message: string;
}

// ── Process buy order result ───────────────────────────────────────────

export type ProcessBuyOrderResult =
	| { readonly status: "placed"; readonly orderId: string }
	| { readonly status: "rejected"; readonly message: string };

// ── FraudEngine instance ───────────────────────────────────────────────

export interface FraudEngine {
	init(): Promise<void>;

	/**
	 * Low-level: run fraud check only. Returns result with `linkOrder()` for manual linking.
	 * For most consumers, prefer `processBuyOrder()` which handles the full flow.
	 */
	checkBuyOrder(params: {
		signer: FraudEngineSigner;
		orderDetails: BuyOrderDetails;
		userDetails?: UserDetails;
		orderSource?: string;
	}): import("neverthrow").ResultAsync<FraudCheckResult, import("./errors").FraudEngineError>;

	/**
	 * Full orchestration: fraud check → place order → auto-link.
	 *
	 * - Runs fraud check on all buy orders (backend handles currency-specific logic).
	 *   If rejected, returns `{ status: "rejected" }` without calling `placeOrder`.
	 *   If approved, calls `placeOrder`, auto-links activity log, returns `{ status: "placed", orderId }`.
	 * - Fail-open: if fraud check API errors, still calls `placeOrder` (no linking since no activityLogId).
	 * - Linking is fire-and-forget: if link fails, order is already placed — error is logged, not propagated.
	 */
	processBuyOrder(params: {
		signer: FraudEngineSigner;
		orderDetails: BuyOrderDetails;
		userDetails?: UserDetails;
		orderSource?: string;
		placeOrder: () => Promise<string>;
	}): import("neverthrow").ResultAsync<ProcessBuyOrderResult, import("./errors").FraudEngineError>;

	logFingerprint(params: {
		signer: FraudEngineSigner;
	}): import("neverthrow").ResultAsync<
		FingerprintLogResult | null,
		import("./errors").FraudEngineError
	>;

	getFingerprint(): Promise<{ visitorId: string; confidence: number } | null>;

	getDeviceDetails(): Promise<DeviceDetails>;

	cleanupSeonStorage(): void;
}
