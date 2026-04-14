# CLAUDE.md

> **Intentionally committed.** This file provides AI tooling context for contributors. It contains no secrets and is excluded from the npm tarball via `files: ["dist"]` in `package.json`.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@p2pdotme/sdk` — a multi-module TypeScript SDK for P2P.me. Published as a single package with subpath exports:

- `@p2pdotme/sdk/order-routing` — circle selection via epsilon-greedy algorithm + on-chain eligibility validation
- `@p2pdotme/sdk/react` — unified React provider (SdkProvider) + hooks (useProfile, useOrderRouter, usePayloadGenerator)
- `@p2pdotme/sdk/qr-parsers` — QR code parsers for payment networks (UPI, PIX, QRIS, etc.)
- `@p2pdotme/sdk/payload` — order payload generation, ECIES encryption/decryption, relay identity
- `@p2pdotme/sdk/profile` — account balance (USDC + fiat) and price config reads
- `@p2pdotme/sdk/fraud-engine` — fraud detection, device fingerprinting, SEON integration, and activity logging
- `@p2pdotme/sdk/zkkyc` — ZK KYC: tx calldata preparation for social verify (Reclaim), Aadhaar, and ZK Passport registration; plus UX flow orchestrators
- `@p2pdotme/sdk/country` — country/currency metadata, payment field configs, and per-currency validators

Framework-agnostic core. Wallet-agnostic (consumers bring their own viem client or signer).

## Prerequisites

- Node.js 22.4.1+ (see `.nvmrc`)
- Bun 1.3.1 (pinned via `engines` and `packageManager` in `package.json`)

## Commands

```bash
bun run build          # tsup → ESM + CJS + DTS into dist/
bun run dev            # tsup --watch
bun run typecheck      # tsc --noEmit
bun run lint           # biome check src/
bun run lint:fix       # biome check --write src/
bun run format         # biome format --write src/
bun run test           # vitest run
bun run changeset      # create a changeset
bun run release        # build + publish
```

### Example App

```bash
cd example
bun install
bun run dev            # Vite dev server at http://localhost:5173
```

The example uses `link:..` to reference the SDK root.

## Architecture

```
src/
├── types/
│   ├── public-client.ts   # PublicClientLike interface (shared across modules)
│   └── index.ts
├── constants/             # Shared constants (not a subpath export — internal use only)
│   ├── currencies.constant.ts   # CURRENCY object — single source of truth for currency symbols
│   ├── orders.constant.ts       # Order type constants (Buy=0, Sell=1, Pay=2)
│   └── index.ts
├── lib/                   # Shared low-level utilities (not a subpath export — internal use only)
│   ├── encoding.ts        # bytesToBase64, hexToBytes
│   ├── logger.ts          # Logger type + noopLogger
│   ├── sleep.ts           # sleep(ms)
│   └── index.ts
├── contracts/             # Centralized contract interactions
│   ├── abis/
│   │   ├── order-flow-facet.ts        # getAssignableMerchantsFromCircle ABI
│   │   ├── p2p-config-facet.ts        # getPriceConfig ABI
│   │   └── index.ts                   # ABIS object (DIAMOND, FACETS, EXTERNAL)
│   ├── order-flow/
│   │   └── index.ts                   # checkCircleEligibility()
│   ├── p2p-config/
│   │   └── index.ts                   # getPriceConfig()
│   ├── usdc/
│   │   └── index.ts                   # getUsdcBalance()
│   └── index.ts
├── validation/
│   ├── errors.ts          # SdkError base class
│   ├── schemas.ts         # Shared Zod schemas (ZodAddressSchema, ZodCurrencySchema)
│   └── index.ts
├── order-routing/
│   ├── client.ts          # createOrderRouter() — main entry, composes all pieces
│   ├── routing.ts         # Epsilon-greedy circle selection (EPSILON=0.25, retry up to 3×)
│   ├── errors.ts          # OrderRoutingError class with typed error codes
│   ├── types.ts           # Circle types, config interfaces
│   ├── validation.ts      # Zod schemas for circle/eligibility params
│   └── subgraph/
│       ├── client.ts      # fetch-based GraphQL client (no graphql-request dep)
│       ├── queries.ts     # CirclesForRouting GraphQL query
│       └── index.ts       # getCirclesForRouting() — query + validate + filter
├── react/
│   ├── sdk-provider.tsx   # SdkProvider context + useProfile, useOrderRouter, usePayloadGenerator hooks
│   ├── types.ts           # SdkConfig, Sdk interfaces
│   └── index.ts
├── profile/
│   ├── client.ts          # createProfile() — composes getUsdcBalance, getPriceConfig, getBalances
│   ├── errors.ts          # ProfileError class with typed error codes
│   ├── types.ts           # Balances, PriceConfig, ProfileConfig
│   ├── validation.ts      # Zod schemas + inferred types (UsdcBalanceParams, etc.)
│   └── contracts/
│       ├── actions.ts     # getBalances() — parallel USDC + price fetch with fiat conversion
│       └── index.ts       # Re-exports from centralized contracts + local getBalances
├── qr-parsers/
│   ├── parse-qr.ts        # parseQR(currency, raw, config?) — main entry
│   ├── errors.ts          # QRParserError with typed error codes
│   ├── types.ts           # ParsedQR, ParseResult, SupportedCurrency
│   ├── parsers/           # Per-currency parsers (inr, idr, brl, ars, ven)
│   └── utils/             # TLV decoder, CRC16, amount helpers
├── payload/
│   ├── client.ts          # createPayloadGenerator() — order payload creation
│   ├── ecies.ts           # ECIES encryption via @noble/ciphers + @noble/curves
│   ├── encryption.ts      # encryptPaymentAddress / decryptPaymentAddress
│   └── relay-identity.ts  # createRelayIdentity / getRelayIdentity
├── fraud-engine/
│   ├── client.ts          # createFraudEngine() factory — main entry point
│   ├── types.ts           # All public interfaces (FraudEngine, FraudEngineSigner, etc.)
│   ├── errors.ts          # FraudEngineError class with typed error codes
│   ├── validation.ts      # Zod schemas for config/inputs
│   ├── encryption.ts      # AES-256-GCM AEAD encryption (hexToBytes, encryptPayload)
│   ├── device.ts          # getBasicDeviceDetails(), fetchIpAddress(), getDeviceDetails()
│   ├── seon.ts            # SEON SDK init + session collection
│   ├── fingerprint.ts     # FingerprintJS agent load + get with timeout
│   ├── signing.ts         # EIP-191 signed headers generation
│   ├── logger.ts          # noopLogger default
│   ├── index.ts           # Public API re-exports
│   └── react/
│       ├── use-fraud-engine.ts   # useFraudEngine() hook
│       ├── use-fingerprint.ts    # useFingerprint() reactive hook
│       └── index.ts
├── zkkyc/
│   ├── client.ts          # createZkkyc(config) — factory exposing tx calldata preparation methods
│   ├── errors.ts          # ZkkycError class with typed error codes
│   ├── types.ts           # ZkkycConfig interface
│   ├── validation.ts      # Zod schemas for SocialVerifyParams, AnonAadharProofParams, ZkPassportRegisterParams
│   ├── index.ts           # Public API re-exports
│   └── orchestrators/
│       ├── types.ts       # ReclaimConfig, ZkPassportConfig (domain required), flow option types
│       ├── reclaim.ts     # createReclaimFlow() — Reclaim social verification UX flow
│       ├── zk-passport.ts # createZkPassportFlow() — ZKPassport UX flow (optional peer dep)
│       └── constants.ts   # Shared orchestrator constants
└── country/
    ├── countries.ts       # COUNTRY_OPTIONS — full list of supported countries with metadata
    ├── payment-fields.ts  # PAYMENT_ID_FIELDS — payment field config per currency
    ├── types.ts           # CountryOption, PaymentIdFieldConfig interfaces
    ├── validators.ts      # Per-currency payment address validators
    ├── currencies/        # Per-currency metadata (ars, brl, cop, eur, idr, inr, mex, ngn, usd, ven)
    └── index.ts
