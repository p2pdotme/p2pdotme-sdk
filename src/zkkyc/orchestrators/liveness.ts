import { ResultAsync } from "neverthrow";
import { ZkkycError } from "../errors";
import type { LivenessAttestation, LivenessFlowParams, LivenessSession } from "./types";

/**
 * Starts the hosted liveness wizard flow. Creates a browser-initiable widget
 * session (no API key in the browser — `baseUrl` points at the liveness proxy,
 * which injects the key and whose tenant allowlist validates the redirect_uri),
 * then returns the wizard URL to navigate to.
 *
 * The wizard runs onboard → active liveness challenge → face embed → 1:N dedup
 * and, on approval, redirects back to `redirectUrl` with `?code=<code>&state=<state>`.
 * Call `resumeLivenessFlow({ baseUrl, code })` on return to fetch the attestation.
 *
 * Deliberately separate from `createSimpleKycFlow`: the liveness verifier is a
 * different service with its own database, its own attestor key and its own
 * EIP-712 domain (`LivenessVerifier`, vs the passport wizard's `KycVerifier`).
 * Pointing one flow at the other's base URL yields a signature the contract
 * rejects. The one API-shape difference is that liveness takes **no `country`** —
 * it reads no document, so there is no issuing market to prebind.
 */
export function createLivenessFlow(
	params: LivenessFlowParams,
): ResultAsync<LivenessSession, ZkkycError> {
	const { baseUrl, walletAddress, tenant, redirectUrl, state, onStatus } = params;
	return ResultAsync.fromPromise(
		(async () => {
			const res = await fetch(`${baseUrl}/v1/widget/public-sessions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					wallet_pubkey: walletAddress,
					redirect_uri: redirectUrl,
					tenant,
					state,
				}),
			});
			if (!res.ok) {
				const body = await res.text();
				throw new ZkkycError(`liveness session creation failed: ${res.status} ${body}`, {
					code: "LIVENESS_SESSION_FAILED",
					context: { status: res.status },
				});
			}
			const data = (await res.json()) as { widget_url: string };
			const widgetUrl = data.widget_url;
			onStatus?.({ type: "session_created", widgetUrl });
			return {
				widgetUrl,
				redirect: () => {
					if (typeof window !== "undefined") {
						onStatus?.({ type: "redirecting", widgetUrl });
						window.location.href = widgetUrl;
					}
				},
			} satisfies LivenessSession;
		})(),
		(error) => {
			if (error instanceof ZkkycError) return error;
			return new ZkkycError("liveness flow failed to start", {
				code: "LIVENESS_SESSION_FAILED",
				cause: error,
			});
		},
	);
}

/**
 * Redeems the one-time `code` from the wizard's redirect for the EIP-712
 * attestation. The result feeds straight into `zkkyc.prepareSubmitLivenessAttestation`.
 * The endpoint returns only the (non-PII, self-verifying) attestation.
 */
export function resumeLivenessFlow(args: {
	baseUrl: string;
	code: string;
}): ResultAsync<LivenessAttestation, ZkkycError> {
	return ResultAsync.fromPromise(
		(async () => {
			const res = await fetch(`${args.baseUrl}/v1/widget/attestation`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code: args.code }),
			});
			if (!res.ok) {
				const body = await res.text();
				throw new ZkkycError(`liveness attestation redemption failed: ${res.status} ${body}`, {
					code: "LIVENESS_REDEEM_FAILED",
					context: { status: res.status },
				});
			}
			const d = (await res.json()) as {
				nullifier: string;
				limit: string | number;
				expiry: string | number;
				signature: string;
				identity_hash?: string;
			};
			return {
				nullifier: d.nullifier as `0x${string}`,
				limit: BigInt(d.limit),
				expiry: BigInt(d.expiry),
				signature: d.signature as `0x${string}`,
				identityHash: d.identity_hash,
			} satisfies LivenessAttestation;
		})(),
		(error) => {
			if (error instanceof ZkkycError) return error;
			return new ZkkycError("liveness attestation redemption failed", {
				code: "LIVENESS_REDEEM_FAILED",
				cause: error,
			});
		},
	);
}
