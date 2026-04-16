# @p2pdotme/sdk/prices

Currency and protocol-config reads for P2P.me. Everything in this module is **currency-scoped** — no user context, no wallet.

## Usage

### React

```tsx
import { SdkProvider, usePrices } from "@p2pdotme/sdk/react";

function App() {
  return (
    <SdkProvider
      publicClient={publicClient}
      subgraphUrl={SUBGRAPH_URL}
      diamondAddress={DIAMOND_ADDRESS}
      usdcAddress={USDC_ADDRESS}
    >
      <PriceTicker />
    </SdkProvider>
  );
}

function PriceTicker() {
  const prices = usePrices();

  async function fetchPrice() {
    const result = await prices.getPriceConfig({ currency: "INR" });
    result.match(
      ({ buyPrice, sellPrice }) => console.log({ buyPrice, sellPrice }),
      (error) => console.error(`[${error.code}] ${error.message}`),
    );
  }
}
```

### Non-React

```ts
import { createPrices } from "@p2pdotme/sdk/prices";

const prices = createPrices({
  publicClient,
  diamondAddress: DIAMOND_ADDRESS,
});
```

## API

### `createPrices(config)`

| Config | Type | Description |
|--------|------|-------------|
| `publicClient` | `PublicClientLike` | viem public client (needs `readContract`) |
| `diamondAddress` | `Address` | Diamond proxy address |

### `prices.getPriceConfig(params)` → `ResultAsync<PriceConfig, PricesError>`

Buy/sell price config for a currency.

| Param | Type |
|-------|------|
| `currency` | `CurrencyType` (e.g. `"INR"`, `"BRL"`) |

```ts
interface PriceConfig {
  readonly buyPrice: bigint;
  readonly sellPrice: bigint;
  readonly buyPriceOffset: bigint;
  readonly baseSpread: bigint;
}
```

All fields are 6-decimal `bigint`s.

### `prices.getRpPerUsdtLimitRational(params)` → `ResultAsync<RpPerUsdtLimit, PricesError>`

RP-to-USDC limit ratio for a currency.

| Param | Type |
|-------|------|
| `currency` | `CurrencyType` |

```ts
interface RpPerUsdtLimit {
  readonly numerator: bigint;
  readonly denominator: bigint;
  /** denominator / numerator, as a number. 0 when numerator is 0n. */
  readonly multiplier: number;
}
```

## Errors

```ts
type PricesErrorCode = "VALIDATION_ERROR" | "CONTRACT_READ_ERROR";
```

## Example

See [`example/fetch-inr-price.ts`](../../example/fetch-inr-price.ts) for a runnable demo.
