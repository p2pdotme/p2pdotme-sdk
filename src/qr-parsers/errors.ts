export type QRParserErrorCode =
	| "INVALID_QR"
	| "INVALID_CURRENCY"
	| "INVALID_AMOUNT"
	| "FETCH_FAILED";

export class QRParserError extends Error {
	readonly code: QRParserErrorCode;
	readonly cause?: unknown;
	readonly context?: Record<string, unknown>;

	constructor(
		message: string,
		options: {
			code: QRParserErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message);
		this.name = "QRParserError";
		this.code = options.code;
		this.cause = options.cause;
		this.context = options.context;
	}
}
