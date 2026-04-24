# @p2pdotme/sdk

Multi-module TypeScript SDK for P2P.me. Published as a single package with subpath exports.

- Framework-agnostic core with optional React bindings
- Wallet-agnostic — consumers bring their own viem client; optional `WalletClient` for writes
- No thrown exceptions — all methods return `Result` / `ResultAsync` via neverthrow

## Installation

```bash
bun add @p2pdotme/sdk
```

Peer dependencies (all optional):

```bash
bun add react                            # only for @p2pdotme/sdk/react
bun add @reclaimprotocol/js-sdk          # only for zkkyc Reclaim flow
bun add @zkpassport/sdk                  # only for zkkyc ZK Passport flow
```

## Modules

| Import | Description |
|--------|-------------|
| `@p2pdotme/sdk` | Shared types, `SdkError`, `VERSION` |
| `@p2pdotme/sdk/orders` | [Order reads + writes](./src/orders/README.md) — `getOrder`, `getOrders`, `getFeeConfig`, and `prepare`/`execute` pairs for `placeOrder`, `cancelOrder`, `setSellOrderUpi`, `raiseDispute`, `approveUsdc` |
| `@p2pdotme/sdk/prices` | [Currency price config](./src/prices/README.md) — `getPriceConfig`, `getReputationPerUsdcLimit` |
| `@p2pdotme/sdk/profile` | [User-scoped reads](./src/profile/README.md) — USDC balance, USDC allowance, fiat conversion, tx limits |
| `@p2pdotme/sdk/qr-parsers` | [QR code parsers](./src/qr-parsers/README.md) for UPI, QRIS, PIX, MercadoPago, Pago Movil |
| `@p2pdotme/sdk/fraud-engine` | [Fraud detection](./src/fraud-engine/README.md), device fingerprinting, SEON integration |
| `@p2pdotme/sdk/zkkyc` | [ZK KYC](./src/zkkyc/README.md) — Reclaim, Anon Aadhaar, ZK Passport |
| `@p2pdotme/sdk/country` | [Country & currency config](./src/country/README.md) — payment methods, validators, field configs |
| `@p2pdotme/sdk/react` | Unified React provider (`SdkProvider`) + hooks |

Circle-selection routing is an internal implementation detail of `placeOrder` — it is **not** exposed as a public subpath.

## Quick Start

```tsx
import { SdkProvider, useOrders, useProfile } from "@p2pdotme/sdk/react";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
  account: privateKeyToAccount(PRIVATE_KEY),
});

function App() {
  return (
    <SdkProvider
      publicClient={publicClient}
      subgraphUrl={SUBGRAPH_URL}
      diamondAddress={DIAMOND_ADDRESS}
      usdcAddress={USDC_ADDRESS}
    >
      <BuyFlow />
    </SdkProvider>
  );
}

function BuyFlow() {
  const orders = useOrders();
  const profile = useProfile();

  async function handleBuy() {
    // 1. Check balance
    const balances = await profile.getBalances({
      address: "0xUser",
      currency: "INR",
    });

    // 2. Place a BUY order (SDK picks the circle, signs, submits, awaits the receipt)
    const placed = await orders.placeOrder.execute({
      walletClient,
      waitForReceipt: true,
      orderType: 0, // 0 = BUY, 1 = SELL, 2 = PAY
      currency: "INR",
      user: "0xUser",
      recipientAddr: "0xRecipient",
      amount: parseUnits("10", 6),
      fiatAmount: parseUnits("850", 6),
      fiatAmountLimit: 0n,
    });

    placed.match(
      ({ hash, meta }) => console.log("Placed!", { hash, orderId: meta?.orderId }),
      (err) => console.error(`[${err.code}] ${err.message}`),
    );
  }
}
```

SELL and PAY follow the same shape, but the Diamond pulls USDC via `transferFrom`, so you must approve first — call `orders.approveUsdc.execute({ amount })` (pre-flight the current allowance with `profile.getUsdcAllowance({ owner })` if you want to skip redundant approvals). After the order is accepted, call `orders.setSellOrderUpi.execute({...})` to hand off the (ECIES-encrypted) payment destination to the merchant.

See [example/](./example/) for runnable walkthroughs of each flow.

## Layered writes: `prepare` vs `execute`

Every write action exposes two methods:

