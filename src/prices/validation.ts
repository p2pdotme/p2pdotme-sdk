import { z } from "zod";
import { ZodCurrencySchema } from "../validation/schemas.validation";

/**
 * Shared param shape for every currency-scoped read in this module
 * (`getPriceConfig`, `getReputationPerUsdcLimit`). All methods take `{ currency }`.
 */
export const ZodCurrencyScopedParamsSchema = z.object({
	currency: ZodCurrencySchema,
});

export type CurrencyScopedParams = z.infer<typeof ZodCurrencyScopedParamsSchema>;
