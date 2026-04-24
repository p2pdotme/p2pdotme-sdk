// ── Main entry point ────────────────────────────────────────────────────

export { createOrders, type OrdersClient } from "./client";

// ── Errors ──────────────────────────────────────────────────────────────

export {
	type ContractErrorCode,
	contractErrors,
	hexContractErrors,
	parseContractError,
} from "../contracts/errors";
export { OrdersError, type OrdersErrorCode } from "./errors";

// ── Domain types ────────────────────────────────────────────────────────

export type {
	DisputeStatus,
	ExecuteBase,
	FeeConfig,
	Order,
	OrderEvent,
	OrderStatus,
	OrdersConfig,
	OrderType,
	PreparedTx,
	PreparedTxMeta,
	TxResult,
	TxResultMeta,
} from "./types";

// ── Param types ─────────────────────────────────────────────────────────

export type {
	ApproveUsdcParams,
	CancelOrderParams,
	GetFeeConfigParams,
	GetOrderParams,
	GetOrdersParams,
	PaidBuyOrderParams,
	PlaceOrderParams,
	RaiseDisputeParams,
	SetSellOrderUpiParams,
} from "./validation";

// ── Action types ────────────────────────────────────────────────────────

export type { PaidBuyOrderAction } from "./actions/paid-buy-order";

// ── Watch events ────────────────────────────────────────────────────────

export type { WatchEventsParams } from "./watch-events";

// ── Relay identity ──────────────────────────────────────────────────────

export {
	createInMemoryRelayStore,
	createLocalStorageRelayStore,
	createRelayIdentity,
	type RelayIdentity,
	type RelayIdentityStore,
} from "./relay-identity";

// ── Crypto ──────────────────────────────────────────────────────────────

export {
	cipherParse,
	cipherStringify,
	decryptPaymentAddress,
	encryptPaymentAddress,
} from "./crypto/encryption";