- **`action.prepare(params)`** — returns a `ResultAsync<PreparedTx, OrdersError>`, where `PreparedTx` is `{ to, data, value, meta }`. No wallet needed. Use this for gasless relayers, multisigs, server-side signing, or anything not wagmi/viem.
- **`action.execute({ walletClient, waitForReceipt?, ...params })`** — `prepare()` + `walletClient.sendTransaction` + optional `waitForTransactionReceipt`. The fast path when you're signing directly with viem.

## Contract errors

Every revert from the P2P.me Diamond can be decoded to a typed code and a ready-to-display English string.

```ts
import {
  parseContractError,
  getContractErrorMessage,
} from "@p2pdotme/sdk/orders";

// 1. Decode a raw revert (viem error, hex selector, or nested cause)
//    → returns a ContractErrorCode string, or null if unknown
const code = parseContractError(err);
// e.g. "USERNAME_ALREADY_VERIFIED"

// 2. Get the English UI string for a code (with optional fallback)
const message = getContractErrorMessage(code);
// "The social media account's username is already verified"

// Combined — typical usage in an error handler:
orders.placeOrder.execute(params).match(
  ({ hash }) => console.log("placed", hash),
  (err) => {
    const code    = parseContractError(err.cause);
    const message = getContractErrorMessage(code);
    showToast(message); // ready for display
  },
);
```

All three exports — `contractErrors` (name → code map), `hexContractErrors` (4-byte selector → code), and `contractErrorMessages` (code → English string) — are also exported for advanced use cases such as building per-locale translation tables on top.

## React hooks

All hooks read from the nearest `<SdkProvider>`:

| Hook | Returns |
|------|---------|
| `useProfile()` | `Profile` — user-scoped balance & limits reads |
| `usePrices()` | `Prices` — currency price config reads |
| `useOrders()` | `OrdersClient` — order reads + write actions |
| `useZkkyc()` | `Zkkyc` — ZK verification (requires `reputationManagerAddress`) |
| `useFraudEngine()` | `FraudEngine` — fraud detection (requires `fraudEngine` config) |
| `useSdk()` | Full `Sdk` object |

## Order types

| Value | Type |
|-------|------|
| `0` | Buy |
| `1` | Sell |
| `2` | Pay |

## Supported currencies

`INR` · `IDR` · `BRL` · `ARS` · `MEX` · `VEN` · `EUR` · `NGN` · `USD` · `COP`

## Development

```bash
bun install              # install dependencies
bun run build            # tsup → ESM + CJS + DTS into dist/
bun run dev              # tsup --watch
bun run typecheck        # tsc --noEmit (covers src/, test/, example/)
bun run lint             # biome check src/
bun run test             # vitest run
bun run size             # show per-module bundle sizes
```

### Examples

Standalone scripts under [`example/`](./example/) — no Vite, no package.json, just .ts files with inline CONFIG blocks. Build the SDK once, then run any script directly:

```bash
bun run build
bun run example/fetch-inr-price.ts
bun run example/make-buy-order.ts
# etc.
```

### Git hooks

- **pre-commit** — lint-staged (biome lint + format on staged files)
- **pre-push** — typecheck + build

### Release

Releases are published manually — there is no CI. See [docs/publishing.md](./docs/publishing.md).

```bash
bun run changeset        # describe your change (run on feature branch)
bunx changeset version   # bump version + update CHANGELOG (run on main after merge)
bun run release          # build + publish to npm
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `viem` | Chain abstraction (address utils, contract reads/writes, event decoding) |
| `neverthrow` | Result/ResultAsync types (no thrown exceptions) |
| `zod` v4 | Runtime validation at SDK boundaries |
| `@fingerprintjs/fingerprintjs` | Browser fingerprinting (fraud-engine) |
| `@seontechnologies/seon-javascript-sdk` | SEON behavioral signals (fraud-engine) |
| `@noble/ciphers` · `@noble/curves` · `@noble/hashes` | ECIES + AES-GCM (bundled, not re-exported) |
| `react` | Optional peer (for `./react` export only) |
| `@reclaimprotocol/js-sdk` | Optional peer (for zkkyc Reclaim flow only) |
| `@zkpassport/sdk` | Optional peer (for zkkyc ZK Passport flow only) |

## License

MIT © P2P.me
