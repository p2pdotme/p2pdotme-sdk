# @p2pdotme/sdk/zkkyc

ZK-based KYC verification for P2P.me. Two layers:

1. **Transaction preparation** (`createZkkyc(config)`) — encodes calldata for the on-chain reputation-manager writes (social verify, Aadhaar, ZK Passport).
2. **UX flow orchestrators** (`createReclaimFlow`, `createZkPassportFlow`) — run the user-facing verification flow and return proof data ready to feed into the preparation layer.

Transaction submission stays on the consumer's side — this module doesn't take a `WalletClient`.

## Supported verifiers

| Flow | Calldata helper | Orchestrator | Peer dependency |
|------|-----------------|--------------|-----------------|
| Reclaim (social verify) | `prepareSocialVerify` | `createReclaimFlow` | `@reclaimprotocol/js-sdk` |
| Anon Aadhaar | `prepareSubmitAnonAadharProof` | — (consumer-driven) | — |
| ZK Passport | `prepareZkPassportRegister` | `createZkPassportFlow` | `@zkpassport/sdk` |
| simple-kyc (hosted passport wizard) | `prepareSubmitKycAttestation` | `createSimpleKycFlow` / `resumeSimpleKycFlow` | — |
| BVN | `prepareSubmitBvnAttestation` | `createBvnFlow` | — |
| Liveness (hosted face-only wizard) | `prepareSubmitLivenessAttestation` | `createLivenessFlow` / `resumeLivenessFlow` | — |

Both peer dependencies are loaded via dynamic `import()` at runtime. Missing peer → `ZkkycError` with code `PEER_DEPENDENCY_MISSING`.

### Passport vs liveness — two services, not one flow with a flag

They look interchangeable (same session/redeem endpoints, same attestation
struct) and are not. Getting this wrong fails at `ecrecover`, on-chain, after
the user has already verified:

| | passport (simple-kyc) | liveness |
|---|---|---|
| `baseUrl` | the **kyc** proxy (`passport-proxy.p2p.cool`) | the **liveness** proxy (`liveness-proxy.p2p.cool`) |
| EIP-712 domain | `KycVerifier` | `LivenessVerifier` |
| on-chain function | `submitKycAttestation` | `submitLivenessAttestation` |
| `country` | **required** (the wizard skips its country step) | not accepted — no document is read |
| tenant registry | simple-kyc's DB | the liveness service's own DB |

A tenant slug existing on one backend says nothing about the other: a slug has
to be registered separately on each, against the same contract address.

## Usage

```ts
import { createZkkyc, createReclaimFlow } from "@p2pdotme/sdk/zkkyc";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// 1. Initialize the Reclaim session (on page load). This calls your
//    reclaim-session-service, which mints and signs the proof request, so the
//    request URL is ready immediately for display as a QR / deep link.
const sessionResult = await createReclaimFlow({
  sessionEndpoint: RECLAIM_BASE_URL,
  tenant: "p2p",
  platform: "github",
  walletAddress: account.address,
  redirectUrl: `${window.location.origin}/limits`,
  onStatus: (s) => console.log(s),
});
if (sessionResult.isErr()) throw sessionResult.error;
const session = sessionResult.value;

// 2. Start verification (on user action — e.g. button click). This triggers the
//    in-app flow and polls until the proof arrives. `session.abort()` cancels it.
const proofResult = await session.start();
if (proofResult.isErr()) throw proofResult.error;

// 3. Prepare the on-chain calldata.
const zkkyc = createZkkyc({ reputationManagerAddress: REP_MANAGER_ADDRESS });
const prepared = zkkyc.prepareSocialVerify({
  _socialName: proofResult.value._socialName,
  proofs: [...proofResult.value.proofs],
});
if (prepared.isErr()) throw prepared.error;

// 3. Submit with your wallet.
const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
  account: privateKeyToAccount(PRIVATE_KEY),
});
const hash = await walletClient.sendTransaction({
  account,
  to: prepared.value.to,
  data: prepared.value.data,
  value: 0n,
});
```

## API

### `createZkkyc(config)`

| Config | Type | Description |
|--------|------|-------------|
| `reputationManagerAddress` | `Address` | Reputation manager contract |

