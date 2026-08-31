import type { ResultAsync } from "neverthrow";
import type { Address } from "viem";
import type { ZkkycError } from "../errors";
import type { SolidityVerifierParameters } from "../validation";

// ── Social Platform ──────────────────────────────────────────────────────────

export type SocialPlatform = "linkedin" | "github" | "x" | "instagram" | "facebook" | "binance";

/** Maps SocialPlatform to the capitalized name the contract expects for _socialName. */
export const SOCIAL_PLATFORM_NAMES: Record<SocialPlatform, string> = {
	linkedin: "LinkedIn",
	github: "GitHub",
	x: "X",
	instagram: "Instagram",
	facebook: "Facebook",
	binance: "Binance",
};

// ── Reclaim (Social Verification) ────────────────────────────────────────────

/** Locales the session service can render the Reclaim context message in. */
export type ReclaimLocale = "en" | "es" | "hi" | "id" | "pt";

/** Tenants the session service knows, one per consuming app. */
export type ReclaimTenant = "p2p" | "coinsme";

/**
 * Single-object params for `createReclaimFlow`. Merges the app-level config
 * (sessionEndpoint, tenant) with the per-call options (platform, walletAddress,
 * callbacks, …) into one argument.
 */
export interface ReclaimFlowParams {
	// ── App-level config ──────────────────────────────────────────────
	/**
	 * Base URL of the reclaim-session-service, which holds the Reclaim app
	 * secret and mints proof-request configs (e.g. https://reclaim.p2p.me).
	 *
	 * The secret must never reach the browser: it is a private key whose address
	 * is the appId, and bundlers inline build-time env vars into shipped JS.
	 */
	readonly sessionEndpoint: string;
	/** Selects the app's branding/copy on the session service. */
	readonly tenant: ReclaimTenant;

	// ── Per-call options ──────────────────────────────────────────────
	readonly platform: SocialPlatform;
	readonly walletAddress: Address;
	/** Base URL for redirect after Reclaim flow. Service appends ?sessionId={id}&socialPlatform={Name}. */
	readonly redirectUrl?: string;
	/** Resume polling for an existing session (redirect-back case). */
	readonly sessionId?: string;
	/**
	 * Locale for the message shown inside the Reclaim Verifier app. The wording
	 * itself is owned by the service — that string renders under our app
	 * identity, so callers choose a language, not the words.
	 */
	readonly locale?: ReclaimLocale;
	/** Called with status updates during the flow. */
	readonly onStatus?: (status: ReclaimStatus) => void;
	/** AbortSignal to cancel polling. */
	readonly signal?: AbortSignal;
	/** Polling interval in ms. Defaults to 5000. */
	readonly pollingIntervalMs?: number;
}

export type ReclaimStatus =
	| { type: "session_created"; sessionId: string; requestUrl: string }
	| { type: "polling_started"; sessionId: string }
	| { type: "proof_received" }
	| { type: "proof_transformed" };

export interface ReclaimProofResult {
	readonly _socialName: string;
	readonly proofs: readonly {
		claimInfo: { provider: string; parameters: string; context: string };
		signedClaim: {
			claim: { identifier: string; owner: string; timestampS: number; epoch: number };
			signatures: string[];
		};
	}[];
	readonly sessionId: string;
}

export interface ReclaimSession {
	/** The Reclaim session id (empty until known when resuming). */
	readonly sessionId: string;
	/** URL to display as a QR code or open as a deep link. Empty when resuming an existing session. */
	readonly requestUrl: string;
	/** Triggers the in-app Reclaim flow (browser only) and polls until the proof is ready. Call on user action (e.g. button click). */
	readonly start: () => ResultAsync<ReclaimProofResult, ZkkycError>;
	/** Aborts an in-flight polling loop started by `start`. */
	readonly abort: () => void;
}

// ── ZK Passport ──────────────────────────────────────────────────────────────

/**
 * Single-object params for `createZkPassportFlow`. Merges app-level config
 * (domain, name, logo, purpose) with per-call options (walletAddress, onStatus).
 */
export interface ZkPassportFlowParams {
	// ── App-level config ──────────────────────────────────────────────
	/** Domain for ZKPassport initialization (e.g. "app.yourproject.com"). Required — no default is provided to avoid impersonating another app. */
	readonly domain: string;
	/** App name shown in ZKPassport UI. Defaults to "ZKPassport". */
	readonly name?: string;
	/** Logo URL shown in ZKPassport UI. */
	readonly logo?: string;
	/** Purpose text shown in ZKPassport UI. Defaults to "Prove your personhood". */
	readonly purpose?: string;

