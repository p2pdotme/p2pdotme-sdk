# @p2pdotme/sdk/profile

Account balance and price configuration reads for P2P.me. Fetches USDC balance, fiat conversion prices, and combined balances from on-chain contracts.

## Usage

### React (recommended)

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
      userAddress: "0xUserAddress",
      currency: "INR",
    });

    result.match(
      (balances) => {
        console.log("USDC:", balances.usdc);
        console.log("Fiat:", balances.fiat);
        console.log("Sell price:", balances.sellPrice);
      },
      (error) => console.error(`[${error.code}] ${error.message}`),
    );
  }
}
```

## API

### `createProfile(config)`

| Config | Type | Description |
|--------|------|-------------|
| `publicClient` | `PublicClientLike` | viem public client (only needs `readContract`) |
| `diamondAddress` | `Address` | Diamond proxy address |
| `usdcAddress` | `Address` | USDC token address |

### `profile.getUsdcBalance(params)`

Returns `ResultAsync<bigint, ProfileError>` — raw USDC balance (6 decimals).

| Param | Type | Description |
|-------|------|-------------|
| `userAddress` | `Address` | Wallet address to query |

### `profile.getPriceConfig(params)`

Returns `ResultAsync<PriceConfig, ProfileError>` — buy/sell prices and spreads.

| Param | Type | Description |
|-------|------|-------------|
| `currency` | `string` | Currency code (e.g. `"INR"`) |

**PriceConfig** fields: `buyPrice`, `sellPrice`, `buyPriceOffset`, `baseSpread` (all `bigint`).

### `profile.getBalances(params)`

Returns `ResultAsync<Balances, ProfileError>` — parallel USDC + price fetch with fiat conversion.

| Param | Type | Description |
|-------|------|-------------|
| `userAddress` | `Address` | Wallet address to query |
| `currency` | `string` | Currency code for fiat conversion |

**Balances** fields: `usdc` (`number`), `fiat` (`number`), `sellPrice` (`number`).

### `profile.getTxLimits(params)`

Returns `ResultAsync<TxLimits, ProfileError>` — buy/sell transaction limits.

### `profile.getRpPerUsdtLimitRational(params)`

Returns `ResultAsync<RpPerUsdtLimit, ProfileError>` — RP-to-USDC ratio.

## Errors

All methods return `ResultAsync<T, ProfileError>` — no thrown exceptions.

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed (Zod) |
| `CONTRACT_READ_ERROR` | On-chain contract read failed |
