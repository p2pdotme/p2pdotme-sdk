import { ResultAsync } from "neverthrow";
import { ZkkycError } from "../errors";
import type { ReclaimFlowParams, ReclaimProofResult, ReclaimSession } from "./types";
import { SOCIAL_PLATFORM_NAMES } from "./types";

const RECLAIM_SESSION_API = "https://api.reclaimprotocol.org/api/sdk/session";

/**
 * Initializes a Reclaim social verification flow and returns a session. `init()`
 * runs eagerly here, so call this on page load; the returned session's `start()`
 * triggers the in-app flow and polls for the proof, so call that on user action.
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
				appId,
				appSecret,
				providerIds,
				platform,
				walletAddress,
				redirectUrl,
				sessionId: existingSessionId,
				contextDescription,
				onStatus,
				signal,
				pollingIntervalMs = 5000,
			} = params;

			const socialName = SOCIAL_PLATFORM_NAMES[platform];
			const providerId = providerIds[platform];

			// biome-ignore lint/suspicious/noExplicitAny: optional peer dependency
			let reclaimProofRequest: any = null;
			let sessionId: string;
			let requestUrl = "";

			if (existingSessionId) {
				sessionId = existingSessionId;
			} else {
				reclaimProofRequest = await ReclaimProofRequest.init(appId, appSecret, providerId, {
					launchOptions: {
						canUseDeferredDeepLinksFlow: true,
						verificationMode: "app",
					},
					useAppClip: true,
					log: true,
				});

				const statusUrl = reclaimProofRequest.getStatusUrl();
				sessionId = statusUrl.split("/").pop() || "";

				if (redirectUrl) {
					const separator = redirectUrl.includes("?") ? "&" : "?";
					reclaimProofRequest.setRedirectUrl(
						`${redirectUrl}${separator}sessionId=${sessionId}&socialPlatform=${socialName}`,
					);
				}

				reclaimProofRequest.addContext(
					walletAddress,
					contextDescription ?? `Social verification for ${socialName}`,
				);

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