	// ── Per-call options ──────────────────────────────────────────────
	readonly walletAddress: Address;
	/** Called with status updates during the flow. */
	readonly onStatus?: (status: ZkPassportStatus) => void;
}

export type ZkPassportStatus =
	| { type: "request_created"; url: string }
	| { type: "request_received" }
	| { type: "generating_proof" }
	| { type: "proof_generated" }
	| { type: "result_received" }
	| { type: "rejected" };

export interface ZkPassportProofResult {
	readonly params: SolidityVerifierParameters;
	readonly isIDCard: boolean;
}

export interface ZkPassportSession {
	/** URL to display as QR code or open as deeplink. */
	readonly url: string;
	/** Resolves when the full flow completes (proof verified). */
	readonly result: ResultAsync<ZkPassportProofResult, ZkkycError>;
	/** Aborts the flow. The result promise will reject with ZK_PASSPORT_ABORTED. */
	readonly abort: () => void;
}

// ── simple-kyc (hosted passport + liveness wizard) ────────────────────────────

/**
 * Params for `createSimpleKycFlow`. The app opens the hosted simple-kyc wizard,
 * which runs onboard → passport → liveness → face match/dedup and, on approval,
 * redirects back to `redirectUrl` with `?code=<code>&state=<state>`. The app
 * then calls `resumeSimpleKycFlow` to redeem the code for the EIP-712 attestation.
 */
export interface SimpleKycFlowParams {
	/**
	 * Base URL exposing the browser-facing `/v1/widget/public-sessions` and
	 * `/v1/widget/attestation` endpoints — the `kyc-proxy` in a client-only setup
	 * (e.g. http://localhost:8787). The proxy holds the X-API-Key and forwards to
	 * simple-kyc's key-gated endpoints.
	 */
	readonly baseUrl: string;
	/** The user's EVM wallet — bound into the attestation and credited on-chain. */
	readonly walletAddress: Address;
	/** Tenant slug (one per consuming contract), e.g. "p2p-reputation". */
	readonly tenant: string;
	/** Return URL — pass `${window.location.origin}<route>` so each app self-routes. */
	readonly redirectUrl: string;
	/**
	 * ISO-2 country code (e.g. "IN"). Required — the embedded wizard skips the
	 * country step, so the app must prebind it. Must be one of simple-kyc's
	 * supported markets (IN, NG, BR, MX, CO, AR, VE, ID).
	 */
	readonly country: string;
	/** Opaque state round-tripped back to the app (CSRF/nonce + page to restore). */
	readonly state?: string;
	/** Status callback. */
	readonly onStatus?: (status: SimpleKycStatus) => void;
}

export type SimpleKycStatus =
	| { type: "session_created"; widgetUrl: string }
	| { type: "redirecting"; widgetUrl: string };

export interface SimpleKycSession {
	/** The hosted wizard URL to navigate to. */
	readonly widgetUrl: string;
	/** Convenience: navigate the browser to the wizard (no-op outside the browser). */
	readonly redirect: () => void;
}

/** The on-chain-ready attestation, shaped for `prepareSubmitKycAttestation`. */
export interface SimpleKycAttestation {
	readonly nullifier: `0x${string}`;
	readonly limit: bigint;
	readonly expiry: bigint;
	readonly signature: `0x${string}`;
	/** The opaque unique-human handle (no PII), for app-side bookkeeping. */
	readonly identityHash?: string;
}

// ── liveness (hosted face-only wizard, no document) ───────────────────────────

/**
 * Params for `createLivenessFlow`. The app opens the hosted liveness wizard,
 * which runs onboard → active liveness challenge → face embed → 1:N dedup and,
 * on approval, redirects back to `redirectUrl` with `?code=<code>&state=<state>`.
 * The app then calls `resumeLivenessFlow` to redeem the code for the EIP-712
 * attestation.
 *
 * Identical to `SimpleKycFlowParams` minus `country`: liveness reads no
 * document, so there is no issuing market to prebind.
 */
export interface LivenessFlowParams {
	/**
	 * Base URL exposing the browser-facing `/v1/widget/public-sessions` and
	 * `/v1/widget/attestation` endpoints — the liveness proxy in a client-only
	 * setup (e.g. https://liveness-proxy.p2p.cool). The proxy holds the
	 * X-API-Key and forwards to the liveness service's key-gated endpoints.
	 * This is **not** the same host as the passport (`simple-kyc`) proxy.
	 */
	readonly baseUrl: string;
	/** The user's EVM wallet — bound into the attestation and credited on-chain. */
	readonly walletAddress: Address;
	/** Tenant slug (one per consuming contract), e.g. "p2p-reputation-liveness". */
	readonly tenant: string;
	/** Return URL — pass `${window.location.origin}<route>` so each app self-routes. */
	readonly redirectUrl: string;
	/** Opaque state round-tripped back to the app (CSRF/nonce + page to restore). */
	readonly state?: string;
	/** Status callback. */
	readonly onStatus?: (status: LivenessStatus) => void;
}

