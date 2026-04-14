import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { FraudEngineError } from "./errors";

// ── Config schema ──────────────────────────────────────────────────────

export const ZodFraudEngineConfigSchema = z.object({
	apiUrl: z.url(),
	encryptionKey: z.string().min(1),
	seonRegion: z.string().optional(),
});

// ── Buy order details schema ───────────────────────────────────────────

export const ZodBuyOrderDetailsSchema = z.object({
	cryptoAmount: z.number(),
	fiatAmount: z.number(),
	currency: z.string().min(1),
	recipientAddress: z.string().min(1),
	fee: z.number(),
	amountAfterFee: z.number(),
	paymentMethod: z.string().optional(),
	estimatedProcessingTime: z.string().optional(),
});

// ── User details schema ────────────────────────────────────────────────

export const ZodUserDetailsSchema = z.object({
	currency: z.string().optional(),
	country: z.string().optional(),
	language: z.string().optional(),
	loginMethod: z.enum(["email", "google", "phone", "passkey", "unknown"]).optional(),
	loginEmail: z.string().optional(),
	loginPhone: z.string().optional(),
});

// ── Link order schema ──────────────────────────────────────────────────

export const ZodLinkOrderParamsSchema = z.object({
	activityLogId: z.number().int().positive(),
	orderId: z.string().min(1),
});

// ── Validate helper ────────────────────────────────────────────────────

export function validate<S extends z.ZodType>(
	schema: S,
	data: unknown,
): Result<z.infer<S>, FraudEngineError> {
	const result = schema.safeParse(data);
	if (result.success) {
		return ok(result.data as z.infer<S>);
	}
	return err(
		new FraudEngineError(z.prettifyError(result.error), {
			code: "VALIDATION_ERROR",
			cause: result.error,
			context: { data },
		}),
	);
}
