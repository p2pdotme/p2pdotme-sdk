# Architecture

High-level shape of `@p2pdotme/sdk`. For deeper per-module docs, see the READMEs under `src/*/`. For contributor/LLM guidance, see [`CLAUDE.md`](./CLAUDE.md).

## Principles

1. **Framework-agnostic core, optional React layer.** The main API is pure factory functions (`createOrders`, `createPrices`, `createProfile`, etc.) that return plain objects. `@p2pdotme/sdk/react` is a thin `<SdkProvider>` + hooks layer on top — never a dependency of the core.
2. **Wallet-agnostic reads, optional walletClient for writes.** Every public function takes viem's `PublicClient`-shaped `readContract`. Write actions (only in `orders`) take an optional `WalletClient` on the `execute()` variant; `prepare()` stays wallet-free and returns a ready-to-send `{ to, data, value }` tx request.
3. **No thrown exceptions in the public API.** All methods return `Result` / `ResultAsync` via [neverthrow](https://github.com/supermacro/neverthrow). QR parsers return sync `Result`; everything else returns `ResultAsync`.
4. **Centralized contract layer.** Every ABI fragment and raw read helper lives in `src/contracts/`, keyed by facet. Feature modules never re-declare ABIs or duplicate read logic.
5. **Zod v4 at boundaries.** Every public function validates its params through `validate()`. Param types are inferred from the schemas (`z.infer` or `z.input`), not hand-duplicated.
6. **No environment variable reads.** All config is passed through factory functions — this is documented in the module READMEs.

## Public surface

```
@p2pdotme/sdk
├── /orders           # reads + write actions (placeOrder, cancel, setSellOrderUpi, raiseDispute, approveUsdc)
├── /prices           # getPriceConfig, getRpPerUsdtLimitRational
├── /profile          # getUsdcBalance, getTxLimits, getBalances
├── /qr-parsers       # parseQR for INR/IDR/BRL/ARS/VEN
├── /fraud-engine     # processBuyOrder, checkBuyOrder, logFingerprint, init
├── /zkkyc            # createZkkyc (tx calldata) + createReclaimFlow + createZkPassportFlow
├── /country          # COUNTRY_OPTIONS, PAYMENT_ID_FIELDS, per-currency validators
└── /react            # <SdkProvider> + useOrders/usePrices/useProfile/useZkkyc/useFraudEngine
```

Internal (not exported): circle-selection routing (inside `orders/internal/routing/`), shared `lib/` helpers, shared constants.

## Module layout

```
src/
├── types/              # PublicClientLike (shared across modules)
├── constants/          # CURRENCY, ORDER_TYPE, ORDER_STATUS (internal only)
├── lib/                # encoding, logger, sleep, subgraph client (internal only)
├── contracts/          # Centralized ABIs + read helpers by facet
├── validation/         # SdkError + shared Zod schemas
├── orders/             # reads + writes + routing (internal) + ECIES + relay identity
├── prices/             # currency price config reads
├── profile/            # user-scoped reads
├── qr-parsers/
├── fraud-engine/
├── zkkyc/
├── country/
└── react/
```

## `orders` in detail

Because orders owns both the read and the write side, it's the largest module and deserves a closer look:

```
src/orders/
├── client.ts           # createOrders() — composes everything into OrdersClient
├── types.ts            # Order, OrderStatus, OrdersConfig, PreparedTx, TxResult, ExecuteBase
├── validation.ts       # Zod schemas for every read + write param shape
├── errors.ts           # Unified OrdersError with read + write code union
├── normalize.ts        # contract & subgraph → public Order shape
├── tx.ts               # submitPreparedTx (walletClient.sendTransaction + optional receipt wait)
├── subgraph/           # OrdersForUser GraphQL query
├── internal/
│   └── routing/        # Epsilon-greedy circle selection + eligibility check (not exported)
├── actions/
│   ├── place-order.ts        # autoApprove + OrderPlaced event parsing
│   ├── cancel-order.ts
│   ├── set-sell-order-upi.ts # ECIES-encrypts paymentAddress for the merchant
│   ├── raise-dispute.ts
│   └── approve-usdc.ts       # + readUsdcAllowance export
├── relay-identity/
│   ├── identity.ts     # Pure createRelayIdentity()
│   ├── stores.ts       # createInMemoryRelayStore, createLocalStorageRelayStore
│   └── resolve.ts      # config > store > generate+persist (surfaces RELAY_IDENTITY_CORRUPT, etc.)
└── crypto/
    ├── ecies.ts        # ECIES encrypt/decrypt via @noble/*
    └── encryption.ts   # encryptPaymentAddress / decryptPaymentAddress
```

### Layered writes

Every write action on `OrdersClient` exposes two methods with matching params:

- **`prepare(params)`** → `ResultAsync<PreparedTx, OrdersError>` where `PreparedTx = { to, data, value, meta? }`. Pure — no wallet. Use for gasless relayers, multisigs, server-side signing, or any non-viem wallet flow.
- **`execute({ walletClient, waitForReceipt?, ...params })`** → `ResultAsync<TxResult, OrdersError>` where `TxResult = { hash, receipt?, meta? }`. `prepare()` + `walletClient.sendTransaction` + optional `waitForTransactionReceipt`.

Particular behaviors worth noting:

- **`placeOrder.execute({ waitForReceipt: true })`** parses the `OrderPlaced` event out of the receipt logs and populates `meta.orderId`. Best-effort: decoding failures return the result unchanged, never an error.
- **`placeOrder.execute({ autoApprove: true })`** on SELL/PAY reads the user's USDC allowance. If short, it submits an approve tx first (awaited to receipt), then places the order, and surfaces `meta.approveTxHash`. BUY orders skip the allowance check entirely.
- **`setSellOrderUpi.prepare`** ECIES-encrypts `paymentAddress` with the merchant's pubkey before encoding calldata. The sender relay identity used for signing is surfaced in `meta.relayIdentity`.

### Relay identity

`createRelayIdentity()` is a pure function (generates a fresh keypair via viem). Persistence goes through a pluggable `RelayIdentityStore` interface:

```ts
interface RelayIdentityStore {
  get(): Promise<RelayIdentity | null>;
  set(identity: RelayIdentity): Promise<void>;
}
```

The SDK ships two adapters:
- `createInMemoryRelayStore()` — default when no store is configured.
- `createLocalStorageRelayStore({ key? })` — browser-only, opt-in.

Consumers on RN / SSR / encrypted storage implement the two-method interface themselves. Corrupt stored identities surface `RELAY_IDENTITY_CORRUPT` — the SDK never silently regenerates.

## React integration

`@p2pdotme/sdk/react` wraps the factories in a single `<SdkProvider>` + hooks. The provider memoizes each module on mount — primitive config keys trigger re-instantiation; object refs are captured once.

```tsx
<SdkProvider
  publicClient={publicClient}
  subgraphUrl={SUBGRAPH_URL}
  diamondAddress={DIAMOND_ADDRESS}
  usdcAddress={USDC_ADDRESS}
  reputationManagerAddress={REP_MANAGER} // only enables useZkkyc()
  fraudEngine={{ apiUrl, encryptionKey }} // only enables useFraudEngine()
  orders={{                                // optional:
    relayIdentityStore: createLocalStorageRelayStore(),
    relayIdentity,                         // pre-built identity (overrides store)
  }}
>
```

## Build & release

- **Build**: `tsup` with one entry per public subpath, outputting CJS + ESM + DTS to `dist/`. `@noble/*` is bundled into `orders/` + `react/` to insulate consumers from version skew.
- **Lint/format**: `biome`.
- **Tests**: `vitest`.
- **Versioning**: `changesets`.
- **CI**: none. Releases are published manually — see [docs/publishing.md](./docs/publishing.md).