export type LivenessStatus =
	| { type: "session_created"; widgetUrl: string }
	| { type: "redirecting"; widgetUrl: string };

export interface LivenessSession {
	/** The hosted wizard URL to navigate to. */
	readonly widgetUrl: string;
	/** Convenience: navigate the browser to the wizard (no-op outside the browser). */
	readonly redirect: () => void;
}

/** The on-chain-ready attestation, shaped for `prepareSubmitLivenessAttestation`. */
export interface LivenessAttestation {
	readonly nullifier: `0x${string}`;
	readonly limit: bigint;
	readonly expiry: bigint;
	readonly signature: `0x${string}`;
	/** The opaque unique-human handle (no PII), for app-side bookkeeping. */
	readonly identityHash?: string;
}

// ── BVN (Nigerian Bank Verification Number) ──────────────────────────────────

/** OTP delivery channels the BVN backend exposes. `alternate_phone` needs a number. */
export type BvnOtpMethod = "email" | "phone" | "phone_1" | "alternate_phone";

/** BVN identity scope requested during onboard. */
export type BvnScope = "identity" | "bank_accounts";

/**
 * Shared config for every BVN step. `baseUrl` points at the backend proxy — the
 * only party holding the Mono secret + the EIP-712 attestor key — using the
 * `{ ok, data }` envelope.
 */
export interface BvnFlowConfig {
	/** Backend proxy base URL (e.g. https://ngn-bvn-verify-production.up.railway.app). */
	readonly baseUrl: string;
	/** Tenant slug registered on the backend, mapping to one on-chain contract. */
	readonly tenant: string;
}

/** An active BVN backend session. Carry this between steps. */
export interface BvnSession {
	readonly sessionId: number;
	readonly sessionToken: string;
}

/** An available OTP delivery method returned after submitting the BVN. */
export interface BvnMethod {
	readonly method: string;
	readonly hint?: string;
}

/** The confirm-OTP decision. `reject` may carry a reason (e.g. "bvn_reused"). */
export interface BvnDecision {
	readonly decision: "approve" | "reject";
	readonly reason?: string;
}

/** The on-chain-ready attestation, shaped for `prepareSubmitBvnAttestation`. */
export interface BvnAttestation {
	readonly nullifier: `0x${string}`;
	readonly limit: bigint;
	readonly expiry: bigint;
	readonly signature: `0x${string}`;
	/** The wallet the attestation is bound to. */
	readonly wallet?: string;
}

/** Params for `bvnOnboard`. */
export interface BvnOnboardParams {
	/** The user's EVM wallet — bound into the attestation and credited on-chain. */
	readonly walletAddress: Address;
	/** Identity scope. Defaults to "identity". */
	readonly scope?: BvnScope;
}

/** Params for `bvnSendOtp`. */
export interface BvnSendOtpParams {
	readonly method: BvnOtpMethod;
	/** Required only when `method` is "alternate_phone". */
	readonly phoneNumber?: string;
}

/** The full BVN flow bound to a config — mirrors the `Zkkyc` client shape. */
export interface BvnFlow {
	/** Step 1 — start a session bound to the wallet + tenant. */
	onboard(params: BvnOnboardParams): ResultAsync<BvnSession, ZkkycError>;
	/** Step 2 — submit the 11-digit BVN, get available OTP methods. */
	submitBvn(session: BvnSession, bvn: string): ResultAsync<BvnMethod[], ZkkycError>;
	/** Step 3 — request an OTP over the chosen channel. */
	sendOtp(session: BvnSession, params: BvnSendOtpParams): ResultAsync<boolean, ZkkycError>;
	/** Step 4 — confirm the OTP; returns approve/reject (never any PII). */
	confirmOtp(session: BvnSession, otp: string): ResultAsync<BvnDecision, ZkkycError>;
	/** Step 5 — mint the signed EIP-712 attestation for an approved session. */
	getAttestation(session: BvnSession): ResultAsync<BvnAttestation, ZkkycError>;
	/** Optional — the address the tenant contract must trust as its signer. */
	getAttestor(): ResultAsync<{ address: string }, ZkkycError>;
}
