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

/**
 * Single-object params for `createReclaimFlow`. Merges the app-level config
 * (appId, appSecret, providerIds) with the per-call options (platform,
 * walletAddress, callbacks, …) into one argument.
 */
export interface ReclaimFlowParams {
	// ── App-level config ──────────────────────────────────────────────
	readonly appId: string;
	readonly appSecret: string;
	readonly providerIds: Record<SocialPlatform, string>;

	// ── Per-call options ──────────────────────────────────────────────
	readonly platform: SocialPlatform;
	readonly walletAddress: Address;
	/** Base URL for redirect after Reclaim flow. SDK appends ?sessionId={id}&socialPlatform={Name}. */
	readonly redirectUrl?: string;
	/** Resume polling for an existing session (redirect-back case). */
	readonly sessionId?: string;
	/** Description added to Reclaim context. */
	readonly contextDescription?: string;
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
