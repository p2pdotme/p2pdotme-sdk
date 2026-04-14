import { noopLogger } from "../../lib";
import { validate } from "../../validation";
import { OrderRoutingError } from "../errors";
import type { Logger } from "../types";
import { ZodCirclesForRoutingResponseSchema } from "../validation";
import { querySubgraph } from "./client";
import { CIRCLES_FOR_ROUTING_QUERY } from "./queries";

export function getCirclesForRouting(
	subgraphUrl: string,
	currency: string,
	logger: Logger = noopLogger,
) {
	logger.debug("fetching circles from subgraph", { subgraphUrl, currency });

	return querySubgraph(subgraphUrl, {
		query: CIRCLES_FOR_ROUTING_QUERY,
		variables: { currency },
	}).andThen((data) =>
		validate(
			ZodCirclesForRoutingResponseSchema,
			data,
			(message, cause, d) =>
				new OrderRoutingError(message, { code: "VALIDATION_ERROR", cause, context: { data: d } }),
		).map((validated) => {
			const circles = validated.circles.filter(
				(item) => Number(item.metrics.scoreState.activeMerchantsCount) > 0,
			);
			logger.info("fetched circles from subgraph", {
				total: validated.circles.length,
				withActiveMerchants: circles.length,
				circles,
			});
			return circles;
		}),
	);
}

export { querySubgraph } from "./client";
export { CIRCLES_FOR_ROUTING_QUERY } from "./queries";
