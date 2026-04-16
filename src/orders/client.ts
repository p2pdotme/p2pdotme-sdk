import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { readFeeConfigMulticall, readOrderMulticall } from "../contracts/order-processor";
import { noopLogger } from "../lib";
import { validate } from "../validation";
import { type ApproveUsdcAction, createApproveUsdcAction } from "./actions/approve-usdc";
import { type CancelOrderAction, createCancelOrderAction } from "./actions/cancel-order";
import { createPlaceOrderAction, type PlaceOrderAction } from "./actions/place-order";
import { createRaiseDisputeAction, type RaiseDisputeAction } from "./actions/raise-dispute";
import {
	createSetSellOrderUpiAction,
	type SetSellOrderUpiAction,
} from "./actions/set-sell-order-upi";
import { OrdersError } from "./errors";
import { createOrderRouter } from "./internal/routing/client";
import { normalizeContractOrder } from "./normalize";
import { createInMemoryRelayStore } from "./relay-identity";
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
	// ── Reads ───────────────────────────────────────────────────────────

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

	// ── Writes (layered prepare/execute) ────────────────────────────────

	readonly placeOrder: PlaceOrderAction;
	readonly cancelOrder: CancelOrderAction;
	readonly setSellOrderUpi: SetSellOrderUpiAction;
	readonly raiseDispute: RaiseDisputeAction;
	readonly approveUsdc: ApproveUsdcAction;
}

/**
 * Creates the unified orders client — reads (getOrder, getOrders, getFeeConfig)
 * and circle-routing-backed writes (placeOrder, cancelOrder, setSellOrderUpi,
 * raiseDispute, approveUsdc). The relay identity store defaults to in-memory
 * when none is supplied.
 *
 * For USDC balance / allowance reads use `@p2pdotme/sdk/profile` (those are
 * user-scoped and live there).
 */
export function createOrders(config: OrdersConfig): OrdersClient {
	const { publicClient, diamondAddress, usdcAddress, subgraphUrl, relayIdentity } = config;
	const logger = config.logger ?? noopLogger;
	const relayIdentityStore = config.relayIdentityStore ?? createInMemoryRelayStore();

	const orderRouter = createOrderRouter({
		publicClient,
		subgraphUrl,
		contractAddress: diamondAddress,
		logger,
	});

	return {
		// ── Reads ─────────────────────────────────────────────────────────
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

		// ── Writes ────────────────────────────────────────────────────────
		placeOrder: createPlaceOrderAction({
			publicClient,
			diamondAddress,
			orderRouter,
			relayIdentityStore,
			relayIdentity,
		}),
		cancelOrder: createCancelOrderAction({ publicClient, diamondAddress }),
		setSellOrderUpi: createSetSellOrderUpiAction({
			publicClient,
			diamondAddress,
			relayIdentityStore,
			relayIdentity,
		}),
		raiseDispute: createRaiseDisputeAction({ publicClient, diamondAddress }),
		approveUsdc: createApproveUsdcAction({ publicClient, diamondAddress, usdcAddress }),
	};
}
