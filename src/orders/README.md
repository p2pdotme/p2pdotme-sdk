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

Per-currency small-order threshold + fixed fees, read via multicall. The fee is
per order type on-chain, so all three are returned — pick the one matching the
order you are placing. They are not interchangeable: e.g. ARS is `25000` on BUY
and `50000` on SELL.

**The BUY fee is charged in fiat, not USDC.** On BUY the contract leaves the USDC
amount alone and inflates `actualFiatAmount` instead, so `smallOrderFixedFeeBuy`
must never be added to a USDC approval or shown as a USDC charge. Only SELL and
PAY add to the USDC pulled. Use these values for quoting *before* placement; for
the approval itself see `orders.placeOrder` below.

```ts
interface FeeConfig {
  smallOrderThreshold: bigint;    // orders ≤ this are billed the fixed fee
  smallOrderFixedFeeBuy: bigint;  // 6 decimals
  smallOrderFixedFeeSell: bigint;
  smallOrderFixedFeePay: bigint;
}
```

### `orders.getPlacementLimits({ userAddress })` → `ResultAsync<PlacementLimits, OrdersError>`

The user's gross daily placement allowances, from the subgraph. BUY has its own
bucket; SELL and PAY share one. Both reset at UTC midnight.

```ts
interface PlacementLimits {
  dayIndex: number;   // unix seconds / 86400 — the contract's own day key
  resetsAt: number;   // unix seconds of the next UTC midnight
  buy: PlacementBucket;
  sellPay: PlacementBucket;
}

interface PlacementBucket {
  used: number;              // includes orders that were later cancelled
  limit: number | null;      // null unless state is "enforced"
  remaining: number | null;  // null unless state is "enforced"
  state: "enforced" | "unlimited" | "unknown";
}
```

**Cancelling does not give a placement back.** The on-chain counters are
incremented at placement and never credited back, so a place-and-cancel loop
still burns the daily allowance. Surface that in the UI or users will read a
shrinking count as a bug.

`state` is `unlimited` only for a sell/pay cap explicitly set to `0`, which the
contract reads as no cap; a `0` buy cap blocks every buy instead and stays
`enforced`. `unknown` means no cap has been indexed yet — show the counts, but
not a limit.

This read is **advisory**. The subgraph lags the chain, so use it to warn or
disable a button, never as the final word: the contract decides, and rejects
with `DAILY_SELL_ORDER_PLACEMENT_LIMIT_EXCEEDED` /
`DAILY_BUY_ORDER_PLACEMENT_LIMIT_EXCEEDED`.

In React, prefer `usePlacementLimits` from `@p2pdotme/sdk/react` — it keeps the
counts fresh across address changes and the UTC-midnight reset, and hands back a
`refresh()` to call once a placement lands.

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

**SELL and PAY require an explicit USDC approval** — the Diamond pulls USDC
via `transferFrom`, but inside `setSellOrderUpiWithFiat`, not `placeOrder`. Call
`orders.approveUsdc.execute({ amount })` any time before `setSellOrderUpiWithFiat`
— simplest is right after `placeOrder` is mined, so the approve tx does not eat
into the accept → hand-off window that counts against the order's expiry. There
is no auto-approve flag.

