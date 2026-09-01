import { ResultAsync } from "neverthrow";
import {
	ApiError,
	createProofClient,
	createSessionAuthorization,
	type ProofFileDto,
	type ProofRequestDto,
	type PublicConfigDto,
} from "p2pme-encrypted-payment-proof";
import { validate } from "../validation";
import { PaymentProofError } from "./errors";
import type { PaymentProofConfig } from "./types";
import {
	type OrderProofParams,
	type ProofFileParams,
	type ProofRequestIdParams,
	type RequestProofParams,
	ZodOrderProofParamsSchema,
	ZodProofFileParamsSchema,
	ZodProofRequestIdParamsSchema,
	ZodRequestProofParamsSchema,
} from "./validation";

export interface PaymentProof {
	/**
	 * Public feature config (currency denylist + request window). Unauthenticated —
	 * sends NO wallet prompt, so a UI can call it on load to hide the request control
	 * for a disabled currency. The server enforces both server-side regardless.
	 */
	getPublicConfig(): ResultAsync<PublicConfigDto, PaymentProofError>;

	/**
	 * The proof request for one order, or `null` if none exists. Use its `status`
	 * (`PENDING` / `FULFILLED` / `APPROVED`) to drive a proof pill on a completed
	 * SELL/PAY order.
	 */
	getOrderProofRequest(
		params: OrderProofParams,
	): ResultAsync<ProofRequestDto | null, PaymentProofError>;

	/** Raise a proof request for a completed SELL/PAY order (order creator only). */
	requestProof(params: RequestProofParams): ResultAsync<ProofRequestDto, PaymentProofError>;

	/** List a request's proof files (metadata only; fetch bytes via `downloadProof`). */
	listProofFiles(params: ProofRequestIdParams): ResultAsync<ProofFileDto[], PaymentProofError>;

	/** Fetch a token then download the raw proof-file bytes in one call. */
	downloadProof(params: ProofFileParams): ResultAsync<Uint8Array, PaymentProofError>;

	/**
	 * Synchronous probe: is there a cached, unexpired session? No network, no
	 * signature — e.g. to decide whether a read will prompt the wallet.
	 */
	hasSession(): boolean;
}

const toValidationError = (message: string, cause: unknown): PaymentProofError =>
	new PaymentProofError(message, { code: "VALIDATION_ERROR", cause });

function toError(error: unknown): PaymentProofError {
	if (error instanceof PaymentProofError) return error;
	if (error instanceof ApiError) {
		return new PaymentProofError(error.message, {
			code: "API_ERROR",
			cause: error,
			context: { status: error.status, apiCode: error.code },
		});
	}
	if (error instanceof Error && error.message.includes("mint proof session")) {
		return new PaymentProofError("Failed to establish a proof session", {
			code: "SESSION_ERROR",
			cause: error,
		});
	}
	return new PaymentProofError("Payment-proof request failed", {
		code: "NETWORK_ERROR",
		cause: error,
	});
}

/**
 * Creates a Payment Proof SDK instance for the encrypted-payment-proof server. All
 * methods return `ResultAsync` — no thrown exceptions. The wallet signs in once per
 * session (via `config.signMessage`); the bearer token is cached and reused.
 */
export function createPaymentProof(config: PaymentProofConfig): PaymentProof {
	const authorization = createSessionAuthorization({
		baseUrl: config.apiUrl,
		address: config.address,
		chainId: config.chainId,
		signMessage: config.signMessage,
		storage: config.storage,
		fetch: config.fetch,
	});

	const client = createProofClient({
		baseUrl: config.apiUrl,
		authorization,
		fetch: config.fetch,
	});

	const wrap = <T>(promise: Promise<T>): ResultAsync<T, PaymentProofError> =>
		ResultAsync.fromPromise(promise, toError);

	return {
		getPublicConfig: () => wrap(client.getPublicConfig()),

		getOrderProofRequest: (params) =>
			validate(ZodOrderProofParamsSchema, params, toValidationError).asyncAndThen((p) =>
				wrap(client.getOrderProofRequests(p.orderId).then((r) => r.request)),
			),

		requestProof: (params) =>
			validate(ZodRequestProofParamsSchema, params, toValidationError).asyncAndThen((p) =>
				wrap(client.requestProof(p.orderId, { note: p.note })),
			),

		listProofFiles: (params) =>
			validate(ZodProofRequestIdParamsSchema, params, toValidationError).asyncAndThen((p) =>
				wrap(client.listProofFiles(p.requestId).then((r) => r.files)),
			),

		downloadProof: (params) =>
			validate(ZodProofFileParamsSchema, params, toValidationError).asyncAndThen((p) =>
				wrap(
					client
						.getDownloadToken(p.requestId, p.fileId)
						.then(({ token }) => client.downloadProof(p.requestId, p.fileId, token)),
				),
			),

		hasSession: () => authorization.hasFreshSession(),
	};
}
