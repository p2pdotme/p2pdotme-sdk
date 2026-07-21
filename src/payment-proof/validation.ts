import { z } from "zod";

/** `{ orderId }` — the order to read/raise a proof request for. */
export const ZodOrderProofParamsSchema = z.object({
	orderId: z.string().min(1),
});

export type OrderProofParams = z.infer<typeof ZodOrderProofParamsSchema>;

/** `{ orderId, note? }` — raise a proof request; `note` is optional raw bytes. */
export const ZodRequestProofParamsSchema = z.object({
	orderId: z.string().min(1),
	note: z.instanceof(Uint8Array).optional(),
});

export type RequestProofParams = z.infer<typeof ZodRequestProofParamsSchema>;

/** `{ requestId }` — a proof request whose files to list. */
export const ZodProofRequestIdParamsSchema = z.object({
	requestId: z.string().min(1),
});

export type ProofRequestIdParams = z.infer<typeof ZodProofRequestIdParamsSchema>;

/** `{ requestId, fileId }` — a single proof file to download. */
export const ZodProofFileParamsSchema = z.object({
	requestId: z.string().min(1),
	fileId: z.string().min(1),
});

export type ProofFileParams = z.infer<typeof ZodProofFileParamsSchema>;
