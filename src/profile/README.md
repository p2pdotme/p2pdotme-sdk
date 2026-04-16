# @p2pdotme/sdk/profile

User-scoped reads for P2P.me: USDC balance, USDC allowance to the Diamond, combined balances (USDC + fiat equivalent), and per-address tx limits.

Currency/protocol config (price config, reputation-per-USDC ratio) lives in [`@p2pdotme/sdk/prices`](../prices/README.md).

## Usage

### React

```tsx
import { SdkProvider, useProfile } from "@p2pdotme/sdk/react";

function App() {
  return (
    <SdkProvider
      publicClient={publicClient}
      subgraphUrl={SUBGRAPH_URL}
      diamondAddress={DIAMOND_ADDRESS}
      usdcAddress={USDC_ADDRESS}
    >
      <BalanceDisplay />
    </SdkProvider>
  );
}

function BalanceDisplay() {
  const profile = useProfile();

  async function fetchBalances() {
    const result = await profile.getBalances({
      address: "0xUserAddress",
      currency: "INR",
    });

    result.match(
      ({ usdc, fiat, sellPrice }) => console.log({ usdc, fiat, sellPrice }),
      (error) => console.error(`[${error.code}] ${error.message}`),
    );
  }
}
```

### Non-React

```ts
import { createProfile } from "@p2pdotme/sdk/profile";

const profile = createProfile({
  publicClient,
  diamondAddress: DIAMOND_ADDRESS,
  usdcAddress: USDC_ADDRESS,
});
```

## API

### `createProfile(config)`

| Config | Type | Description |
|--------|------|-------------|
| `publicClient` | `PublicClientLike` | viem public client (needs `readContract`) |
| `diamondAddress` | `Address` | Diamond proxy address |
| `usdcAddress` | `Address` | USDC token address |

### `profile.getUsdcBalance({ address })` → `ResultAsync<bigint, ProfileError>`

Raw USDC balance (6 decimals).

### `profile.getUsdcAllowance({ owner })` → `ResultAsync<bigint, ProfileError>`

Raw USDC allowance `owner → diamond` (6 decimals). Useful as a pre-flight before a SELL/PAY order — if the allowance is less than `amount`, call `orders.approveUsdc.execute({ amount })` first.

### `profile.getBalances({ address, currency })` → `ResultAsync<Balances, ProfileError>`

Parallel USDC + price read with fiat conversion done for you.

```ts
interface Balances {
  readonly usdc: number;       // USDC balance formatted to a number
  readonly fiat: number;       // usdc * sellPrice
  readonly sellPrice: number;  // conversion rate used
}
```

### `profile.getTxLimits({ address, currency })` → `ResultAsync<TxLimits, ProfileError>`

Per-user buy/sell transaction limits (numbers, 6-decimal formatted).

```ts
interface TxLimits {
  readonly buyLimit: number;
  readonly sellLimit: number;
}
```

`currency` is a `CurrencyCode` — any of the supported currency symbols (`"INR"`, `"BRL"`, `"IDR"`, …).

## Errors

```ts
type ProfileErrorCode = "VALIDATION_ERROR" | "CONTRACT_READ_ERROR";
```
