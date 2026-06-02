import { z } from "zod";
import { ZodAddressSchema, ZodCurrencySchema } from "../validation";

// ── Read params ─────────────────────────────────────────────────────────

export const ZodGetUserStakeParamsSchema = z.object({
	user: ZodAddressSchema,
});

export type GetUserStakeParams = z.infer<typeof ZodGetUserStakeParamsSchema>;

export const ZodGetStakeBoostConfigParamsSchema = z.object({
	currency: ZodCurrencySchema,
});

export type GetStakeBoostConfigParams = z.infer<typeof ZodGetStakeBoostConfigParamsSchema>;

// ── Write params ────────────────────────────────────────────────────────

export const ZodStakeParamsSchema = z.object({
	tokens: z.bigint().positive(),
});
export type StakeParams = z.infer<typeof ZodStakeParamsSchema>;

export const ZodTopUpParamsSchema = z.object({
	tokens: z.bigint().positive(),
});
export type TopUpParams = z.infer<typeof ZodTopUpParamsSchema>;
