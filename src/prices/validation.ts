import { z } from "zod";
import { ZodCurrencySchema } from "../validation/schemas.validation";

export const ZodGetPriceConfigParamsSchema = z.object({
	currency: ZodCurrencySchema,
});
export type GetPriceConfigParams = z.infer<typeof ZodGetPriceConfigParamsSchema>;

export const ZodGetRpPerUsdtLimitParamsSchema = z.object({
	currency: ZodCurrencySchema,
});
export type GetRpPerUsdtLimitParams = z.infer<typeof ZodGetRpPerUsdtLimitParamsSchema>;
