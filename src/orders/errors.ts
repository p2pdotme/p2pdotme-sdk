import { SdkError } from "../validation";

export type OrdersErrorCode =
	| "INVALID_ORDER_ID"
	| "INVALID_GET_ORDERS_PARAMS"
	| "INVALID_FEE_CONFIG_PARAMS"
	| "ORDER_NOT_FOUND"
	| "CONTRACT_READ_FAILED"
	| "SUBGRAPH_REQUEST_FAILED"
	| "SUBGRAPH_VALIDATION_FAILED"
	| "MALFORMED_ORDER";

export class OrdersError extends SdkError<OrdersErrorCode> {
	constructor(
		message: string,
		options: {
			code: OrdersErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "OrdersError";
	}
}
