import { z } from "zod";
import { ZodAddressSchema, ZodCurrencySchema } from "../validation/schemas.validation";

export const ZodUsdcBalanceParamsSchema = z.object({
	address: ZodAddressSchema,
});

export type UsdcBalanceParams = z.infer<typeof ZodUsdcBalanceParamsSchema>;

export const ZodUsdcAllowanceParamsSchema = z.object({
	owner: ZodAddressSchema,
});

export type UsdcAllowanceParams = z.infer<typeof ZodUsdcAllowanceParamsSchema>;

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
