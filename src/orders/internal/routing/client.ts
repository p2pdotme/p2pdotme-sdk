import type { ResultAsync } from "neverthrow";
import { stringToHex } from "viem";
import { checkCircleEligibility } from "../../../contracts";
import { noopLogger } from "../../../lib";
import type { OrderRoutingError } from "./errors";
import { selectCircleForOrderAsync } from "./routing";
import { getCirclesForRouting } from "./subgraph";
import type { Logger, OrderRoutingConfig, SelectCircleParams } from "./types";

export interface OrderRouter {
	/**
	 * Full flow: fetch circles from subgraph → epsilon-greedy selection →
	 * on-chain eligibility validation → return circleId.
	 */
	selectCircle(params: SelectCircleParams): ResultAsync<bigint, OrderRoutingError>;
}

export function createOrderRouter(config: OrderRoutingConfig): OrderRouter {
	const { subgraphUrl, publicClient, contractAddress } = config;
	const logger: Logger = config.logger ?? noopLogger;

	return {
		selectCircle(params: SelectCircleParams) {
			const currencyHex = stringToHex(params.currency, { size: 32 });

			logger.info("selectCircle started", {
				currency: params.currency,
				user: params.user,
				orderType: String(params.orderType),
			});

			return getCirclesForRouting(subgraphUrl, currencyHex, logger).andThen((circles) =>
				selectCircleForOrderAsync(
					circles,
					currencyHex,
					(circleId) =>
						checkCircleEligibility(
							publicClient,
							contractAddress,
							{
								circleId,
								currency: currencyHex,
								user: params.user,
								usdtAmount: params.usdtAmount,
								fiatAmount: params.fiatAmount,
								orderType: params.orderType,
								preferredPCConfigId: params.preferredPCConfigId,
							},
							logger,
						),
					logger,
				),
			);
		},
	};
}
