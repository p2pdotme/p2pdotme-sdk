# @p2pdotme/sdk/fraud-engine

Fraud detection and risk scoring for P2P.me buy orders. Runs a server-side fraud check before an order is placed on-chain, then links the approved activity log to the resulting on-chain order ID.

## What it does

Wallet-based P2P flows are a high-value target for account takeover, stolen-card cash-out, and synthetic-identity abuse. The fraud engine gives the backend the signals it needs to score an order *before* it is committed on-chain:

- Runs a fraud check against every buy order and blocks placement if the backend rejects it.
- Captures a stable device fingerprint (via [FingerprintJS](https://fingerprint.com/)) and a behavioral session signal (via [SEON](https://seon.io/)) so the same device/network can be correlated across accounts and sessions.
- Signs every request with the user's wallet (EIP-191) so the backend can verify the caller controls the address.
- Encrypts the activity payload end-to-end (AES-256-GCM AEAD) so sensitive context never travels in plaintext, even to proxies.
- Links the fraud-check record to the on-chain order ID after placement, so disputes and investigations can trace an order back to the exact device/session that created it.

All of this runs transparently around the consumer's own `placeOrder` callback — the SDK never submits transactions itself.

## What data is collected

The fraud engine collects the minimum signals needed to score risk:

- **Device signals** — browser/OS characteristics, display and locale settings, network info, and a stable device fingerprint.
- **Session signals** — SEON's behavioral session token.
- **Network signals** — the caller's public IP.
- **Order context** — the amount, currency, fee, and recipient address of the order being placed.
- **User context (optional)** — login method and contact identifiers, passed only if the consumer chooses to forward them.
- **Wallet address** — the subject wallet placing the order, plus a signed proof of control.

Payloads are encrypted before leaving the browser and bound to the request via AEAD, so they can only be decrypted by the fraud backend.

## Installation

```bash
bun add @p2pdotme/sdk
```

The fraud engine pulls in `@fingerprintjs/fingerprintjs` and `@seontechnologies/seon-javascript-sdk` as direct dependencies — no extra setup required.

## Usage

### React (recommended)

Pass `fraudEngine` config to `SdkProvider` and read the instance via the no-arg `useFraudEngine()` hook. The SDK creates the instance once, calls `init()` on mount, and exposes it on context alongside `profile`, `prices`, and `orders`.

```tsx
import { SdkProvider, useFraudEngine } from "@p2pdotme/sdk/react";

function App() {
  return (
    <SdkProvider
      publicClient={publicClient}
      subgraphUrl={SUBGRAPH_URL}
      diamondAddress={DIAMOND_ADDRESS}
      usdcAddress={USDC_ADDRESS}
      fraudEngine={{
        apiUrl: import.meta.env.VITE_FRAUD_ENGINE_API_URL,
        encryptionKey: import.meta.env.VITE_FRAUD_ENGINE_ENCRYPTION_KEY,
        seonRegion: "asia",
      }}
    >
      <BuyFlow />
    </SdkProvider>
  );
}

function BuyFlow() {
  const fraudEngine = useFraudEngine();

  async function handleBuy() {
    const result = await fraudEngine.processBuyOrder({
      signer,
      orderDetails: {
        cryptoAmount: 100,
        fiatAmount: 8500,
        currency: "INR",
        recipientAddress: "0x...",
        fee: 0.5,
        amountAfterFee: 99.5,
      },
      userDetails: { country: "IN", loginMethod: "google" },
      placeOrder: async () => {
        // consumer submits the tx and returns the on-chain order ID
        return await submitOrderOnChain();
      },
    });

    if (result.isErr()) return showError(result.error);
    if (result.value.status === "rejected") return showBlocked(result.value.message);
    navigate(`/orders/${result.value.orderId}`);
  }
}
```

### Non-React

```ts
import { createFraudEngine } from "@p2pdotme/sdk/fraud-engine";

const fraudEngine = createFraudEngine({
  apiUrl: FRAUD_ENGINE_API_URL,
  encryptionKey: FRAUD_ENGINE_ENCRYPTION_KEY,
  seonRegion: "asia",
});

await fraudEngine.init(); // call once at app startup
```

## API

### `processBuyOrder(params)` — recommended

Full orchestration: fraud check → place order → auto-link. Use this for most consumers.

- Runs the fraud check. If rejected, returns `{ status: "rejected" }` **without calling `placeOrder`**.
- If approved, invokes the `placeOrder` callback, auto-links the activity log to the returned order ID, returns `{ status: "placed", orderId }`.
- **Fail-open**: if the fraud check API errors, the order is still placed (linking is skipped since there's no activity log).
- Linking is fire-and-forget — if it fails after placement, the error is logged, not propagated.

```ts
type ProcessBuyOrderResult =
  | { status: "placed"; orderId: string }
  | { status: "rejected"; message: string };
```

### `checkBuyOrder(params)` — low-level

Runs the fraud check only. Returns a `FraudCheckResult` with a `linkOrder(orderId)` method for manual linking after placement. Use this when you need finer control over the order-placement step.

### `logFingerprint({ signer })`

Logs the current device's FingerprintJS visitor ID against the wallet address. Useful at login to build a device-to-wallet history independent of any order activity.

### `init()`

Initializes SEON and preloads the FingerprintJS agent. Called automatically by `SdkProvider` on mount — only call manually in non-React environments.

### `cleanupSeonStorage()`

Removes SEON localStorage entries. Call on logout.

## Errors

All async methods return `ResultAsync<T, FraudEngineError>` ([neverthrow](https://github.com/supermacro/neverthrow)) — no thrown exceptions.

```ts
type FraudEngineErrorCode =
  | "API_ERROR"
  | "ENCRYPTION_ERROR"
  | "SIGNING_ERROR"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "PLACE_ORDER_ERROR";
```

## Example

No fraud-engine-specific script ships with the SDK — wire it into your own
buy flow following the React snippet above. See [`example/`](../../example/)
for the plain order lifecycle scripts (no fraud engine).
