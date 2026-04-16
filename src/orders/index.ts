// ── Main entry point ────────────────────────────────────────────────────

export { createOrders, type OrdersClient } from "./client";

// ── Errors ──────────────────────────────────────────────────────────────

export { OrdersError, type OrdersErrorCode } from "./errors";

// ── Domain types ────────────────────────────────────────────────────────

export type {
	DisputeStatus,
	ExecuteBase,
	FeeConfig,
	Order,
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
	PlaceOrderParams,
	RaiseDisputeParams,
	SetSellOrderUpiParams,
} from "./validation";

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
