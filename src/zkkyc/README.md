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

Both peer dependencies are loaded via dynamic `import()` at runtime. Missing peer → `ZkkycError` with code `PEER_DEPENDENCY_MISSING`.

## Usage

```ts
import {
  createZkkyc,
  createReclaimFlow,
  DEFAULT_RECLAIM_PROVIDER_IDS,
} from "@p2pdotme/sdk/zkkyc";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// 1. Run the Reclaim UX flow — user scans the deep link on their phone and
//    completes the verification; the promise resolves with the proof.
const proofResult = await createReclaimFlow({
  appId: RECLAIM_APP_ID,
  appSecret: RECLAIM_APP_SECRET,
  providerIds: DEFAULT_RECLAIM_PROVIDER_IDS,
  platform: "github",
  walletAddress: account.address,
  onStatus: (s) => console.log(s),
});
if (proofResult.isErr()) throw proofResult.error;

// 2. Prepare the on-chain calldata.
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

### `createReclaimFlow(params)` → `ResultAsync<ReclaimProofResult, ZkkycError>`

Runs the full Reclaim flow: initializes a session, surfaces the request URL via `onStatus` so the consumer can display a QR / deep-link, polls the Reclaim API until a proof arrives, transforms the proof for on-chain use, and returns it.

Single-object `ReclaimFlowParams` (app-level config + per-call options merged):

| Param | Type | Notes |
|-------|------|-------|
| `appId` | `string` | Reclaim app id |
| `appSecret` | `string` | Reclaim app secret |
| `providerIds` | `Record<SocialPlatform, string>` | Use `DEFAULT_RECLAIM_PROVIDER_IDS` for sensible defaults |
| `platform` | `"linkedin" \| "github" \| "x" \| "instagram" \| "facebook"` | — |
| `walletAddress` | `Address` | Bound into the Reclaim context |
| `redirectUrl` | `string?` | Appends `?sessionId=…&socialPlatform=…` |
| `sessionId` | `string?` | Resume polling an existing session |
| `contextDescription` | `string?` | Shown in Reclaim UI |
| `onStatus` | `(status) => void` | `session_created` / `polling_started` / `proof_received` / `proof_transformed` |
| `signal` | `AbortSignal?` | Cancel polling |
| `pollingIntervalMs` | `number` (default `5000`) | — |

Errors: `PEER_DEPENDENCY_MISSING`, `RECLAIM_POLLING_ABORTED`, `RECLAIM_PROOF_INVALID`, `VALIDATION_ERROR`, `ENCODING_ERROR`.

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
