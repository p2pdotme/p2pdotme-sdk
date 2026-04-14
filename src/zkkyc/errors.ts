import { SdkError } from "../validation";

export type ZkkycErrorCode =
	| "VALIDATION_ERROR"
	| "CONTRACT_READ_ERROR"
	| "ENCODE_ERROR"
	| "RECLAIM_INIT_FAILED"
	| "RECLAIM_SESSION_NOT_FOUND"
	| "RECLAIM_PROOF_GENERATION_FAILED"
	| "RECLAIM_PROOF_INVALID"
	| "RECLAIM_POLLING_ABORTED"
	| "ZK_PASSPORT_INIT_FAILED"
	| "ZK_PASSPORT_REJECTED"
	| "ZK_PASSPORT_VERIFICATION_FAILED"
	| "ZK_PASSPORT_ABORTED"
	| "PEER_DEPENDENCY_MISSING";

export class ZkkycError extends SdkError<ZkkycErrorCode> {
	constructor(
		message: string,
		options: {
			code: ZkkycErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "ZkkycError";
	}
}
