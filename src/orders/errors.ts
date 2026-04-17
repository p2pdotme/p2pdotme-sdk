import { SdkError } from "../validation";

export type OrdersErrorCode =
	// Shared
	| "VALIDATION_ERROR"
	// Reads
	| "INVALID_ORDER_ID"
	| "INVALID_GET_ORDERS_PARAMS"
	| "INVALID_FEE_CONFIG_PARAMS"
	| "ORDER_NOT_FOUND"
	| "CONTRACT_READ_FAILED"
	| "SUBGRAPH_REQUEST_FAILED"
	| "SUBGRAPH_VALIDATION_FAILED"
	| "MALFORMED_ORDER"
	// Writes
	| "CIRCLE_SELECTION_FAILED"
	| "ENCRYPTION_FAILED"
	| "RELAY_IDENTITY_CORRUPT"
	| "RELAY_IDENTITY_STORE_FAILED"
	| "TX_SUBMISSION_FAILED"
	| "RECEIPT_TIMEOUT"
	| "TX_REVERTED"
	| "EVENT_WATCH_FAILED";

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