> **Approve `order.actualUsdcAmount`, not the bare `amount` — right after
> placement.** `placeOrder` pulls no USDC; the only `transferFrom` on this
> path is inside `setSellOrderUpiWithFiat`, and it pulls
> `additionalOrderDetails[orderId].actualUsdtAmount`, which the contract froze at
> placement as `amount + smallOrderFixedFee{Sell,Pay}` for an order at or below
> the currency's `smallOrderThreshold`.
>
> If the allowance covers only `amount`, that pull reverts — and
> `setSellOrderUpiWithFiat` catches the revert and **cancels the order** instead of
> failing. The user sees an unexplained cancellation with their USDC untouched
> and no error to show them. This is the single most common SELL integration bug.
>
> ```ts
> const { meta } = (await orders.placeOrder.execute({ ...p, waitForReceipt: true }))._unsafeUnwrap();
> const order = (await orders.getOrder({ orderId: meta!.orderId! }))._unsafeUnwrap();
> await orders.approveUsdc.execute({ walletClient, amount: order.actualUsdcAmount });
> // …then setSellOrderUpiWithFiat once a merchant has accepted.
> ```
>
> Use `orders.getOrder`, which reads the Diamond. `orders.getOrders` comes from
> the subgraph, where `actualUsdcAmount` reads `0` until the placement event is
> indexed.
>
> Read the field; don't recompute it from `getFeeConfig`. The contract uses the
> fee that was in force at *placement*, so a config change between placement and
> the UPI call would make a recomputed figure wrong. Approving an unlimited
> allowance once instead is also safe.
>
> Sanity-check `order.actualUsdcAmount >= order.usdcAmount` before approving. It is `0` for
> orders placed before `additionalOrderDetails` existed, and `_cancelOrder`
> zeroes it on cancellation — approving a short amount would trip the exact
> failure this is meant to avoid.
>
> **PAY with a non-zero `updatedFiatAmount`:** the third argument to
> `setSellOrderUpiWithFiat` is **fiat**, not USDC. When it differs from
> `order.fiatAmount`, the Diamond rewrites the order and re-derives the pull, so
> a previously-read `actualUsdcAmount` is not merely stale — it can be *lower*
> than the new pull. The new pull is the USDC at the order's own rate, rounded
> **up**, **plus the small-order PAY fee again** if that USDC is at or below the
> threshold — and this time it is the fee configured *now*, not at placement:
>
> ```ts
> const order = (await orders.getOrder({ orderId }))._unsafeUnwrap();
> const fee = (await orders.getFeeConfig({ currency }))._unsafeUnwrap(); // the order's currency code
> const sellPrice = (order.fiatAmount * 1_000_000n) / order.usdcAmount; // floored, as on-chain
> const newUsdc = (updatedFiatAmount * 1_000_000n + sellPrice - 1n) / sellPrice; // rounded up
> const pull = newUsdc + (newUsdc <= fee.smallOrderThreshold ? fee.smallOrderFixedFeePay : 0n);
> await orders.approveUsdc.execute({ walletClient, amount: pull });
> ```
>
> Approving only `newUsdc` leaves the allowance fee-short and the order is
> cancelled — the same failure as above. An unlimited allowance avoids the
> arithmetic entirely.

**Meta on success:**
- `meta.circleId` — circle selected by the internal epsilon-greedy router.
- `meta.relayIdentity` — the identity that signed the payload.
- `meta.orderId` — parsed from the `OrderPlaced` event in the receipt. **Requires `waitForReceipt: true`**; best-effort (decoding failures return the result unchanged, never an error).

### `orders.cancelOrder`

| Param | Type |
|-------|------|
| `orderId` | `bigint` |

### `orders.setSellOrderUpiWithFiat`

Used on SELL and PAY once the merchant has accepted. Encrypts `paymentAddress` with the merchant's pubkey before encoding calldata and flips the order to PAID. A PAY-order amount update is expressed as the exact **fiat** the merchant must settle; the Diamond derives the USDC to pull from the order's implied rate, rounding up so it always covers the fiat.

> The Diamond also exposes a legacy `setSellOrderUpi(orderId, encUpi, updatedUsdcAmount)` that fixes the USDC leg and leaves the settled fiat a rounded figure. The SDK no longer wraps it (removed in 1.3.0); use this action instead.

| Param | Type |
|-------|------|
| `orderId` | `bigint` |
| `paymentAddress` | `string` (plaintext, e.g. `"user@upi"`) |
| `merchantPublicKey` | `string` (128 hex chars, no `0x04` prefix) |
| `updatedFiatAmount` | `bigint` (6-dec scaled like `Order.fiatAmount`; PAY only; `0n` keeps the original) |

`meta.relayIdentity` is surfaced on the result.

### `orders.raiseDispute`

| Param | Type |
|-------|------|
| `orderId` | `bigint` |
| `redactTransId` | `bigint` (evidence identifier — SDK doesn't interpret) |

### `orders.approveUsdc`

Wrapper over `IERC20(usdc).approve(diamond, amount)` — must be in place before
`setSellOrderUpiWithFiat` on SELL/PAY. Pass `order.actualUsdcAmount` (see the note under
`orders.placeOrder`); this action does not add the small-order fee for you.

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
| `ENCRYPTION_FAILED` | `setSellOrderUpiWithFiat` |
| `RELAY_IDENTITY_CORRUPT` · `RELAY_IDENTITY_STORE_FAILED` | `placeOrder` / `setSellOrderUpiWithFiat` |
| `TX_SUBMISSION_FAILED` · `RECEIPT_TIMEOUT` · `TX_REVERTED` | any `execute()` |

## Example

See [`example/`](../../example/) for runnable BUY / SELL / PAY walkthroughs.
