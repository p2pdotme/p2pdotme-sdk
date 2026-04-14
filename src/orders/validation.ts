import { z } from "zod";
import { ZodAddressSchema } from "../validation";

export const ZodGetOrderParamsSchema = z.object({
	orderId: z.bigint().positive(),
});

// `z.infer`: schema has no defaults, so input and output shapes match.
export type GetOrderParams = z.infer<typeof ZodGetOrderParamsSchema>;

export const ZodGetOrdersParamsSchema = z.object({
	userAddress: ZodAddressSchema,
	skip: z.number().int().min(0).default(0),
	limit: z.number().int().min(1).max(100).default(20),
});

// `z.input`: `skip`/`limit` have defaults, so callers may omit them — the public
// type must reflect that, whereas `z.infer` would mark them as required.
export type GetOrdersParams = z.input<typeof ZodGetOrdersParamsSchema>;

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
