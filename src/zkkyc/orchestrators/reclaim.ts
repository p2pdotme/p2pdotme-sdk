import { ResultAsync } from "neverthrow";
import { ZkkycError } from "../errors";
import type { ReclaimFlowParams, ReclaimProofResult, ReclaimSession } from "./types";
import { SOCIAL_PLATFORM_NAMES } from "./types";

const RECLAIM_SESSION_API = "https://api.reclaimprotocol.org/api/sdk/session";

/** Shape returned by reclaim-session-service's POST /v1/reclaim/sessions. */
interface SessionServiceResponse {
	/** `ReclaimProofRequest.toJsonString()` — carries the signature, never the app secret. */
	config: string;
	sessionId: string;
}

/**
 * Initializes a Reclaim social verification flow and returns a session. The
 * proof request is minted by reclaim-session-service (which holds the app
 * secret) and rebuilt here with `fromJsonString`, so the secret never reaches
 * the browser. That network call runs eagerly, so call this on page load; the
 * returned session's `start()` triggers the in-app flow and polls for the proof,
 * so call that on user action.
 */
export function createReclaimFlow(
	params: ReclaimFlowParams,
): ResultAsync<ReclaimSession, ZkkycError> {
	return ResultAsync.fromPromise(
		(async () => {
			// biome-ignore lint/suspicious/noExplicitAny: optional peer dependency
			const mod: any = await import("@reclaimprotocol/js-sdk").catch(() => {
				throw new ZkkycError(
					"Missing peer dependency: @reclaimprotocol/js-sdk. Install it with: npm install @reclaimprotocol/js-sdk",
					{ code: "PEER_DEPENDENCY_MISSING" },
				);
			});
			const { ReclaimProofRequest, transformForOnchain } = mod;

			const {
				sessionEndpoint,
				tenant,
				platform,
				walletAddress,
				redirectUrl,
				sessionId: existingSessionId,
				locale,
				onStatus,
				signal,
				pollingIntervalMs = 5000,
			} = params;

			const socialName = SOCIAL_PLATFORM_NAMES[platform];

			// biome-ignore lint/suspicious/noExplicitAny: optional peer dependency
			let reclaimProofRequest: any = null;
			let sessionId: string;
			let requestUrl = "";

			if (existingSessionId) {
				// Resuming after the redirect back: the proof already exists on
				// Reclaim's side, so we only need to poll. No session to mint.
				sessionId = existingSessionId;
			} else {
				if (!redirectUrl) {
					throw new ZkkycError("redirectUrl is required to start a Reclaim session", {
						code: "VALIDATION_ERROR",
					});
				}

				// The service maps platform -> providerId, renders the context
				// message, and signs the request with the app secret. It also
				// validates redirectUrl against its own host allowlist.
				const response = await fetch(`${sessionEndpoint.replace(/\/$/, "")}/v1/reclaim/sessions`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ tenant, platform, walletAddress, redirectUrl, locale }),
					signal,
				});

				if (!response.ok) {
					const body = await response.text().catch(() => "");
					throw new ZkkycError(`Reclaim session creation failed: ${response.status} ${body}`, {
						code: "RECLAIM_SESSION_ENDPOINT_FAILED",
						context: { status: response.status, platform },
					});
				}

				const data = (await response.json()) as SessionServiceResponse;
				if (!data?.config || !data?.sessionId) {
					throw new ZkkycError("Reclaim session service returned an incomplete response", {
						code: "RECLAIM_SESSION_ENDPOINT_FAILED",
						context: { platform },
					});
				}

				reclaimProofRequest = await ReclaimProofRequest.fromJsonString(data.config);
				sessionId = data.sessionId;

				requestUrl = await reclaimProofRequest.getRequestUrl();

				onStatus?.({ type: "session_created", sessionId, requestUrl });
			}

			let aborted = false;

			const pollForProof = async (): Promise<ReclaimProofResult> => {
				if (reclaimProofRequest && typeof window !== "undefined") {
					reclaimProofRequest.triggerReclaimFlow({ verificationMode: "app" });
				}

				onStatus?.({ type: "polling_started", sessionId });

				while (true) {
					if (aborted || signal?.aborted) {
						throw new ZkkycError("Reclaim polling aborted", {
							code: "RECLAIM_POLLING_ABORTED",
						});
					}

					const response = await fetch(`${RECLAIM_SESSION_API}/${sessionId}`);
					const data = await response.json();

					if (data?.session?.proofs?.length > 0) {
						const proofs = data.session.proofs;
						onStatus?.({ type: "proof_received" });

						if (platform === "github" && proofs.length > 0) {
							const first = proofs[0] as { publicData?: Record<string, unknown> };
							if (first?.publicData && Object.keys(first.publicData).length === 0) {
								throw new ZkkycError("GitHub verification eligibility criteria not met", {
									code: "RECLAIM_PROOF_INVALID",
								});
							}
						}

						const transformedProofs = proofs.map((proof: unknown) => transformForOnchain(proof));

						onStatus?.({ type: "proof_transformed" });

						return {
							_socialName: socialName,
							proofs: transformedProofs,
							sessionId,
						} as ReclaimProofResult;
					}

					if (data?.message?.includes("Session not found")) {
						throw new ZkkycError("Reclaim session not found", {
							code: "RECLAIM_SESSION_NOT_FOUND",
							context: { sessionId },
						});
					}

					if (data?.session?.statusV2 === "PROOF_GENERATION_FAILED") {
						throw new ZkkycError("Reclaim proof generation failed", {
							code: "RECLAIM_PROOF_GENERATION_FAILED",
							context: { sessionId },
						});
					}

					await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
				}
			};

			const session: ReclaimSession = {
				sessionId,
				requestUrl,
				start: () =>
					ResultAsync.fromPromise(pollForProof(), (error) => {
						if (error instanceof ZkkycError) return error;
						return new ZkkycError("Reclaim verification flow failed", {
							code: "RECLAIM_INIT_FAILED",
							cause: error,
						});
					}),
				abort: () => {
					aborted = true;
				},
			};

			return session;
		})(),
		(error) => {
			if (error instanceof ZkkycError) return error;
			return new ZkkycError("Reclaim verification flow failed", {
				code: "RECLAIM_INIT_FAILED",
				cause: error,
			});
		},
	);
}
