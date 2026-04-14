import { z } from "zod";
import { ZodAddressSchema, ZodCurrencySchema } from "../validation";

export const ZodPlaceOrderParamsSchema = z.object({
	amount: z.bigint(),
	recipientAddr: ZodAddressSchema,
	orderType: z.number().int().min(0).max(2),
	currency: ZodCurrencySchema,
	fiatAmount: z.bigint(),
	user: ZodAddressSchema,
	pubKey: z.string().optional(),
	preferredPaymentChannelConfigId: z.bigint().optional(),
	fiatAmountLimit: z.bigint().optional().default(0n),
});

export type PlaceOrderParams = z.input<typeof ZodPlaceOrderParamsSchema>;

export const ZodSetSellOrderUpiParamsSchema = z.object({
	orderId: z.number().int().nonnegative(),
	paymentAddress: z.string().min(1),
	merchantPublicKey: z.string().min(1),
	updatedAmount: z.bigint(),
});

export type SetSellOrderUpiParams = z.infer<typeof ZodSetSellOrderUpiParamsSchema>;
