import { SdkError } from "../validation";

export type FraudEngineErrorCode =
	| "API_ERROR"
	| "ENCRYPTION_ERROR"
	| "SIGNING_ERROR"
	| "VALIDATION_ERROR"
	| "NETWORK_ERROR"
	| "PLACE_ORDER_ERROR";

export class FraudEngineError extends SdkError<FraudEngineErrorCode> {
	constructor(
		message: string,
		options: {
			code: FraudEngineErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "FraudEngineError";
	}
}
