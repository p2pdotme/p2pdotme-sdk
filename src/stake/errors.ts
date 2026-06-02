import { SdkError } from "../validation";

export type StakeErrorCode =
	| "VALIDATION_ERROR"
	| "CONTRACT_READ_ERROR"
	| "TX_SUBMISSION_FAILED"
	| "RECEIPT_TIMEOUT"
	| "TX_REVERTED";

export class StakeError extends SdkError<StakeErrorCode> {
	constructor(
		message: string,
		options: {
			code: StakeErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "StakeError";
	}
}
