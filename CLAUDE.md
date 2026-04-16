# CLAUDE.md

> **Intentionally committed.** This file provides AI tooling context for contributors. It contains no secrets and is excluded from the npm tarball via `files: ["dist"]` in `package.json`.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@p2pdotme/sdk` — a multi-module TypeScript SDK for P2P.me. Published as a single package with subpath exports:

- `@p2pdotme/sdk/orders` — full order surface: reads (`getOrder`, `getOrders`, `getFeeConfig`) + writes via `prepare`/`execute` pairs (`placeOrder`, `cancelOrder`, `setSellOrderUpi`, `raiseDispute`, `approveUsdc`, `paidBuyOrder`) + event subscriptions (`watchEvents`). Circle-selection routing lives inside as an internal implementation detail.
- `@p2pdotme/sdk/prices` — currency price config reads: `getPriceConfig`, `getReputationPerUsdcLimit`.
- `@p2pdotme/sdk/profile` — user-scoped reads: USDC balance, USDC allowance, tx limits, combined fiat balances.
- `@p2pdotme/sdk/react` — unified React provider (`SdkProvider`) + hooks (`useOrders`, `usePrices`, `useProfile`, `useZkkyc`, `useFraudEngine`, `useSdk`).
- `@p2pdotme/sdk/qr-parsers` — QR code parsers for payment networks (UPI, PIX, QRIS, MercadoPago, Pago Móvil).
- `@p2pdotme/sdk/fraud-engine` — fraud detection, device fingerprinting (FingerprintJS), SEON session signals, encrypted activity logging.
- `@p2pdotme/sdk/zkkyc` — ZK KYC: tx calldata preparation for Reclaim social verify, Aadhaar, ZK Passport; plus UX flow orchestrators.
- `@p2pdotme/sdk/country` — country/currency metadata, payment field configs, per-currency validators.

Framework-agnostic core. Wallet-agnostic — consumers bring their own viem `PublicClient` (reads) and optionally a `WalletClient` (writes).

## Prerequisites

- Node.js 22.4.1+ (see `.nvmrc`)
- Bun 1.3.1 (pinned via `engines` and `packageManager` in `package.json`)

## Commands

```bash
bun run build          # tsup → ESM + CJS + DTS into dist/
bun run dev            # tsup --watch
bun run typecheck      # tsc --noEmit (covers src/, test/, example/)
bun run lint           # biome check src/
bun run lint:fix       # biome check --write src/
bun run format         # biome format --write src/
bun run test           # vitest run
bun run changeset      # create a changeset
bun run release        # build + publish
```

## Architecture

```
src/
├── types/                  # PublicClientLike shared across modules
├── constants/              # CURRENCY, ORDER_TYPE, ORDER_STATUS, DISPUTE_STATUS — internal only
├── lib/                    # Shared low-level utilities — internal only
│   ├── encoding.ts         # bytesToBase64, hexToBytes
│   ├── logger.ts           # Logger type + noopLogger
│   ├── sleep.ts
│   └── subgraph.ts         # querySubgraph() + SubgraphError
├── contracts/              # Centralized contract interactions (no duplicate ABIs)
│   ├── abis/               # ABI fragments (order-flow, order-processor, p2p-config, reputation-manager)
│   ├── order-flow/         # checkCircleEligibility
│   ├── order-processor/    # readOrderMulticall, readFeeConfigMulticall
│   ├── p2p-config/         # getPriceConfig, getReputationPerUsdcLimit
│   ├── tx-limits/          # getTxLimits
│   ├── usdc/               # getUsdcBalance
│   └── reputation-manager/
├── validation/             # SdkError base + shared Zod schemas (ZodAddressSchema, ZodCurrencySchema)
├── orders/                 # @p2pdotme/sdk/orders
│   ├── client.ts           # createOrders() — reads + write actions on one flat surface
│   ├── errors.ts           # unified OrdersError with read + write codes
│   ├── types.ts            # Order, OrderStatus, OrdersConfig, PreparedTx, TxResult, ExecuteBase
│   ├── validation.ts       # Zod schemas for every read + write param
│   ├── normalize.ts        # contract + subgraph → normalized Order
│   ├── tx.ts               # submitPreparedTx helper
│   ├── internal/
│   │   └── routing/        # Epsilon-greedy circle selection (not exported publicly)
│   ├── actions/            # prepare/execute pairs per action
│   │   ├── place-order.ts
│   │   ├── cancel-order.ts
│   │   ├── set-sell-order-upi.ts
│   │   ├── raise-dispute.ts
│   │   └── approve-usdc.ts
│   ├── relay-identity/     # Pure createRelayIdentity, in-memory + localStorage stores, resolver
│   ├── crypto/             # ECIES + encryptPaymentAddress/decryptPaymentAddress
│   └── subgraph/           # OrdersForUser query
├── prices/                 # @p2pdotme/sdk/prices — currency price config reads
├── profile/                # @p2pdotme/sdk/profile — user-scoped balance + limits
├── qr-parsers/             # UPI, PIX, QRIS, MercadoPago, Pago Móvil
├── payload/  ← REMOVED — merged into orders (prepare/execute)
├── order-routing/ ← REMOVED — moved to orders/internal/routing/
├── order-actions/ ← REMOVED — merged into orders
├── fraud-engine/
├── zkkyc/                  # createZkkyc + createReclaimFlow + createZkPassportFlow
├── country/                # COUNTRY_OPTIONS, PAYMENT_ID_FIELDS, per-currency validators
└── react/                  # SdkProvider + hooks
```

Each top-level module is a separate tsup entry point producing its own `.mjs`, `.cjs`, and `.d.ts` in `dist/`.

## Key Design Patterns

- **`ResultAsync<T, Error>` everywhere** — no thrown exceptions in the public API. QR parsers return sync `Result`.
- **Wallet-agnostic reads, optional walletClient for writes** — every write action has `prepare(params)` (pure — no wallet) and `execute({ walletClient, waitForReceipt?, ...params })` (signs + submits). Consumers pick the layer.
- **`placeOrder.execute` receipt parsing** — with `waitForReceipt: true`, the `OrderPlaced` event is parsed out of the receipt logs and `meta.orderId` is populated. Best-effort: never an error mode.
- **No auto-approve on SELL/PAY** — the SDK never submits a hidden approve tx. Consumers explicitly call `orders.approveUsdc.execute({ amount })` (or pre-flight via `profile.getUsdcAllowance({ owner })`) before `placeOrder`. Keeps logging, fees, and error paths unambiguous.
- **Storage-agnostic relay identity** — `createRelayIdentity()` is pure. Persistence goes through a pluggable `RelayIdentityStore` adapter (`createInMemoryRelayStore` default, `createLocalStorageRelayStore` shipped opt-in).
- **Centralized contracts** — every ABI + read function lives in `src/contracts/`, organized by facet. Modules never duplicate ABIs.
- **Zod v4 validation at boundaries** — every public function validates inputs via `validate()` which returns a `Result`.
- **The SDK does NOT read environment variables** — all config is passed via factory functions.
- **Types inferred from Zod schemas** — `z.input` for schemas with defaults, `z.infer` otherwise.
- **Only export what's used** — each module's `index.ts` exports only what real consumers import. No speculative surface.
- **Optional peer dependencies** — `@reclaimprotocol/js-sdk` and `@zkpassport/sdk` are loaded via dynamic `import()` at runtime; throw `PEER_DEPENDENCY_MISSING` if absent.

## Commenting Rules

- All exported functions must have a JSDoc comment describing what the function does.
- Keep JSDoc concise — one to two sentences covering purpose and key behavior.
- Do not add inline comments unless the logic is non-obvious; the code should be self-explanatory.
- Do not add comments to private/internal helpers unless the logic is genuinely tricky.

## Order types

- `0` — Buy
- `1` — Sell
- `2` — Pay

## Order lifecycle (status)

`placed` → `accepted` → `paid` → `completed` (or `cancelled` at any point).

## Epsilon-greedy circle selection (internal)

Lives in `src/orders/internal/routing/`. Called by `placeOrder` internally — not exported.
- **75% exploit** — pick from active circles, weighted by raw `circleScore`.
- **25% explore** — pick from all eligible circles with status-aware weights: `active=score`, `bootstrap=min(score,25)`, `paused=score×0.3`.
- Retries up to 3× if on-chain eligibility fails, removing failed circles from the pool.

## Fraud engine

`src/fraud-engine/` — runs a server-side fraud check before a buy order, then links the activity log to the on-chain order ID.

- **`createFraudEngine(config)`** — factory.
- **`processBuyOrder()`** — full orchestration: fraud check → `placeOrder` callback → auto-link. Recommended.
- **`checkBuyOrder()`** — low-level: fraud check only; returns `linkOrder(orderId)` for manual control.
- **`logFingerprint()`** — logs FingerprintJS visitorId ↔ wallet mapping.
- **`init()`** — initializes SEON + pre-loads FingerprintJS (call once at app startup; auto-called by `SdkProvider`).
- **`cleanupSeonStorage()`** — removes SEON localStorage entries (call on logout).

SEON and FingerprintJS are direct deps — the SDK owns their lifecycle. Browser-only APIs are guarded for SSR.

## ZK KYC

`src/zkkyc/` has two layers:

**Transaction preparation** (`createZkkyc(config)`):
- **`prepareSocialVerify()`** — encodes calldata for on-chain Reclaim proof submission.
- **`prepareSubmitAnonAadharProof()`** — encodes calldata for Aadhaar proof submission.
- **`prepareZkPassportRegister()`** — encodes calldata for ZK Passport registration.

**UX flow orchestrators** (return proof data before tx preparation):
- **`createReclaimFlow(params)`** — Reclaim social verification flow. Single-object params (app config + per-call options merged). Requires `@reclaimprotocol/js-sdk` peer dep.
- **`createZkPassportFlow(params)`** — ZKPassport verification flow. Single-object params. Requires `@zkpassport/sdk` peer dep. `params.domain` is **required** — no default, to prevent impersonation.

## Git hooks

- **pre-commit** — lint-staged runs biome lint + format on staged `src/**/*.{ts,tsx}` files.
- **pre-push** — runs `bun run typecheck` and `bun run build`.

## Dependencies

- `viem` — chain abstraction (address utils, contract reads/writes, event log decoding).
- `neverthrow` — Result/ResultAsync types.
- `zod` v4 — runtime validation at SDK boundaries.
- `@seontechnologies/seon-javascript-sdk` — SEON session collection.
- `@fingerprintjs/fingerprintjs` — browser fingerprinting.
- `@noble/ciphers`, `@noble/curves`, `@noble/hashes` — ECIES + AES-GCM (bundled; not re-exported).
- `react` — optional peer (for `./react` export).
- `@reclaimprotocol/js-sdk` — optional peer (zkkyc Reclaim flow only).
- `@zkpassport/sdk` — optional peer (zkkyc ZK Passport flow only).
