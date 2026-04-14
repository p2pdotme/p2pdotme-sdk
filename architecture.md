# Order Routing SDK

# `@p2pdotme/core/order-routing` SDK

## 1. What We're Building

A standalone TypeScript SDK that encapsulates the **full order routing flow**: fetching circles from subgraph, selecting the best circle and validating on-chain eligibility. Framework-agnostic core with React bindings. Wallet-agnostic (consumers bring their own viem client).

---

## 2. Architecture

```
@p2pdotme/order-routing
├── core/                     # Framework-agnostic, zero React dependency
│   ├── client.ts             # OrderRoutingClient — main entry point
│   ├── routing.ts            # Epsilon-greedy selection algorithm
│   ├── subgraph/             # Circle data fetching
│   │   ├── client.ts         # GraphQL client (fetch-based)
│   │   └── queries.ts        # CirclesForRouting query
│   ├── contracts/            # On-chain interactions (viem-based)
│   │   ├── abis.ts           # Circle & OrderFlow ABIs
│   │   └── actions.ts        # checkEligibility (on-chain read)
│   ├── validation.ts         # Zod schemas for all params
│   ├── types.ts              # All public types
│   └── errors.ts             # SDK error types
├── react/                    # React bindings (optional import)
│   ├── provider.tsx          # <OrderRoutingProvider config={...}>
│   ├── use-order-routing.ts  # useOrderRouting() hook
│   └── index.ts
└── index.ts                  # Public API re-exports
```

---

## 3. Key Design Decisions

| Decision | Rationale |
| --- | --- |
| **viem as the chain abstraction** | Already used internally. Consumers pass a `PublicClient` for reads (eligibility checks). Works with ethers via viem adapters, wagmi natively, thirdweb via its viem compatibility. |
| **Subgraph built-in** | SDK owns the GraphQL query and fetch. Consumer only provides the subgraph URL. |
| **neverthrow for Result types** | Matches current codebase. All SDK methods return `ResultAsync<T, OrderRoutingError>`. |

---

## 4. Public API Surface

### Core (vanilla TS)

```tsx
// Initialize 
const router = createOrderRouter({
  subgraphUrl: "https://...",
  publicClient: viemPublicClient,      // for reads (eligibility check)
  contractAddress: "0x...",            // Diamond contract
});

// Full flow: fetch circles → select → validate → return circleId
const result = await router.selectCircle({
  currency: "INR",
  user: "0x...",
  usdtAmount: 100n,
  fiatAmount: 8300n,
  orderType: 1n,
  preferredPCConfigId: 0n,
});
// Result<bigint, OrderRoutingError>
// Use the circleId in user-app-spa for placeOrder, assignMerchants, etc.
```

### React Bindings

```tsx
import { OrderRoutingProvider, useOrderRouting } from "@p2pdotme/order-routing/react";

// App.tsx
<OrderRoutingProvider config={{ subgraphUrl, publicClient, contractAddress }}>
  <OrderPage />
</OrderRoutingProvider>

// OrderPage.tsx
const { selectCircle } = useOrderRouting();
```

---

## 5. What Stays in `user-app-spa`

- Thirdweb-specific adapter layer (wallet signing, tx submission)
- `placeOrder`, `assignMerchants` contract interactions (use circleId from SDK)
- All non-order-routing contract interactions

---

## 6. Dependencies

```json
{
  "dependencies": {
    "viem": "^2.x",
    "neverthrow": "^7.x",
    "zod": "^3.x"
  },
  "peerDependencies": {
    "react": "^18 || ^19"
  }
}
```

---

## 7. Phases

### Phase 1 — Core extraction (MVP)

- [ ]  New repo `@p2pdotme/order-routing`
- [ ]  Extract routing algorithm (epsilon-greedy)
- [ ]  Extract subgraph client + circle query
- [ ]  Extract contract ABIs + `checkCircleEligibility` (read-only)
- [ ]  Extract validation schemas
- [ ]  `createOrderRouter()` factory function
- [ ]  Unit tests for epsilon-greedy strategy
- [ ]  Integration test with mocked subgraph + contract reads
- [ ]  Publish to npm (or private registry)

### Phase 2 — React bindings

- [ ]  `OrderRoutingProvider` + `useOrderRouting` hook
- [ ]  Migrate `user-app-spa` to consume SDK
- [ ]  Remove duplicated code from `user-app-spa`

### Phase 3 — Extensibility

- [ ]  Event hooks: `onCircleSelected`, `onValidationFailed`, `onRetry`
- [ ]  Configurable retry policy (currently hardcoded to 3 attempts)
- [ ]  Logging abstraction (replace `console.log` with injectable logger)

---

## 8. Repo & Build Setup

| Concern | Choice |
| --- | --- |
| **Monorepo vs standalone** | Standalone repo |
| **Build tool** | `tsup` (esbuild-based, ESM + CJS dual output) |
| **Testing** | `vitest` |
| **Package manager** | `bun` |
| **Linting** | `biome` |
| **CI** | None — releases are published manually (see [docs/publishing.md](./docs/publishing.md)) |
| **Versioning** | `changesets` for semver + changelogs |

### Package exports

```jsx
  {
    "exports": {
      ".": {
        "import": "./dist/index.mjs",
        "require": "./dist/index.cjs",
        "types": "./dist/index.d.ts"
      },
      "./react": {
        "import": "./dist/react.mjs",
        "require": "./dist/react.cjs",
        "types": "./dist/react.d.ts"
      }
    }
  }
```