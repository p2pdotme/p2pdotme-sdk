import type { Address } from "viem";
import type { Logger } from "../lib";
import type { PublicClientLike } from "../types";

export type { GetOrderParams, GetOrdersParams } from "./validation";

export type OrderType = "buy" | "sell" | "pay";

export type OrderStatus = "placed" | "accepted" | "paid" | "completed" | "cancelled";

export type DisputeStatus = "none" | "open" | "resolved";

/**
 * Normalized order record returned by both `getOrder` and `getOrders`.
 * Amounts are 6-decimal bigints; timestamps are unix seconds.
 */
export interface Order {
	orderId: bigint;
	type: OrderType;
	status: OrderStatus;

	usdcAmount: bigint;
	fiatAmount: bigint;
	actualUsdcAmount: bigint;
	actualFiatAmount: bigint;
	currency: string;

	user: Address;
	recipient: Address;
	acceptedMerchant: Address;

	placedAt: bigint;
	acceptedAt: bigint;
	paidAt: bigint;
	completedAt: bigint;

	circleId: bigint;

	fixedFeePaid: bigint;
	tipsPaid: bigint;

	disputeStatus: DisputeStatus;
}

export interface OrdersConfig {
	publicClient: PublicClientLike;
	diamondAddress: Address;
	subgraphUrl: string;
	logger?: Logger;
}
