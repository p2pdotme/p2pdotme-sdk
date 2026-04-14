import { Result } from "neverthrow";
import { type Logger, noopLogger, querySubgraph } from "../../lib";
import { validate } from "../../validation";
import { OrdersError } from "../errors";
import { normalizeSubgraphOrder } from "../normalize";
import type { Order } from "../types";
import { ZodSubgraphOrdersResponseSchema } from "../validation";
import { ORDERS_BY_USER_QUERY } from "./queries";

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
