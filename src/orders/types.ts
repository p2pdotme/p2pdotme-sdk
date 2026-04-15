import type { Address } from "viem";
import type { Logger } from "../lib";
import type { PublicClientLike } from "../types";

export type {
	GetFeeConfigParams,
	GetOrderParams,
	GetOrdersParams,
} from "./validation";

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

/**
 * Per-currency small-order fee config read from the Diamond.
 * Amounts are 6-decimal bigints.
 */
export interface FeeConfig {
	/** Order amounts at or below this threshold are billed the fixed fee. */
	smallOrderThreshold: bigint;
	/** Fixed fee applied to small orders (6 decimals). */
	smallOrderFixedFee: bigint;
}

export interface OrdersConfig {
	publicClient: PublicClientLike;
	diamondAddress: Address;
	subgraphUrl: string;
	logger?: Logger;
}