Returns:

- **`prepareSocialVerify(params)`** → `Result<{ to, data }, ZkkycError>`  — calldata for `socialVerify` (Reclaim proofs).
- **`prepareSubmitAnonAadharProof(params)`** → `Result<{ to, data }, ZkkycError>`  — calldata for Anon Aadhaar proof submission.
- **`prepareZkPassportRegister(params)`** → `Result<{ to, data }, ZkkycError>`  — calldata for ZK Passport registration.

All three are pure encoders; no network, no wallet.

### `createReclaimFlow(params)` → `ResultAsync<ReclaimSession, ZkkycError>`

Initializes a Reclaim session and returns it. `init()` runs eagerly, so call this on page load — the request URL is surfaced via the `session_created` `onStatus` event (and on `session.requestUrl`) for immediate QR / deep-link display. Calling `session.start()` (on user action, e.g. a button click) triggers the in-app flow, polls the Reclaim API until a proof arrives, transforms it for on-chain use, and resolves with `ReclaimProofResult`. `session.abort()` cancels in-flight polling.

Single-object `ReclaimFlowParams` (app-level config + per-call options merged):

| Param | Type | Notes |
|-------|------|-------|
| `sessionEndpoint` | `string` | Base URL of your reclaim-session-service |
| `tenant` | `"p2p" \| "coinsme"` | Selects the app's copy on the service |
| `platform` | `"linkedin" \| "github" \| "x" \| "instagram" \| "facebook" \| "binance"` | — |
| `walletAddress` | `Address` | Bound into the Reclaim context |
| `redirectUrl` | `string?` | Required to start a session; service appends `?sessionId=…&socialPlatform=…` |
| `sessionId` | `string?` | Resume polling an existing session (no service call) |
| `locale` | `"en" \| "es" \| "hi" \| "id" \| "pt"` | Language of the Reclaim UI message; the wording is owned by the service |
| `onStatus` | `(status) => void` | `session_created` / `polling_started` / `proof_received` / `proof_transformed` |
| `signal` | `AbortSignal?` | Cancel polling |
| `pollingIntervalMs` | `number` (default `5000`) | — |

Errors: `PEER_DEPENDENCY_MISSING`, `RECLAIM_SESSION_ENDPOINT_FAILED`, `RECLAIM_POLLING_ABORTED`, `RECLAIM_PROOF_INVALID`, `VALIDATION_ERROR`, `ENCODING_ERROR`.

> **The app secret never reaches the browser.** It is a private key whose address *is* the appId, and bundlers inline build-time env vars into shipped JS. `createReclaimFlow` calls your session service, which holds the secret, mints the proof request, and returns `toJsonString()` output — appId / providerId / sessionId / signature, no secret. The client rebuilds it with `fromJsonString`. The service also owns the providerId and the context message, so neither can be steered by whoever calls it.

### `createZkPassportFlow(params)` → `ResultAsync<ZkPassportProofResult, ZkkycError>`

Runs the ZKPassport verification flow.

Single-object `ZkPassportFlowParams`:

| Param | Type | Notes |
|-------|------|-------|
| `domain` | `string` | **Required.** Your app's domain. No default — prevents impersonation. |
| `name` | `string?` | App name shown in ZKPassport UI. Defaults to `"ZKPassport"`. |
| `logo` | `string?` | Logo URL |
| `purpose` | `string?` | Defaults to `"Prove your personhood"` |
| `walletAddress` | `Address` | Bound into the ZKPassport request |
| `onStatus` | `(status) => void` | Status callback across the flow |

Needs `@zkpassport/sdk` installed as a peer dep.

## Errors

```ts
type ZkkycErrorCode =
  | "VALIDATION_ERROR"
  | "ENCODING_ERROR"
  | "PEER_DEPENDENCY_MISSING"
  | "RECLAIM_POLLING_ABORTED"
  | "RECLAIM_PROOF_INVALID"
  | "ZK_PASSPORT_QUERY_FAILED"
  | "ZK_PASSPORT_PROOF_INVALID";
```

## Example

See [`example/zk-verify-instagram.ts`](../../example/zk-verify-instagram.ts) for a runnable Reclaim walkthrough.
