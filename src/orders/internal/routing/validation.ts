import { z } from "zod";
import { ZodAddressSchema } from "../../../validation/schemas.validation";

// ── Circle schemas ──────────────────────────────────────────────────────

export const ZodCircleScoreStateSchema = z.object({
	activeMerchantsCount: z.coerce.number(),
});

export const ZodCircleMetricsForRoutingSchema = z.object({
	circleScore: z.coerce.number(),
	circleStatus: z.string(),
	scoreState: ZodCircleScoreStateSchema,
});

export const ZodCircleForRoutingSchema = z.object({
	circleId: z.string(),
	currency: z.string(),
	metrics: ZodCircleMetricsForRoutingSchema,
});

export const ZodCirclesForRoutingResponseSchema = z.object({
	circles: z.array(ZodCircleForRoutingSchema),
});

// ── Eligibility check schema ────────────────────────────────────────────

export const ZodCheckCircleEligibilityParamsSchema = z.object({
	circleId: z.bigint(),
	currency: z.string(),
	user: ZodAddressSchema,
	usdtAmount: z.bigint(),
	fiatAmount: z.bigint(),
	orderType: z.bigint(),
	preferredPCConfigId: z.bigint(),
});

// ── Select circle schema ────────────────────────────────────────────────

export const ZodSelectCircleParamsSchema = z.object({
	currency: z.string().min(1),
	user: ZodAddressSchema,
	usdtAmount: z.bigint(),
	fiatAmount: z.bigint(),
	orderType: z.bigint(),
	preferredPCConfigId: z.bigint(),
});
