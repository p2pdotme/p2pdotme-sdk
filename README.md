# @p2pdotme/sdk

Multi-module TypeScript SDK for P2P.me. Published as a single package with subpath exports.

- Framework-agnostic core with optional React bindings
- Wallet-agnostic — consumers bring their own viem client
- No thrown exceptions — all methods return `Result` / `ResultAsync` via neverthrow

## Installation

```bash
bun add @p2pdotme/sdk
```

Peer dependency (required for React bindings):

```bash
bun add react
```

## Modules

| Import | Description |
|--------|-------------|
| `@p2pdotme/sdk` | Shared types, `SdkError`, `ORDER_TYPE`, `VERSION` |
| `@p2pdotme/sdk/order-routing` | [Circle selection](./src/order-routing/README.md) via epsilon-greedy algorithm + on-chain eligibility |
| `@p2pdotme/sdk/payload` | [Order payload generation](./src/payload/README.md), ECIES encryption, relay identity |
| `@p2pdotme/sdk/profile` | [Account balances](./src/profile/README.md) (USDC + fiat) and price config reads |
| `@p2pdotme/sdk/qr-parsers` | [QR code parsers](./src/qr-parsers/README.md) for UPI, QRIS, PIX, MercadoPago, Pago Movil |
| `@p2pdotme/sdk/fraud-engine` | [Fraud detection](./src/fraud-engine/README.md), device fingerprinting, SEON integration |
| `@p2pdotme/sdk/zkkyc` | [ZK KYC verification](./src/zkkyc/README.md) — Reclaim, Anon Aadhaar, ZK Passport |
| `@p2pdotme/sdk/country` | [Country & currency config](./src/country/README.md) — payment methods, validators, field configs |
| `@p2pdotme/sdk/react` | Unified React provider (`SdkProvider`) + hooks |

## Quick Start

```tsx
import { SdkProvider, useOrderRouter, usePayloadGenerator, useProfile } from "@p2pdotme/sdk/react";
import { createPublicClient, http, parseUnits } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });

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
  const profile = useProfile();
  const payload = usePayloadGenerator();

  async function handleBuy() {
    // 1. Check balance
    const balances = await profile.getBalances({
      userAddress: "0xUser",
      currency: "INR",
    });

    // 2. Build order payload (includes circle selection)
    const order = await payload.placeOrder({
      amount: parseUnits("10", 6),
      recipientAddr: "0xRecipient",
      orderType: 0, // BUY
      currency: "INR",
      fiatAmount: parseUnits("850", 6),
      user: "0xUser",
    });

    order.match(
      (data) => submitOnChain(data),
      (error) => console.error(`[${error.code}] ${error.message}`),
    );
  }
}
```

## React Hooks

All hooks read from the nearest `<SdkProvider>`:

| Hook | Returns |
|------|---------|
| `useProfile()` | `Profile` — balance and price reads |
| `useOrderRouter()` | `OrderRouter` — circle selection |
| `usePayloadGenerator()` | `PayloadGenerator` — order payload building |
| `useZkkyc()` | `Zkkyc` — ZK verification (requires `reputationManagerAddress`) |
| `useFraudEngine()` | `FraudEngine` — fraud detection (requires `fraudEngine` config) |
| `useSdk()` | Full `Sdk` object |

## Order Types

| Value | Type |
|-------|------|
| `0` | Buy |
| `1` | Sell |
| `2` | Pay |

## Supported Currencies

`INR` | `IDR` | `BRL` | `ARS` | `MEX` | `VEN` | `EUR` | `NGN` | `USD` | `COP`

## Development

```bash
bun install              # install dependencies
bun run build            # tsup → ESM + CJS + DTS into dist/
bun run dev              # tsup --watch
bun run typecheck        # tsc --noEmit
bun run lint             # biome check src/
bun run test             # vitest run
bun run size             # show per-module bundle sizes
```

### Example App

```bash
cd example
bun install
bun run dev              # http://localhost:5173
```

### Git Hooks

- **pre-commit** — lint-staged (biome lint + format on staged files)
- **pre-push** — typecheck + build

### Release

Releases are published manually — there is no CI. See [docs/publishing.md](./docs/publishing.md) for the full flow.

```bash
bun run changeset        # describe your change (run on feature branch)
bunx changeset version   # bump version + update CHANGELOG (run on main after merge)
bun run release          # build + publish to npm (run on main after version bump)
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `viem` | Chain abstraction (address utils, hex encoding, contract reads) |
| `neverthrow` | Result/ResultAsync types (no thrown exceptions) |
| `zod` v4 | Runtime validation at SDK boundaries |
| `@fingerprintjs/fingerprintjs` | Browser fingerprinting (fraud-engine) |
| `@seontechnologies/seon-javascript-sdk` | SEON behavioral signals (fraud-engine) |
| `react` | Peer dependency (for `./react` export) |

## License

MIT © P2P.me
