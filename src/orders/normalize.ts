import { err, ok, Result } from "neverthrow";
import { type Address, hexToString, isAddressEqual, zeroAddress } from "viem";
import { DISPUTE_STATUS, ORDER_STATUS, ORDER_TYPE } from "../constants";
import type { RawContractAdditionalDetails, RawContractOrder } from "../contracts/order-processor";
import { OrdersError } from "./errors";
import type { DisputeStatus, Order, OrderStatus, OrderType } from "./types";
import type { RawSubgraphOrder } from "./validation";

// Maps from on-chain numeric enum → public string label. Keyed by the shared
// `src/constants/orders.constant.ts` values so the numeric source of truth
// lives in one place; string labels are the public API concern of this module.

/** OrderType enum (declaration order in OrderProcessorStorage.sol): BUY, SELL, PAY. */
const ORDER_TYPE_MAP: Record<number, OrderType | undefined> = {
	[ORDER_TYPE.BUY]: "buy",
	[ORDER_TYPE.SELL]: "sell",
	[ORDER_TYPE.PAY]: "pay",
};

/** OrderStatus enum (declaration order): PLACED, ACCEPTED, PAID, COMPLETED, CANCELLED. */
const ORDER_STATUS_MAP: Record<number, OrderStatus | undefined> = {
	[ORDER_STATUS.PLACED]: "placed",
	[ORDER_STATUS.ACCEPTED]: "accepted",
	[ORDER_STATUS.PAID]: "paid",
	[ORDER_STATUS.COMPLETED]: "completed",
	[ORDER_STATUS.CANCELLED]: "cancelled",
};

/** DisputeStatus enum (declaration order): DEFAULT, RAISED, SETTLED. */
const DISPUTE_STATUS_MAP: Record<number, DisputeStatus | undefined> = {
	[DISPUTE_STATUS.NONE]: "none",
	[DISPUTE_STATUS.OPEN]: "open",
	[DISPUTE_STATUS.RESOLVED]: "resolved",
};

function malformed(field: string, value: unknown, context?: Record<string, unknown>): OrdersError {
	return new OrdersError(`Unknown ${field}: ${String(value)}`, {
		code: "MALFORMED_ORDER",
		context: { field, value, ...context },
	});
}

function mapOrderType(v: number, ctx?: Record<string, unknown>): Result<OrderType, OrdersError> {
	const t = ORDER_TYPE_MAP[v];
	return t ? ok(t) : err(malformed("orderType", v, ctx));
}

function mapOrderStatus(
	v: number,
	ctx?: Record<string, unknown>,
): Result<OrderStatus, OrdersError> {
	const s = ORDER_STATUS_MAP[v];
	return s ? ok(s) : err(malformed("status", v, ctx));
}

function mapDisputeStatus(
	v: number,
	ctx?: Record<string, unknown>,
): Result<DisputeStatus, OrdersError> {
	const s = DISPUTE_STATUS_MAP[v];
	return s ? ok(s) : err(malformed("disputeStatus", v, ctx));
}

/** Decodes a bytes32 currency code (right-padded zeros) to the human-readable string. */
function decodeCurrency(hex: string): string {
	return hexToString(hex as `0x${string}`, { size: 32 }).replaceAll("\x00", "");
}

/**
 * Normalizes the two raw contract structs into the public `Order` shape.
 * Resolves to `null` if the contract returned a zeroed struct (order not found),
 * or to `MALFORMED_ORDER` if an enum field is out of range.
 */
export function normalizeContractOrder(
	raw: RawContractOrder,
	details: RawContractAdditionalDetails,
): Result<Order | null, OrdersError> {
	if (raw.id === 0n && isAddressEqual(raw.user, zeroAddress)) return ok(null);
	const ctx = { orderId: raw.id.toString() };
	return Result.combine([
		mapOrderType(raw.orderType, ctx),
		mapOrderStatus(raw.status, ctx),
		mapDisputeStatus(raw.disputeInfo.status, ctx),
	]).map(([type, status, disputeStatus]) => ({
		orderId: raw.id,
		type,
		status,
		usdcAmount: raw.amount,
		fiatAmount: raw.fiatAmount,
		actualUsdcAmount: details.actualUsdtAmount,
		actualFiatAmount: details.actualFiatAmount,
		currency: decodeCurrency(raw.currency),
		user: raw.user,
		recipient: raw.recipientAddr,
		acceptedMerchant: raw.acceptedMerchant,
		placedAt: raw.placedTimestamp,
		acceptedAt: details.acceptedTimestamp,
		paidAt: details.paidTimestamp,
		completedAt: raw.completedTimestamp,
		circleId: raw.circleId,
		fixedFeePaid: details.fixedFeePaid,
		tipsPaid: details.tipsPaid,
		disputeStatus,
		encUpi: raw.encUpi,
		encMerchantUpi: raw.encMerchantUpi,
		pubkey: raw.pubkey,
	}));
}

/** Normalizes a subgraph `Orders` entity into the public `Order` shape. */
export function normalizeSubgraphOrder(raw: RawSubgraphOrder): Result<Order, OrdersError> {
	const ctx = { orderId: raw.orderId };
	return Result.combine([
		mapOrderType(raw.type, ctx),
		mapOrderStatus(raw.status, ctx),
		mapDisputeStatus(raw.disputeStatus, ctx),
	]).map(([type, status, disputeStatus]) => ({
		orderId: BigInt(raw.orderId),
		type,
		status,
		usdcAmount: BigInt(raw.usdcAmount),
		fiatAmount: BigInt(raw.fiatAmount),
		actualUsdcAmount: BigInt(raw.actualUsdcAmount),
		actualFiatAmount: BigInt(raw.actualFiatAmount),
		currency: decodeCurrency(raw.currency),
		user: raw.userAddress as Address,
		recipient: raw.usdcRecipientAddress as Address,
		acceptedMerchant: raw.acceptedMerchantAddress as Address,
		placedAt: BigInt(raw.placedAt),
		acceptedAt: BigInt(raw.acceptedAt),
		paidAt: BigInt(raw.paidAt),
		completedAt: BigInt(raw.completedAt),
		circleId: BigInt(raw.circleId),
		fixedFeePaid: BigInt(raw.fixedFeePaid),
		tipsPaid: BigInt(raw.tipsPaid),
		disputeStatus,
		// Subgraph entity does not currently expose these encryption fields;
		// consumers needing them should fall back to the contract via getOrder.
		encUpi: "",
		encMerchantUpi: "",
		pubkey: "",
	}));
}
