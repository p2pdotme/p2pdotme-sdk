import { SdkError } from "../validation";

export type PaymentProofErrorCode =
	| "VALIDATION_ERROR"
	| "SESSION_ERROR"
	| "API_ERROR"
	| "NETWORK_ERROR";

/**
 * Error surfaced by every `@p2pdotme/sdk/payment-proof` method. The proof server's
 * own error code (e.g. `WINDOW_EXPIRED`, `COUNTRY_DISABLED`, `FORBIDDEN`) is carried
 * in `context.apiCode`, with the HTTP status in `context.status`.
 */
export class PaymentProofError extends SdkError<PaymentProofErrorCode> {
	constructor(
		message: string,
		options: {
			code: PaymentProofErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "PaymentProofError";
	}
}
