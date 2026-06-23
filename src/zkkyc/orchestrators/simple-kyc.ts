import { ResultAsync } from "neverthrow";
import { ZkkycError } from "../errors";
import type { SimpleKycAttestation, SimpleKycFlowParams, SimpleKycSession } from "./types";

/**
 * Starts the hosted simple-kyc wizard flow. Creates a browser-initiable widget
 * session (no API key in the browser — `baseUrl` points at the kyc-proxy, which
 * injects the key and whose tenant allowlist validates the redirect_uri), then
 * returns the wizard URL to navigate to.
 *
 * The wizard runs passport → liveness → face match/dedup and, on approval,
 * redirects back to `redirectUrl` with `?code=<code>&state=<state>`. Call
 * `resumeSimpleKycFlow({ baseUrl, code })` on return to fetch the attestation.
 */
export function createSimpleKycFlow(
	params: SimpleKycFlowParams,
): ResultAsync<SimpleKycSession, ZkkycError> {
	const { baseUrl, walletAddress, tenant, redirectUrl, country, state, onStatus } = params;
	return ResultAsync.fromPromise(
		(async () => {
			const res = await fetch(`${baseUrl}/v1/widget/public-sessions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					wallet_pubkey: walletAddress,
					redirect_uri: redirectUrl,
					tenant,
					country,
					state,
				}),
			});
			if (!res.ok) {
				const body = await res.text();
				throw new ZkkycError(`simple-kyc session creation failed: ${res.status} ${body}`, {
					code: "SIMPLE_KYC_SESSION_FAILED",
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
			} satisfies SimpleKycSession;
		})(),
		(error) => {
			if (error instanceof ZkkycError) return error;
			return new ZkkycError("simple-kyc flow failed to start", {
				code: "SIMPLE_KYC_SESSION_FAILED",
				cause: error,
			});
		},
	);
}

/**
 * Redeems the one-time `kyc_code` from the wizard's redirect for the EIP-712
 * attestation. The result feeds straight into `zkkyc.prepareSubmitKycAttestation`.
 * The endpoint returns only the (non-PII, self-verifying) attestation.
 */
export function resumeSimpleKycFlow(args: {
	baseUrl: string;
	code: string;
}): ResultAsync<SimpleKycAttestation, ZkkycError> {
	return ResultAsync.fromPromise(
		(async () => {
			const res = await fetch(`${args.baseUrl}/v1/widget/attestation`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code: args.code }),
			});
			if (!res.ok) {
				const body = await res.text();
				throw new ZkkycError(`simple-kyc attestation redemption failed: ${res.status} ${body}`, {
					code: "SIMPLE_KYC_REDEEM_FAILED",
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
			} satisfies SimpleKycAttestation;
		})(),
		(error) => {
			if (error instanceof ZkkycError) return error;
			return new ZkkycError("simple-kyc attestation redemption failed", {
				code: "SIMPLE_KYC_REDEEM_FAILED",
				cause: error,
			});
		},
	);
}
