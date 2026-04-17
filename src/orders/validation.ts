import { z } from "zod";
import { ZodAddressSchema, ZodCurrencySchema } from "../validation";

// ── Read params ─────────────────────────────────────────────────────────

export const ZodGetOrderParamsSchema = z.object({
	orderId: z.bigint().positive(),
});

// `z.infer`: schema has no defaults, so input and output shapes match.
export type GetOrderParams = z.infer<typeof ZodGetOrderParamsSchema>;

export const ZodGetFeeConfigParamsSchema = z.object({
	currency: ZodCurrencySchema,
});

export type GetFeeConfigParams = z.infer<typeof ZodGetFeeConfigParamsSchema>;

export const ZodGetOrdersParamsSchema = z.object({
	userAddress: ZodAddressSchema,
	skip: z.number().int().min(0).default(0),
	limit: z.number().int().min(1).max(100).default(20),
});

// `z.input`: `skip`/`limit` have defaults, so callers may omit them — the public
// type must reflect that, whereas `z.infer` would mark them as required.
export type GetOrdersParams = z.input<typeof ZodGetOrdersParamsSchema>;

// ── Write params ────────────────────────────────────────────────────────

export const ZodPlaceOrderParamsSchema = z.object({
	orderType: z.number().int().min(0).max(2),
	currency: ZodCurrencySchema,
	user: ZodAddressSchema,
	amount: z.bigint(),
	fiatAmount: z.bigint(),
	fiatAmountLimit: z.bigint().optional().default(0n),
	recipientAddr: ZodAddressSchema,
	preferredPaymentChannelConfigId: z.bigint().optional(),
	pubKey: z.string().optional(),
});
export type PlaceOrderParams = z.input<typeof ZodPlaceOrderParamsSchema>;

export const ZodCancelOrderParamsSchema = z.object({
	orderId: z.bigint().nonnegative(),
});
export type CancelOrderParams = z.infer<typeof ZodCancelOrderParamsSchema>;

export const ZodSetSellOrderUpiParamsSchema = z.object({
	orderId: z.bigint().nonnegative(),
	paymentAddress: z.string().min(1),
	merchantPublicKey: z.string().min(1),
	updatedAmount: z.bigint(),
});
export type SetSellOrderUpiParams = z.infer<typeof ZodSetSellOrderUpiParamsSchema>;

export const ZodRaiseDisputeParamsSchema = z.object({
	orderId: z.bigint().nonnegative(),
	redactTransId: z.bigint().nonnegative(),
});
export type RaiseDisputeParams = z.infer<typeof ZodRaiseDisputeParamsSchema>;

export const ZodApproveUsdcParamsSchema = z.object({
	amount: z.bigint().nonnegative(),
});
export type ApproveUsdcParams = z.infer<typeof ZodApproveUsdcParamsSchema>;

export const ZodPaidBuyOrderParamsSchema = z.object({
	orderId: z.bigint().nonnegative(),
});
export type PaidBuyOrderParams = z.infer<typeof ZodPaidBuyOrderParamsSchema>;

// ── Subgraph response (internal) ────────────────────────────────────────

const HexString = z.string().regex(/^0x[0-9a-fA-F]*$/, "Expected 0x-prefixed hex");

export const ZodSubgraphOrderSchema = z.object({
	orderId: z.string(),
	type: z.number().int().min(0),
	status: z.number().int().min(0),
	circleId: z.string(),
	userAddress: HexString,
	usdcRecipientAddress: HexString,
	acceptedMerchantAddress: HexString,
	usdcAmount: z.string(),
	fiatAmount: z.string(),
	actualUsdcAmount: z.string(),
	actualFiatAmount: z.string(),
	currency: HexString,
	placedAt: z.string(),
	acceptedAt: z.string(),
	paidAt: z.string(),
	completedAt: z.string(),
	fixedFeePaid: z.string(),
	tipsPaid: z.string(),
	disputeStatus: z.number().int().min(0),
});

export type RawSubgraphOrder = z.infer<typeof ZodSubgraphOrderSchema>;

export const ZodSubgraphOrdersResponseSchema = z.object({
	orders_collection: z.array(ZodSubgraphOrderSchema),
});
