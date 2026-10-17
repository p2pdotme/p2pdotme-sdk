# @p2pdotme/sdk/payment-proof

Client for the P2P.me [encrypted-payment-proof](https://github.com/p2pdotme/encrypted-payment-proof) server. After a **completed SELL/PAY order**, the order creator can request a payment proof; the merchant / circle uploads it and a circle admin signs off. This module lets an integrator surface a proof pill, raise a request, and download an uploaded proof.

BUY orders settle on-chain — they have no proof flow.

Everything returns `ResultAsync` (no thrown exceptions). The wallet signs in **once per session**; the bearer token is cached and reused.

## Usage

```ts
import { createPaymentProof } from "@p2pdotme/sdk/payment-proof";

const proof = createPaymentProof({
  apiUrl: PROOF_API_URL,        // base URL of the proof server
  address: smartAccountAddress, // on-chain identity to claim
  chainId: 8453,                // must match the server's CHAIN_ID
  signMessage: (message) => walletClient.signMessage({ message }),
  storage: sessionStorage,      // optional — persist the token across reloads
});

// Public config (no wallet prompt) — hide the request control for a disabled currency.
const config = await proof.getPublicConfig();

// Proof pill: read the request status for a completed SELL/PAY order.
const status = await proof.getOrderProofRequest({ orderId });
status.match(
  (request) => console.log(request?.status ?? "no request"),
  (error) => console.error(`[${error.code}] ${error.message}`),
);

// Order creator raises a request.
await proof.requestProof({ orderId });
```

## API

### `createPaymentProof(config)`

| Config | Type | Description |
|--------|------|-------------|
| `apiUrl` | `string` | Base URL of the encrypted-payment-proof server |
| `address` | `Address` | On-chain identity to claim (smart-account for user/merchant apps, EOA for ops) |
| `chainId` | `number` | EIP-155 chain id the wallet is on (must match the server's `CHAIN_ID`) |
| `signMessage` | `(message: string) => Promise<string>` | EIP-191 `personal_sign`. Called at most once per session |
| `storage` | `SessionStorageLike?` | Optional bearer-token persistence (e.g. `sessionStorage`). In-memory if omitted |
| `fetch` | `typeof fetch?` | Override for tests / non-browser runtimes |

### `proof.getPublicConfig()` → `ResultAsync<PublicConfigDto, PaymentProofError>`

Currency denylist + request window. **Unauthenticated** — sends no wallet prompt.

### `proof.getOrderProofRequest({ orderId })` → `ResultAsync<ProofRequestDto | null, PaymentProofError>`

The proof request for one order, or `null` if none exists. Drives the proof pill.

### `proof.requestProof({ orderId, note? })` → `ResultAsync<ProofRequestDto, PaymentProofError>`

Raise a proof request for a completed SELL/PAY order (order creator only). `note` is optional raw bytes.

### `proof.listProofFiles({ requestId })` → `ResultAsync<ProofFileDto[], PaymentProofError>`

A request's proof files (metadata only).

### `proof.downloadProof({ requestId, fileId })` → `ResultAsync<Uint8Array, PaymentProofError>`

Fetch a short-lived token then download the raw file bytes in one call.

### `proof.hasSession()` → `boolean`

Synchronous probe: is there a cached, unexpired session? No network, no signature.

## Errors

```ts
type PaymentProofErrorCode =
  | "VALIDATION_ERROR"
  | "SESSION_ERROR"
  | "API_ERROR"
  | "NETWORK_ERROR";
```

The server's own error code (e.g. `WINDOW_EXPIRED`, `COUNTRY_DISABLED`, `FORBIDDEN`) is carried in `error.context.apiCode`, with the HTTP status in `error.context.status`.
