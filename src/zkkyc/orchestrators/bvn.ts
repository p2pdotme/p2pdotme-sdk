import { ResultAsync } from "neverthrow";
import { ZkkycError, type ZkkycErrorCode } from "../errors";
import type {
	BvnAttestation,
	BvnDecision,
	BvnFlow,
	BvnFlowConfig,
	BvnMethod,
	BvnOnboardParams,
	BvnSendOtpParams,
	BvnSession,
} from "./types";

/**
 * Drives the BVN (Nigerian Bank Verification Number) on-chain attestation flow.
 *
 * The SDK talks only to a backend proxy — the single party that holds the Mono
 * secret + the EIP-712 attestor key. Every response uses the `{ ok, data }`
 * envelope. On approval, `getAttestation` returns a signed attestation shaped
 * for `zkkyc.prepareSubmitBvnAttestation`, which the app submits on-chain from
 * the same wallet.
 *
 * Flow: onboard → submitBvn → sendOtp → confirmOtp → getAttestation.
 */
export function createBvnFlow(config: BvnFlowConfig): BvnFlow {
	const { baseUrl, tenant } = config;

	async function request<T>(
		path: string,
		failureCode: ZkkycErrorCode,
		init: RequestInit | undefined,
		parse: (data: unknown) => T,
	): Promise<T> {
		const response = await fetch(`${baseUrl}${path}`, init);
		const body: unknown = await response.json().catch(() => null);
		const envelope =
			body && typeof body === "object" ? (body as Record<string, unknown>) : {};

		if (!response.ok || envelope.ok === false) {
			const code = typeof envelope.error === "string" ? envelope.error : "request_failed";
			const message =
				typeof envelope.message === "string"
					? envelope.message
					: `BVN request failed (${response.status})`;
			// A rejected session token means the run must restart from onboard.
			const isSessionExpired = response.status === 401 || code === "unauthorized";
			throw new ZkkycError(message, {
				code: isSessionExpired ? "BVN_SESSION_EXPIRED" : failureCode,
				context: { status: response.status, backendError: code, path },
			});
		}

		return parse(envelope.data);
	}

	function run<T>(
		failureCode: ZkkycErrorCode,
		fn: () => Promise<T>,
	): ResultAsync<T, ZkkycError> {
		return ResultAsync.fromPromise(fn(), (error) => {
			if (error instanceof ZkkycError) return error;
			return new ZkkycError("BVN request failed", { code: failureCode, cause: error });
		});
	}

	function authHeaders(token: string): Record<string, string> {
		return { "content-type": "application/json", "x-session-token": token };
	}

	return {
		onboard(params: BvnOnboardParams): ResultAsync<BvnSession, ZkkycError> {
			return run("BVN_ONBOARD_FAILED", () =>
				request(
					"/v1/onboard",
					"BVN_ONBOARD_FAILED",
					{
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							tenant,
							wallet: params.walletAddress,
							scope: params.scope ?? "identity",
						}),
					},
					(data) => {
						const d = data as { session_id: number; session_token: string };
						return { sessionId: d.session_id, sessionToken: d.session_token };
					},
				),
			);
		},

		submitBvn(session: BvnSession, bvn: string): ResultAsync<BvnMethod[], ZkkycError> {
			return run("BVN_SUBMIT_FAILED", () =>
				request(
					`/v1/sessions/${session.sessionId}/bvn`,
					"BVN_SUBMIT_FAILED",
					{
						method: "POST",
						headers: authHeaders(session.sessionToken),
						body: JSON.stringify({ bvn }),
					},
					(data) => (data as { methods: BvnMethod[] }).methods,
				),
			);
		},

		sendOtp(session: BvnSession, params: BvnSendOtpParams): ResultAsync<boolean, ZkkycError> {
			return run("BVN_OTP_SEND_FAILED", () =>
				request(
					`/v1/sessions/${session.sessionId}/otp`,
					"BVN_OTP_SEND_FAILED",
					{
						method: "POST",
						headers: authHeaders(session.sessionToken),
						body: JSON.stringify({
							method: params.method,
							...(params.method === "alternate_phone" && params.phoneNumber
								? { phone_number: params.phoneNumber }
								: {}),
						}),
					},
					(data) => (data as { sent: boolean }).sent,
				),
			);
		},

		confirmOtp(session: BvnSession, otp: string): ResultAsync<BvnDecision, ZkkycError> {
			return run("BVN_OTP_CONFIRM_FAILED", () =>
				request(
					`/v1/sessions/${session.sessionId}/otp/confirm`,
					"BVN_OTP_CONFIRM_FAILED",
					{
						method: "POST",
						headers: authHeaders(session.sessionToken),
						body: JSON.stringify({ otp }),
					},
					(data) => {
						const d = data as { decision: "approve" | "reject"; reason?: string };
						return { decision: d.decision, reason: d.reason };
					},
				),
			);
		},

		getAttestation(session: BvnSession): ResultAsync<BvnAttestation, ZkkycError> {
			return run("BVN_ATTESTATION_FAILED", () =>
				request(
					`/v1/sessions/${session.sessionId}/attestation`,
					"BVN_ATTESTATION_FAILED",
					{
						method: "POST",
						headers: { "x-session-token": session.sessionToken },
					},
					(data) => {
						const d = data as {
							signature: string;
							message: {
								wallet: string;
								nullifier: string;
								limit: string | number;
								expiry: string | number;
							};
						};
						return {
							nullifier: d.message.nullifier as `0x${string}`,
							limit: BigInt(d.message.limit),
							expiry: BigInt(d.message.expiry),
							signature: d.signature as `0x${string}`,
							wallet: d.message.wallet,
						} satisfies BvnAttestation;
					},
				),
			);
		},

		getAttestor(): ResultAsync<{ address: string }, ZkkycError> {
			return run("BVN_ATTESTATION_FAILED", () =>
				request(
					"/v1/attestor",
					"BVN_ATTESTATION_FAILED",
					undefined,
					(data) => data as { address: string },
				),
			);
		},
	};
}
