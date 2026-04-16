import { SdkError } from "../../../validation";

export type OrderRoutingErrorCode =
	| "NO_ELIGIBLE_CIRCLES"
	| "SUBGRAPH_ERROR"
	| "SUBGRAPH_NOT_CONFIGURED"
	| "VALIDATION_ERROR"
	| "CONTRACT_READ_ERROR";

export class OrderRoutingError extends SdkError<OrderRoutingErrorCode> {
	constructor(
		message: string,
		options: {
			code: OrderRoutingErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "OrderRoutingError";
	}
}
