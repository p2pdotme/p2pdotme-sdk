---
"@p2pdotme/sdk": minor
---

zkkyc: take a Reclaim session endpoint instead of the app secret

`createReclaimFlow` no longer accepts `appId`, `appSecret` or `providerIds`. It now takes
`sessionEndpoint` (a backend that holds the secret and mints the proof request) plus `tenant`,
and `contextDescription` is replaced by `locale`.

**This is a breaking change to `ReclaimFlowParams`** — callers must migrate:

```diff
 const session = await createReclaimFlow({
-  appId: RECLAIM_APP_ID,
-  appSecret: RECLAIM_APP_SECRET,
-  providerIds: DEFAULT_RECLAIM_PROVIDER_IDS,
+  sessionEndpoint: RECLAIM_BASE_URL,
+  tenant: "p2p",
   platform: "github",
   walletAddress: account.address,
   redirectUrl: `${window.location.origin}/limits`,
-  contextDescription: t("SOCIAL_VERIFICATION", { name }),
+  locale: "en",
 });
```

Why: the app secret is a private key whose address *is* the appId, and bundlers inline build-time
env vars into shipped JS — so any client that passed it shipped it. The SDK now calls a session
service which returns `ReclaimProofRequest.toJsonString()` output (appId / providerId / sessionId /
signature, no secret) and rebuilds it with `fromJsonString`.

`providerId` and the Reclaim context message are derived server-side from `platform` and
`tenant` + `locale`, so neither can be steered by whoever calls the endpoint. That matters because
the context message renders inside the Reclaim Verifier app under the consuming app's identity.

Adds error code `RECLAIM_SESSION_ENDPOINT_FAILED` and exports `ReclaimLocale` / `ReclaimTenant`.
`DEFAULT_RECLAIM_PROVIDER_IDS` is still exported but no longer needed by consumers.
