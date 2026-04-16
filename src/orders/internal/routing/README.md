# @p2pdotme/sdk/order-routing

Circle selection for P2P.me orders. Fetches circles from a subgraph, selects the best one via epsilon-greedy algorithm, and validates on-chain eligibility. Returns a `circleId` for consumers to use in their own `placeOrder` / `assignMerchants` calls.

## Usage

### React (recommended)

```tsx
import { SdkProvider, useOrderRouter } from "@p2pdotme/sdk/react";
import { parseUnits } from "viem";

function App() {
  return (
    <SdkProvider
      publicClient={publicClient}
      subgraphUrl={SUBGRAPH_URL}
      diamondAddress={DIAMOND_ADDRESS}
      usdcAddress={USDC_ADDRESS}
    >
      <OrderFlow />
    </SdkProvider>
  );
}

function OrderFlow() {
  const router = useOrderRouter();

  async function handleRoute() {
    const result = await router.selectCircle({
      currency: "INR",
      user: "0xUserAddress",
      usdtAmount: parseUnits("10", 6),
      fiatAmount: parseUnits("850", 6),
      orderType: 0n, // 0 = BUY, 1 = SELL, 2 = PAY
      preferredPCConfigId: 0n,
    });

    result.match(
      (circleId) => console.log("Selected circle:", circleId),
      (error) => console.error(`[${error.code}] ${error.message}`),
    );
  }
}
```

## API

### `createOrderRouter(config)`

Creates an `OrderRouter` instance.

| Config | Type | Description |
|--------|------|-------------|
| `subgraphUrl` | `string` | GraphQL endpoint for circle data |
| `publicClient` | `PublicClientLike` | viem public client (only needs `readContract`) |
| `contractAddress` | `Address` | Diamond proxy address |
| `logger` | `Logger` | Optional logger |

### `router.selectCircle(params)`

Returns `ResultAsync<bigint, OrderRoutingError>` — the selected circle ID.

| Param | Type | Description |
|-------|------|-------------|
| `currency` | `string` | Currency code (e.g. `"INR"`, `"BRL"`) |
| `user` | `Address` | User's wallet address |
| `usdtAmount` | `bigint` | USDC amount (6 decimals) |
| `fiatAmount` | `bigint` | Fiat amount (6 decimals) |
| `orderType` | `bigint` | `0n` = BUY, `1n` = SELL, `2n` = PAY |
| `preferredPCConfigId` | `bigint` | Preferred payment channel config ID |

## Epsilon-Greedy Algorithm

- **75% exploit** — pick from active circles, weighted by raw `circleScore`
- **25% explore** — pick from all eligible circles with status-aware weights:
  - `active` → score
  - `bootstrap` → min(score, 25)
  - `paused` → score × 0.3
- Retries up to 3 times if on-chain eligibility check fails, removing failed circles from the pool
- Subgraph fetches have a 10s timeout with 3 retries and linear backoff for transient failures

## Errors

All methods return `ResultAsync<T, OrderRoutingError>` — no thrown exceptions.

| Code | Description |
|------|-------------|
| `NO_ELIGIBLE_CIRCLES` | No circles match currency or pass validation |
| `SUBGRAPH_ERROR` | GraphQL query failed or returned errors |
| `SUBGRAPH_NOT_CONFIGURED` | Missing subgraph URL |
| `VALIDATION_ERROR` | Input validation failed (Zod) |
| `CONTRACT_READ_ERROR` | On-chain eligibility check failed |

