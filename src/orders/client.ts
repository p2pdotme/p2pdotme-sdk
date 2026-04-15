import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { readFeeConfigMulticall, readOrderMulticall } from "../contracts/order-processor";
import { noopLogger } from "../lib";
import { validate } from "../validation";
import { OrdersError } from "./errors";
import { normalizeContractOrder } from "./normalize";
import { getOrdersForUser } from "./subgraph";
import type {
	FeeConfig,
	GetFeeConfigParams,
	GetOrderParams,
	GetOrdersParams,
	Order,
	OrdersConfig,
} from "./types";
import {
	ZodGetFeeConfigParamsSchema,
	ZodGetOrderParamsSchema,
	ZodGetOrdersParamsSchema,
} from "./validation";

export interface OrdersClient {
	/** Reads a single order by id from the Diamond contract. */
	getOrder(params: GetOrderParams): ResultAsync<Order, OrdersError>;
	/**
	 * Lists orders created by `userAddress` from the subgraph, newest first.
	 * Defaults: `skip = 0`, `limit = 20`. Max `limit` is 100.
	 */
	getOrders(params: GetOrdersParams): ResultAsync<Order[], OrdersError>;
	/**
	 * Reads the per-currency small-order fee config from the Diamond via
	 * multicall: threshold (below which the fixed fee applies) and the fixed
	 * fee itself. Both are 6-decimal bigints.
	 */
	getFeeConfig(params: GetFeeConfigParams): ResultAsync<FeeConfig, OrdersError>;
}

/**
 * Creates an orders client with `getOrder` (contract multicall) and
 * `getOrders` (subgraph, paginated) backed by the given viem client and
 * subgraph URL.
 */
export function createOrders(config: OrdersConfig): OrdersClient {
	const { publicClient, diamondAddress, subgraphUrl } = config;
	const logger = config.logger ?? noopLogger;

	return {
		getOrder(params) {
			return validate(
				ZodGetOrderParamsSchema,
				params,
				(message, cause, d) =>
					new OrdersError(message, {
						code: "INVALID_ORDER_ID",
						cause,
						context: { params: d },
					}),
			)
				.asyncAndThen(({ orderId }) =>
					readOrderMulticall(publicClient, diamondAddress, orderId).mapErr(
						(cause) =>
							new OrdersError("Order contract read failed", {
								code: "CONTRACT_READ_FAILED",
								cause,
								context: { orderId: orderId.toString() },
							}),
					),
				)
				.andThen(({ order, details }) =>
					normalizeContractOrder(order, details).asyncAndThen((normalized) => {
						if (!normalized) {
							return errAsync(
								new OrdersError("Order not found", {
									code: "ORDER_NOT_FOUND",
									context: { orderId: params.orderId.toString() },
								}),
							);
						}
						logger.debug("getOrder resolved", { orderId: params.orderId.toString() });
						return okAsync(normalized);
					}),
				);
		},

		getOrders(params) {
			return validate(
				ZodGetOrdersParamsSchema,
				params,
				(message, cause, d) =>
					new OrdersError(message, {
						code: "INVALID_GET_ORDERS_PARAMS",
						cause,
						context: { params: d },
					}),
			).asyncAndThen(({ userAddress, skip, limit }) =>
				getOrdersForUser(subgraphUrl, userAddress, skip, limit, logger),
			);
		},

		getFeeConfig(params) {
			return validate(
				ZodGetFeeConfigParamsSchema,
				params,
				(message, cause, d) =>
					new OrdersError(message, {
						code: "INVALID_FEE_CONFIG_PARAMS",
						cause,
						context: { params: d },
					}),
			)
				.asyncAndThen(({ currency }) =>
					readFeeConfigMulticall(publicClient, diamondAddress, currency).mapErr(
						(cause) =>
							new OrdersError("Fee config contract read failed", {
								code: "CONTRACT_READ_FAILED",
								cause,
								context: { currency },
							}),
					),
				)
				.map((config) => {
					logger.debug("getFeeConfig resolved", { currency: params.currency });
					return config;
				});
		},
	};
}
