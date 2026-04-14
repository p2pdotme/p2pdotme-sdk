import { z } from "zod";
import { ZodAddressSchema, ZodCurrencySchema } from "../validation/schemas.validation";

export const ZodUsdcBalanceParamsSchema = z.object({
	address: ZodAddressSchema,
});

export type UsdcBalanceParams = z.infer<typeof ZodUsdcBalanceParamsSchema>;

export const ZodGetBalancesParamsSchema = z.object({
	address: ZodAddressSchema,
	currency: ZodCurrencySchema,
});

export type GetBalancesParams = z.infer<typeof ZodGetBalancesParamsSchema>;

export const ZodTxLimitsParamsSchema = z.object({
	address: ZodAddressSchema,
	currency: ZodCurrencySchema,
});

export type TxLimitsParams = z.infer<typeof ZodTxLimitsParamsSchema>;

export const ZodPriceConfigParamsSchema = z.object({
	currency: ZodCurrencySchema,
});

export type PriceConfigParams = z.infer<typeof ZodPriceConfigParamsSchema>;
