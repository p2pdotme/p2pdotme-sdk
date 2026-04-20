# @p2pdotme/sdk/orders

The full order surface for P2P.me — reads (contract + subgraph), writes (layered `prepare`/`execute`), ECIES crypto, and a storage-agnostic relay identity resolver. Circle-selection routing lives inside as an internal implementation detail of `placeOrder`.

USDC balance / allowance reads live in [`@p2pdotme/sdk/profile`](../profile/README.md) — use `profile.getUsdcAllowance({ owner })` to pre-flight before a SELL/PAY.

## Usage

```ts
import { createOrders } from "@p2pdotme/sdk/orders";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });
const walletClient = createWalletClient({
  chain: base,
  transport: http(RPC_URL),
  account: privateKeyToAccount(PRIVATE_KEY),
});

const orders = createOrders({
  publicClient,
  diamondAddress: DIAMOND_ADDRESS,
  usdcAddress: USDC_ADDRESS,
  subgraphUrl: SUBGRAPH_URL,
});

// Read
const order = await orders.getOrder({ orderId: 42n });

// Write — BUY
const placed = await orders.placeOrder.execute({
  walletClient,
  waitForReceipt: true,
  orderType: 0, // 0 = BUY, 1 = SELL, 2 = PAY
  currency: "INR",
  user: account.address,
  recipientAddr: account.address,
  amount: parseUnits("10", 6),
  fiatAmount: parseUnits("850", 6),
  fiatAmountLimit: 0n,
});
// placed.value = { hash, receipt?, meta: { orderId, circleId, relayIdentity } }
```

## `createOrders(config)`

| Config | Type | Required | Description |
|--------|------|----------|-------------|
| `publicClient` | `PublicClientLike` | ✓ | viem public client (`readContract`, `multicall`, `waitForTransactionReceipt`) |
| `diamondAddress` | `Address` | ✓ | Diamond proxy |
| `usdcAddress` | `Address` | ✓ | USDC token |
| `subgraphUrl` | `string` | ✓ | GraphQL endpoint for order data |
| `relayIdentityStore` | `RelayIdentityStore` | | Defaults to in-memory. Use `createLocalStorageRelayStore()` in browsers to persist. |
| `relayIdentity` | `RelayIdentity` | | Pre-built identity; wins over the store. |
| `logger` | `Logger` | | Optional logger. |

## Reads

### `orders.getOrder({ orderId })` → `ResultAsync<Order, OrdersError>`

Single order via Diamond multicall (with a parallel-`readContract` fallback).

### `orders.getOrders({ userAddress, skip?, limit? })` → `ResultAsync<Order[], OrdersError>`

Paginated list of a user's orders from the subgraph, newest first. `skip` defaults to `0`; `limit` defaults to `20`, max `100`.

### `orders.getFeeConfig({ currency })` → `ResultAsync<FeeConfig, OrdersError>`

Per-currency small-order threshold + fixed fee, read via multicall.

```ts
interface FeeConfig {
  smallOrderThreshold: bigint;  // orders ≤ this are billed the fixed fee
  smallOrderFixedFee: bigint;   // 6 decimals
}
```

## Writes (layered `prepare` / `execute`)

Every write action has two methods with matching params:

- **`action.prepare(params)`** → `ResultAsync<PreparedTx, OrdersError>` where `PreparedTx = { to, data, value, meta? }`. Pure — no wallet.
- **`action.execute({ walletClient, waitForReceipt?, ...params })`** → `ResultAsync<TxResult, OrdersError>` where `TxResult = { hash, receipt?, meta? }`. `prepare()` + `walletClient.sendTransaction` + optional `waitForTransactionReceipt`.

### `orders.placeOrder`

| Param | Type | Notes |
|-------|------|-------|
| `orderType` | `0 \| 1 \| 2` | 0 = BUY, 1 = SELL, 2 = PAY |
| `currency` | `CurrencyCode` | — |
| `user` | `Address` | Placer |
| `recipientAddr` | `Address` | Where USDC goes (BUY) / fiat recipient (SELL/PAY) |
| `amount` | `bigint` | USDC (6 decimals) |
| `fiatAmount` | `bigint` | Fiat (6 decimals) |
| `fiatAmountLimit` | `bigint?` | Slippage bound; `0n` = disabled |
| `preferredPaymentChannelConfigId` | `bigint?` | Optional channel pinning |
| `pubKey` | `string?` | Overrides the auto-generated relay pubkey |

**SELL and PAY require an explicit USDC approval first** — the Diamond pulls USDC via `transferFrom`. Call `orders.approveUsdc.execute({ amount })` before `placeOrder`. There is no auto-approve flag.

