import { type Logger, noopLogger, querySubgraph } from "../../../../lib";
import { validate } from "../../../../validation";
import { OrderRoutingError } from "../errors";
import { ZodCirclesForRoutingResponseSchema } from "../validation";
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
	})
		.mapErr(
			(e) =>
				new OrderRoutingError(e.message, {
					code: "SUBGRAPH_ERROR",
					cause: e.cause ?? e,
					context: e.context,
				}),
		)
		.andThen((data) =>
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

export { CIRCLES_FOR_ROUTING_QUERY } from "./queries";