```

Each module is a separate tsup entry point producing its own `.mjs`, `.cjs`, and `.d.ts` in `dist/`.

## Key Design Patterns

- **All SDK methods return `ResultAsync<T, Error>`** via neverthrow — no thrown exceptions in the public API. QR parsers return sync `Result<ParsedQR, QRParserError>`.
- **Wallet-agnostic**: consumers pass a `PublicClientLike` (needs only `readContract`, shared via `src/types/`). The SDK returns a `circleId`; consumers handle tx signing/submission themselves.
- **Centralized contracts**: all contract ABIs and read functions live in `src/contracts/`, organized by domain (usdc, p2p-config, order-flow). Modules import from there — no duplicate ABIs.
- **Zod v4 validation at boundaries**: every public function validates inputs via `validate()` which returns a `Result`.
- **The SDK does NOT read environment variables** — all config is passed via factory functions (`createOrderRouter()`, `createProfile()`, `createFraudEngine()`, `createZkkyc()`)
- **Infer types from Zod schemas** — param types are derived via `z.infer<typeof Schema>`, not manually duplicated interfaces.
- **Contract ABIs are minimal** — only the functions the SDK actually calls, not the full Diamond ABI.
- **Amount conversion**: both USDC and fiat amounts are scaled to 6 decimals via `parseUnits(value, 6)` before passing to the SDK.
- **Only export what's used** — each module's `index.ts` only exports what user-app-spa actually imports. No speculative public API.
- **Optional peer dependencies**: `@reclaimprotocol/js-sdk` and `@zkpassport/sdk` are loaded via dynamic `import()` at runtime and throw `PEER_DEPENDENCY_MISSING` if absent.

## Commenting Rules

- All exported functions must have a JSDoc comment describing what the function does.
- Keep JSDoc concise — one to two sentences covering purpose and key behavior.
- Do not add inline comments unless the logic is non-obvious; the code should be self-explanatory.
- Do not add comments to private/internal helpers unless the logic is genuinely tricky.

## Order Types

- `0` — Buy
- `1` — Sell
- `2` — Pay

## Epsilon-Greedy Algorithm

The circle selection in `routing.ts`:
- **75% exploit**: pick from active circles only, weighted by raw circleScore
- **25% explore**: pick from all eligible circles with status-aware weights
- Status weights: active=score, bootstrap=min(score,25), paused=score×0.3
- Retries up to 3 times if on-chain eligibility check fails, removing failed circles from the pool

## Fraud Engine

The fraud-engine module (`src/fraud-engine/`) provides:
- **`createFraudEngine(config)`** — factory returning a `FraudEngine` instance
- **`processBuyOrder()`** — full orchestration: fraud check → call placeOrder callback → auto-link. Recommended for most consumers.
- **`checkBuyOrder()`** — low-level fraud check only. Returns result with `linkOrder(orderId)` for manual control.
- **`logFingerprint()`** — logs FingerprintJS visitorId-to-wallet mapping
- **`init()`** — initializes SEON + pre-loads FingerprintJS agent (call once at app startup)
- **`cleanupSeonStorage()`** — removes SEON localStorage entries (call on logout)

SEON and FingerprintJS are direct SDK dependencies — the SDK owns their lifecycle. Browser-only APIs are guarded for SSR safety.

## ZK KYC

The zkkyc module (`src/zkkyc/`) has two layers:

**Transaction preparation** (`createZkkyc(config)`):
- **`prepareSocialVerify()`** — encodes calldata for on-chain social verification (Reclaim proofs)
- **`prepareSubmitAnonAadharProof()`** — encodes calldata for Aadhaar proof submission
- **`prepareZkPassportRegister()`** — encodes calldata for ZK Passport registration

**UX flow orchestrators** (called before tx preparation, return proof data):
- **`createReclaimFlow(config, options)`** — runs the Reclaim social verification flow. Requires `@reclaimprotocol/js-sdk` peer dep.
- **`createZkPassportFlow(config, options)`** — runs the ZKPassport verification flow. Requires `@zkpassport/sdk` peer dep. `config.domain` is **required** — no default to prevent impersonation.

## Git Hooks

- **pre-commit** — lint-staged runs biome lint + format on staged `src/**/*.{ts,tsx}` files
- **pre-push** — runs `bun run typecheck` and `bun run build`

## Dependencies

- `viem` — chain abstraction (address utils, hex encoding, contract reads)
- `neverthrow` — Result/ResultAsync types (no thrown exceptions)
- `zod` v4 — runtime validation at SDK boundaries
- `@seontechnologies/seon-javascript-sdk` — SEON fraud detection session collection
- `@fingerprintjs/fingerprintjs` — browser fingerprinting
- `@noble/ciphers`, `@noble/curves`, `@noble/hashes` — ECIES + AES-GCM encryption (bundled, not re-exported)
- `react` — optional peer dependency (only for `./react` export)
- `@reclaimprotocol/js-sdk` — optional peer dependency (only for `zkkyc` Reclaim flow)
- `@zkpassport/sdk` — optional peer dependency (only for `zkkyc` ZK Passport flow)
