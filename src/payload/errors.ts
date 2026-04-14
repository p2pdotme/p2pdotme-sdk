import { SdkError } from "../validation";

export type PayloadErrorCode =
	| "VALIDATION_ERROR"
	| "CIRCLE_SELECTION_ERROR"
	| "ENCRYPTION_ERROR"
	| "DECRYPTION_ERROR";

export class PayloadError extends SdkError<PayloadErrorCode> {
	constructor(
		message: string,
		options: {
			code: PayloadErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "PayloadError";
	}
}