**Meta on success:**
- `meta.circleId` — circle selected by the internal epsilon-greedy router.
- `meta.relayIdentity` — the identity that signed the payload.
- `meta.orderId` — parsed from the `OrderPlaced` event in the receipt. **Requires `waitForReceipt: true`**; best-effort (decoding failures return the result unchanged, never an error).

### `orders.cancelOrder`

| Param | Type |
|-------|------|
| `orderId` | `bigint` |

### `orders.setSellOrderUpi`

Used on SELL and PAY once the merchant has accepted. Encrypts `paymentAddress` with the merchant's pubkey before encoding calldata.

| Param | Type |
|-------|------|
| `orderId` | `bigint` |
| `paymentAddress` | `string` (plaintext, e.g. `"user@upi"`) |
| `merchantPublicKey` | `string` (128 hex chars, no `0x04` prefix) |
| `updatedAmount` | `bigint` (PAY only; `0n` keeps the original) |

`meta.relayIdentity` is surfaced on the result.

### `orders.raiseDispute`

| Param | Type |
|-------|------|
| `orderId` | `bigint` |
| `redactTransId` | `bigint` (evidence identifier — SDK doesn't interpret) |

### `orders.approveUsdc`

Wrapper over `IERC20(usdc).approve(diamond, amount)` — call before SELL/PAY placeOrder.

| Param | Type |
|-------|------|
| `amount` | `bigint` |

## Relay identity

`createRelayIdentity()` is a pure function (no side effects). Persistence goes through a pluggable `RelayIdentityStore`:

```ts
interface RelayIdentityStore {
  get(): Promise<RelayIdentity | null>;
  set(identity: RelayIdentity): Promise<void>;
}
```

Shipped adapters:

```ts
import {
  createInMemoryRelayStore,     // default when no store is configured
  createLocalStorageRelayStore, // browser-only, opt-in
} from "@p2pdotme/sdk/orders";
```

Resolution order inside the SDK when an action needs a relay identity:

1. `config.relayIdentity` — used as-is.
2. `config.relayIdentityStore.get()` — used if non-null.
3. Otherwise generate via `createRelayIdentity()`, call `store.set(identity)`, use it.

Corrupt stored identity (fails Zod validation) → `RELAY_IDENTITY_CORRUPT`. The SDK never silently regenerates.

## Crypto helpers

```ts
import {
  encryptPaymentAddress,
  decryptPaymentAddress,
  cipherParse,
  cipherStringify,
} from "@p2pdotme/sdk/orders";
```

ECIES over secp256k1 with AES-GCM, wire-compatible with `eth-crypto`. `decryptPaymentAddress` returns just the plaintext message (the inner `{message, signature}` envelope is unwrapped for you).

## `Order` shape

```ts
interface Order {
  orderId: bigint;
  type: "buy" | "sell" | "pay";
  status: "placed" | "accepted" | "paid" | "completed" | "cancelled";

  usdcAmount: bigint;
  fiatAmount: bigint;
  actualUsdcAmount: bigint;
  actualFiatAmount: bigint;
  currency: string;              // decoded from bytes32

  user: Address;
  recipient: Address;
  acceptedMerchant: Address;

  placedAt: bigint;              // unix seconds
  acceptedAt: bigint;
  paidAt: bigint;
  completedAt: bigint;

  circleId: bigint;

  fixedFeePaid: bigint;
  tipsPaid: bigint;

  disputeStatus: "none" | "open" | "resolved";
}
```

## `OrdersError` codes

Single unified error surface across reads and writes.

| Code | Raised by |
|------|-----------|
| `VALIDATION_ERROR` | any |
| `INVALID_ORDER_ID` · `INVALID_GET_ORDERS_PARAMS` · `INVALID_FEE_CONFIG_PARAMS` | reads |
| `ORDER_NOT_FOUND` · `MALFORMED_ORDER` · `CONTRACT_READ_FAILED` | reads |
| `SUBGRAPH_REQUEST_FAILED` · `SUBGRAPH_VALIDATION_FAILED` | `getOrders` |
| `CIRCLE_SELECTION_FAILED` | `placeOrder` |
| `ENCRYPTION_FAILED` | `setSellOrderUpi` |
| `RELAY_IDENTITY_CORRUPT` · `RELAY_IDENTITY_STORE_FAILED` | `placeOrder` / `setSellOrderUpi` |
| `TX_SUBMISSION_FAILED` · `RECEIPT_TIMEOUT` · `TX_REVERTED` | any `execute()` |

## Example

See [`example/`](../../example/) for runnable BUY / SELL / PAY walkthroughs.
