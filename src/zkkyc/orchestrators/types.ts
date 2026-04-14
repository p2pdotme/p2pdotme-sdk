import type { ResultAsync } from "neverthrow";
import type { Address } from "viem";
import type { ZkkycError } from "../errors";
import type { SolidityVerifierParameters } from "../validation";

// ── Social Platform ──────────────────────────────────────────────────────────

export type SocialPlatform = "linkedin" | "github" | "x" | "instagram" | "facebook";

/** Maps SocialPlatform to the capitalized name the contract expects for _socialName. */
export const SOCIAL_PLATFORM_NAMES: Record<SocialPlatform, string> = {
	linkedin: "LinkedIn",
	github: "GitHub",
	x: "X",
	instagram: "Instagram",
	facebook: "Facebook",
};

// ── Reclaim (Social Verification) ────────────────────────────────────────────

export interface ReclaimConfig {
	readonly appId: string;
	readonly appSecret: string;
	readonly providerIds: Record<SocialPlatform, string>;
}

export interface ReclaimFlowOptions {
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

export interface ZkPassportConfig {
	/** Domain for ZKPassport initialization (e.g. "app.yourproject.com"). Required — no default is provided to avoid impersonating another app. */
	readonly domain: string;
	/** App name shown in ZKPassport UI. Defaults to "ZKPassport". */
	readonly name?: string;
	/** Logo URL shown in ZKPassport UI. */
	readonly logo?: string;
	/** Purpose text shown in ZKPassport UI. Defaults to "Prove your personhood". */
	readonly purpose?: string;
}

export interface ZkPassportFlowOptions {
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
