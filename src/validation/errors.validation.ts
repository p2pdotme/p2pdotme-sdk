export class SdkError<TCode extends string = string> extends Error {
	readonly code: TCode;
	readonly cause?: unknown;
	readonly context?: Record<string, unknown>;

	constructor(
		message: string,
		options: {
			code: TCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message);
		this.name = "SdkError";
		this.code = options.code;
		this.cause = options.cause;
		this.context = options.context;
	}
}
