import { SdkError } from "../validation";

export type PricesErrorCode = "VALIDATION_ERROR" | "CONTRACT_READ_ERROR";

export class PricesError extends SdkError<PricesErrorCode> {
	constructor(
		message: string,
		options: {
			code: PricesErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "PricesError";
	}
}
