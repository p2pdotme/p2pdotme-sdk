import { Result, type ResultAsync } from "neverthrow";
import { stringToHex } from "viem";
import { type Logger, noopLogger, querySubgraph } from "../../lib";
import { validate } from "../../validation";
import { OrdersError } from "../errors";
import { normalizeSubgraphOrder } from "../normalize";
import type { PlacementBucket, PlacementLimits } from "../types";
import {
	ZodSubgraphOrdersResponseSchema,
	ZodSubgraphPlacementLimitsResponseSchema,
} from "../validation";
import { ORDERS_BY_USER_QUERY, PLACEMENT_LIMITS_QUERY } from "./queries";

const SECONDS_PER_DAY = 86_400;

/** Singleton id of the placement-limit config entity, hex-encoded as the subgraph stores it. */
const PLACEMENT_LIMIT_CONFIG_ID = stringToHex("placement-limits");

function bucket(
	used: number,
	limit: number,
	configured: boolean,
	zeroMeansUnlimited: boolean,
): PlacementBucket {
	if (!configured) return { used, limit: null, remaining: null, state: "unknown" };
	if (limit === 0 && zeroMeansUnlimited) {
		return { used, limit: null, remaining: null, state: "unlimited" };
	}
	return { used, limit, remaining: Math.max(0, limit - used), state: "enforced" };
}

/**
 * Fetches orders created by `userAddress` from the subgraph, applying pagination
 * and sorting newest first. Returns normalized `Order[]`.
 */
export function getOrdersForUser(
	subgraphUrl: string,
	userAddress: string,
	skip: number,
	limit: number,
	logger: Logger = noopLogger,
) {
	const user = userAddress.toLowerCase();
	logger.debug("fetching orders from subgraph", { subgraphUrl, user, skip, limit });

	return querySubgraph(subgraphUrl, {
		query: ORDERS_BY_USER_QUERY,
		variables: { user, skip, first: limit },
	})
		.mapErr(
			(e) =>
				new OrdersError(e.message, {
					code: "SUBGRAPH_REQUEST_FAILED",
					cause: e.cause ?? e,
					context: { user, skip, limit, ...(e.context ?? {}) },
				}),
		)
		.andThen((data) =>
			validate(
				ZodSubgraphOrdersResponseSchema,
				data,
				(message, cause, d) =>
					new OrdersError(message, {
						code: "SUBGRAPH_VALIDATION_FAILED",
						cause,
						context: { data: d },
					}),
			).andThen((validated) =>
				Result.combine(validated.orders_collection.map(normalizeSubgraphOrder)),
			),
		);
}

/**
 * Reads the user's gross daily placement counts and the caps in force from the
 * subgraph. `used` includes orders that were later cancelled — the on-chain
 * counters are never credited back, so cancelling frees nothing.
 *
 * The day is derived from the caller's clock in UTC, matching the contract's
 * `timestamp / 86400` day key. Subgraph indexing lag means a placement made
 * seconds ago may not be reflected yet, so treat this as advisory: the contract
 * remains the authority on whether a placement is allowed.
 */
export function getPlacementLimitsForUser(
	subgraphUrl: string,
	userAddress: string,
	nowSeconds: number,
	logger: Logger = noopLogger,
): ResultAsync<PlacementLimits, OrdersError> {
	const user = userAddress.toLowerCase();
	const dayIndex = Math.floor(nowSeconds / SECONDS_PER_DAY);
	const placementsId = stringToHex(`${user}-${dayIndex}`);

	logger.debug("fetching placement limits from subgraph", { subgraphUrl, user, dayIndex });

	return querySubgraph(subgraphUrl, {
		query: PLACEMENT_LIMITS_QUERY,
		variables: { placementsId, configId: PLACEMENT_LIMIT_CONFIG_ID },
	})
		.mapErr(
			(e) =>
				new OrdersError(e.message, {
					code: "SUBGRAPH_REQUEST_FAILED",
					cause: e.cause ?? e,
					context: { user, dayIndex, ...(e.context ?? {}) },
				}),
		)
		.andThen((data) =>
			validate(
				ZodSubgraphPlacementLimitsResponseSchema,
				data,
				(message, cause, d) =>
					new OrdersError(message, {
						code: "SUBGRAPH_VALIDATION_FAILED",
						cause,
						context: { data: d },
					}),
			),
		)
		.map((validated) => {
			const placements = validated.userDailyPlacements;
			const config = validated.orderPlacementLimitConfig;

			const buyUsed = placements ? Number(placements.buyPlacements) : 0;
			const sellUsed = placements ? Number(placements.sellPlacements) : 0;

			return {
				dayIndex,
				resetsAt: (dayIndex + 1) * SECONDS_PER_DAY,
				// A zero BUY cap is a hard block on-chain, not "unlimited".
				buy: bucket(
					buyUsed,
					config ? Number(config.dailyBuyOrderPlacementLimit) : 0,
					config?.buyLimitConfigured ?? false,
					false,
				),
				sellPay: bucket(
					sellUsed,
					config ? Number(config.dailySellOrderPlacementLimit) : 0,
					config?.sellLimitConfigured ?? false,
					true,
				),
			};
		});
}
