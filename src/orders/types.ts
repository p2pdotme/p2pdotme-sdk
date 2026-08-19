import type { Address, TransactionReceipt, WalletClient } from "viem";
import type { Logger } from "../lib";
import type { PublicClientLike } from "../types";
import type { RelayIdentity, RelayIdentityStore } from "./relay-identity";

export type {
	GetFeeConfigParams,
	GetOrderParams,
	GetOrdersParams,
	GetPlacementLimitsParams,
} from "./validation";

// ── Domain types ────────────────────────────────────────────────────────

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

	/**
	 * Encrypted UPI / payment address that the merchant published for this order
	 * (set when the merchant accepts a buy order). Empty string until set.
	 * Decrypt with `decryptPaymentAddress`.
	 */
	encUpi: string;
	/**
	 * Encrypted merchant UPI for the seller-side flow (set by `setSellOrderUpi`).
	 * Empty string until set.
	 */
	encMerchantUpi: string;
	/** Public key associated with the order, used for ECIES encryption setup. */
	pubkey: string;
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

/**
 * Whether a daily placement cap is actually in force.
 * - `enforced` — a cap is set and the contract will reject placements past it.
 * - `unlimited` — the cap is explicitly zero, which the contract reads as no
 *   cap at all (sell/pay only; a zero buy cap blocks every buy instead).
 * - `unknown` — no cap has been indexed yet, so nothing here should be shown
 *   as a limit. Let the contract be the judge.
 */
export type PlacementLimitState = "enforced" | "unlimited" | "unknown";

/**
 * One daily placement bucket. `used` counts every order placed today INCLUDING
 * ones that were later cancelled — the on-chain counter is never credited back,
 * so cancelling does not free up an allowance.
 */
export interface PlacementBucket {
	used: number;
	/** The cap itself. Null unless `state` is `enforced`. */
	limit: number | null;
	/** `limit - used`, floored at zero. Null unless `state` is `enforced`. */
	remaining: number | null;
	state: PlacementLimitState;
}

/**
 * Per-user daily order placement allowances, read from the subgraph. SELL and
 * PAY draw on one shared bucket; BUY has its own. Both reset at UTC midnight.
 */
export interface PlacementLimits {
	/** UTC day these counts belong to (unix seconds / 86400). */
	dayIndex: number;
	/** Unix seconds at which the buckets reset (the next UTC midnight). */
	resetsAt: number;
	buy: PlacementBucket;
	sellPay: PlacementBucket;
}

// ── Client config ───────────────────────────────────────────────────────

export interface OrdersConfig {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
	readonly usdcAddress: Address;
	readonly subgraphUrl: string;
	readonly relayIdentityStore?: RelayIdentityStore;
	readonly relayIdentity?: RelayIdentity;
	readonly logger?: Logger;
}

// ── Tx envelope (writes) ────────────────────────────────────────────────

export interface PreparedTxMeta {
	readonly circleId?: bigint;
	readonly relayIdentity?: RelayIdentity;
}

export interface PreparedTx {
	readonly to: `0x${string}`;
	readonly data: `0x${string}`;
	readonly value: bigint;
	readonly meta?: PreparedTxMeta;
}

export interface TxResultMeta extends PreparedTxMeta {
	/**
	 * Populated on `placeOrder.execute({ waitForReceipt: true })` — the orderId
	 * parsed from the `OrderPlaced` event in the receipt's logs. Undefined when
	 * `waitForReceipt` is not set (no receipt means no logs to parse).
	 */
	readonly orderId?: bigint;
}

export interface TxResult {
	readonly hash: `0x${string}`;
	readonly receipt?: TransactionReceipt;
	readonly meta?: TxResultMeta;
}

export interface ExecuteBase {
	readonly walletClient: WalletClient;
	readonly waitForReceipt?: boolean;
}

export type OrderEvent =
	| {
			readonly type: "placed";
			readonly orderId: bigint;
			readonly user: Address;
			readonly orderType: 0 | 1 | 2;
			readonly blockNumber: bigint;
			readonly txHash: `0x${string}`;
	  }
	| {
			readonly type: "accepted";
			readonly orderId: bigint;
			readonly merchant: Address;
			readonly blockNumber: bigint;
			readonly txHash: `0x${string}`;
	  }
	| {
			readonly type: "paid";
			readonly orderId: bigint;
			readonly blockNumber: bigint;
			readonly txHash: `0x${string}`;
	  }
	| {
			readonly type: "completed";
			readonly orderId: bigint;
			readonly blockNumber: bigint;
			readonly txHash: `0x${string}`;
	  }
	| {
			readonly type: "cancelled";
			readonly orderId: bigint;
			readonly blockNumber: bigint;
			readonly txHash: `0x${string}`;
	  };
