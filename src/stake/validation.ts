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

export const ZodGetP2pTokenBalanceParamsSchema = z.object({
	address: ZodAddressSchema,
});

export type GetP2pTokenBalanceParams = z.infer<typeof ZodGetP2pTokenBalanceParamsSchema>;

// ── Write params ────────────────────────────────────────────────────────

export const ZodStakeParamsSchema = z.object({
	tokens: z.bigint().positive(),
});
export type StakeParams = z.infer<typeof ZodStakeParamsSchema>;

export const ZodTopUpParamsSchema = z.object({
	tokens: z.bigint().positive(),
});
export type TopUpParams = z.infer<typeof ZodTopUpParamsSchema>;
