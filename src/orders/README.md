# @p2pdotme/sdk/orders

Order reads for P2P.me. Two methods:

- `getOrder({ orderId })` — single order read from the Diamond via multicall (with a parallel-`readContract` fallback).
- `getOrders({ userAddress, skip?, limit? })` — paginated list of a user's orders from the subgraph, newest first.

Both sources normalize into a single `Order` shape: enum indices become string literals, the `bytes32` currency is decoded to a string, amounts stay as 6-decimal `bigint`s, and timestamps as unix-seconds `bigint`s.

## Usage

```ts
import { createOrders } from "@p2pdotme/sdk/orders";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });

const orders = createOrders({
  publicClient,
  diamondAddress: DIAMOND_ADDRESS,
  subgraphUrl: SUBGRAPH_URL,
});

// Single order via contract multicall.
const one = await orders.getOrder({ orderId: 42n });
one.match(
  (order) => console.log(order.status, order.usdcAmount),
  (error) => console.error(`[${error.code}] ${error.message}`),
);

// User's orders via subgraph (newest first).
const many = await orders.getOrders({
  userAddress: "0xUser",
  skip: 0,
  limit: 20,
});
```

## API

### `createOrders(config)`

| Config | Type | Description |
|--------|------|-------------|
| `publicClient` | `PublicClientLike` | viem public client (needs `readContract` + `multicall`) |
| `diamondAddress` | `Address` | Diamond proxy address |
| `subgraphUrl` | `string` | GraphQL endpoint for order data |
| `logger` | `Logger` | Optional logger |

### `orders.getOrder(params)`

Returns `ResultAsync<Order, OrdersError>`.

| Param | Type | Description |
|-------|------|-------------|
| `orderId` | `bigint` | Positive order id |

Fails with `ORDER_NOT_FOUND` when the contract returns a zeroed struct; with `MALFORMED_ORDER` when a partially-zero struct is returned; with `CONTRACT_READ_FAILED` on transport errors.

### `orders.getOrders(params)`

Returns `ResultAsync<Order[], OrdersError>`. Orders are newest first.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `userAddress` | `Address` | — | User's wallet address |
| `skip` | `number` | `0` | Pagination offset |
| `limit` | `number` | `20` | Page size (max `100`) |

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

## Error codes

`INVALID_ORDER_ID` · `INVALID_GET_ORDERS_PARAMS` · `ORDER_NOT_FOUND` · `MALFORMED_ORDER` · `CONTRACT_READ_FAILED` · `SUBGRAPH_REQUEST_FAILED` · `SUBGRAPH_VALIDATION_FAILED`
