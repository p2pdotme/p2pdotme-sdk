import { ResultAsync } from "neverthrow";
import type { Address } from "viem";
import { noopLogger } from "../../lib";
import { OrderRoutingError } from "../../orders/internal/routing/errors";
import type { CheckCircleEligibilityParams, Logger } from "../../orders/internal/routing/types";
import { ZodCheckCircleEligibilityParamsSchema } from "../../orders/internal/routing/validation";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { ABIS } from "../abis";

/** Checks on-chain eligibility for a given circle by reading assignable merchants. */
export function checkCircleEligibility(
	publicClient: PublicClientLike,
	contractAddress: Address,
	params: CheckCircleEligibilityParams,
	logger: Logger = noopLogger,
): ResultAsync<boolean, OrderRoutingError> {
	return validate(
		ZodCheckCircleEligibilityParamsSchema,
		params,
		(message, cause, d) =>
			new OrderRoutingError(message, { code: "VALIDATION_ERROR", cause, context: { data: d } }),
	)
		.asyncAndThen((validated) => {
			logger.debug("checking on-chain eligibility", {
				circleId: String(validated.circleId),
				contractAddress,
			});

			return ResultAsync.fromPromise(
				publicClient.readContract({
					address: contractAddress,
					abi: ABIS.FACETS.ORDER_FLOW,
					functionName: "getAssignableMerchantsFromCircle",
					args: [
						validated.circleId,
						1n,
						validated.currency,
						validated.user as Address,
						validated.usdtAmount,
						validated.fiatAmount,
						validated.orderType,
						validated.preferredPCConfigId,
					],
				}),
				(error) =>
					new OrderRoutingError("Eligibility check failed", {
						code: "CONTRACT_READ_ERROR",
						cause: error,
						context: { circleId: String(params.circleId) },
					}),
			);
		})
		.map((merchants) => {
			const arr = merchants as readonly Address[];
			const eligible = arr.length >= 1;
			logger.debug("eligibility check result", {
				circleId: String(params.circleId),
				assignableMerchants: arr.length,
				eligible,
			});
			return eligible;
		});
}
