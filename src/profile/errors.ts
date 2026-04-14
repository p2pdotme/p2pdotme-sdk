import { SdkError } from "../validation";

export type ProfileErrorCode = "VALIDATION_ERROR" | "CONTRACT_READ_ERROR";

export class ProfileError extends SdkError<ProfileErrorCode> {
	constructor(
		message: string,
		options: {
			code: ProfileErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "ProfileError";
	}
}
