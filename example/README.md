# Examples

Runnable scripts demonstrating `@p2pdotme/sdk`. Each file is self-contained —
open one, edit the `CONFIG` block at the top, run it.

## Running

From the repo root:

```bash
bun run build                          # build the SDK once
bun run example/fetch-inr-price.ts     # or any other script
```

The scripts import from `@p2pdotme/sdk/*` subpaths, which resolve against the
built `dist/` via the root `package.json` self-reference.

## Scripts

| File                       | What                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `fetch-inr-price.ts`       | Fetches the buy/sell price config for INR.                                                  |
| `fetch-order-status.ts`    | Fetches one order by id and prints its full state (read-only).                              |
| `check-current-limits.ts`  | Prints buy/sell tx limits for a given address + currency (read-only).                       |
| `make-buy-order.ts`        | Fraud-checks (INR only), places a BUY order, waits for a merchant, pauses for fiat, completes. |
| `make-sell-order.ts`       | Approves USDC, places a SELL order, sends encrypted payment address on acceptance, completes.|
| `make-pay-order.ts`        | Approves USDC, places a PAY order, sends encrypted payee address on acceptance, completes.  |
| `zk-verify-instagram.ts`   | Runs a Reclaim Instagram verification flow and prepares/submits `socialVerify` on-chain.    |

## Configuration

Each script has a clearly-marked `CONFIG` block at the top. Edit those
constants before running. None of the scripts read environment variables.

**This runs on Base mainnet.** The order scripts and `zk-verify-instagram.ts`
send real on-chain transactions when `PRIVATE_KEY` is filled in. Fund the
account with real USDC + gas on Base before running. To dry-run on a
testnet instead, swap `base` for `baseSepolia` (and the RPC URL) at the
top of the script.

## Fraud engine (INR buy orders)

`make-buy-order.ts` runs a fraud pre-check via `@p2pdotme/sdk/fraud-engine`
when `CURRENCY === "INR"`. Fill in `FRAUD_ENGINE_API_URL` and
`FRAUD_ENGINE_ENCRYPTION_KEY` in the script's CONFIG block. The fraud engine
is designed for browsers (device fingerprints + SEON session); running it
from a bun CLI works but collects empty device signals — the real check
should happen inside your web app.

## Reclaim peer dependency

The `zk-verify-instagram.ts` script needs `@reclaimprotocol/js-sdk`. Install
it in the repo root if you want to run that script:

```bash
bun add -d @reclaimprotocol/js-sdk
```

Without it the script fails fast with `PEER_DEPENDENCY_MISSING`.
