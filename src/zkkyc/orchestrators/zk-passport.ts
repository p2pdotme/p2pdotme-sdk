import { ResultAsync } from "neverthrow";
import { ZkkycError } from "../errors";
import type { ZkPassportFlowParams, ZkPassportProofResult, ZkPassportSession } from "./types";

/** Initializes a ZK Passport verification flow and returns a session. */
export function createZkPassportFlow(
	params: ZkPassportFlowParams,
): ResultAsync<ZkPassportSession, ZkkycError> {
	return ResultAsync.fromPromise(
		(async () => {
			// biome-ignore lint/suspicious/noExplicitAny: optional peer dependency
			const mod: any = await import("@zkpassport/sdk").catch(() => {
				throw new ZkkycError(
					"Missing peer dependency: @zkpassport/sdk. Install it with: npm install @zkpassport/sdk",
					{ code: "PEER_DEPENDENCY_MISSING" },
				);
			});
			const { ZKPassport } = mod;

			const zkPassport = new ZKPassport(params.domain);

			const queryBuilder = await zkPassport.request({
				name: params.name ?? "ZKPassport",
				logo: params.logo,
				purpose: params.purpose ?? "Prove your personhood",
				scope: "personhood",
				mode: "compressed-evm",
			});

			const {
				url,
				onRequestReceived,
				onGeneratingProof,
				onProofGenerated,
				onResult,
				onReject,
				onError,
			} = queryBuilder
				.gte("age", 18)
				.disclose("document_type")
				.disclose("nationality")
				.bind("user_address", params.walletAddress)
				.done();

			params.onStatus?.({ type: "request_created", url });

			let aborted = false;

			const resultPromise = new Promise<ZkPassportProofResult>((resolve, reject) => {
				let proof: unknown = null;

				onRequestReceived(() => {
					if (aborted) return;
					params.onStatus?.({ type: "request_received" });
				});

				onGeneratingProof(() => {
					if (aborted) return;
					params.onStatus?.({ type: "generating_proof" });
				});

				onProofGenerated(async (result: unknown) => {
					if (aborted) return;
					params.onStatus?.({ type: "proof_generated" });
					proof = result;
				});

				onResult(
					async ({
						result,
						uniqueIdentifier,
						verified,
					}: {
						result: Record<string, { disclose?: { result?: string } }>;
						uniqueIdentifier: string | null;
						verified: boolean;
					}) => {
						if (aborted) return;
						params.onStatus?.({ type: "result_received" });

						if (!verified || !proof || !uniqueIdentifier) {
							reject(
								new ZkkycError("ZK Passport verification failed", {
									code: "ZK_PASSPORT_VERIFICATION_FAILED",
								}),
							);
							return;
						}

						try {
							const verifierParams = zkPassport.getSolidityVerifierParameters({
								proof,
								scope: "personhood",
								devMode: false,
							});

							const isIDCard = result.document_type?.disclose?.result !== "passport";

							resolve({ params: verifierParams, isIDCard });
						} catch (error) {
							reject(
								new ZkkycError("Failed to extract ZK Passport verifier parameters", {
									code: "ZK_PASSPORT_VERIFICATION_FAILED",
									cause: error,
								}),
							);
						}
					},
				);

				onReject(() => {
					params.onStatus?.({ type: "rejected" });
					reject(
						new ZkkycError("User rejected ZK Passport verification", {
							code: "ZK_PASSPORT_REJECTED",
						}),
					);
				});

				onError((error: unknown) => {
					reject(
						new ZkkycError(typeof error === "string" ? error : "ZK Passport verification error", {
							code: "ZK_PASSPORT_VERIFICATION_FAILED",
							cause: error,
						}),
					);
				});
			});

			const session: ZkPassportSession = {
				url,
				result: ResultAsync.fromPromise(resultPromise, (error) => {
					if (error instanceof ZkkycError) return error;
					return new ZkkycError("ZK Passport flow failed", {
						code: "ZK_PASSPORT_VERIFICATION_FAILED",
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
			return new ZkkycError("Failed to initialize ZK Passport", {
				code: "ZK_PASSPORT_INIT_FAILED",
				cause: error,
			});
		},
	);
}
