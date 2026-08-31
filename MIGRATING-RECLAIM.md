# Migrating to the Reclaim session endpoint (`@p2pdotme/sdk` 1.2.23)

`createReclaimFlow` no longer accepts the Reclaim **app secret**. It now calls a
backend that holds the secret and mints the proof request for you.

**This is a breaking change to `ReclaimFlowParams`.** If your app calls
`createReclaimFlow`, you must migrate. If it doesn't, upgrading is a no-op — read
[Do I need to do anything?](#do-i-need-to-do-anything) and stop there.

> ⚠️ **It shipped in 1.2.23 — a patch bump, not a major.** So the version number
> does not warn you, and a `^1.2.x` range upgrades you into it automatically. If
> you call `createReclaimFlow` and pin with a caret, you can be broken by a routine
> `npm install`. Pin exactly, or migrate now.

---

## Why

`RECLAIM_APP_SECRET` is a secp256k1 private key whose address **is** our Reclaim
`appId`. Apps passed it to the SDK as a `VITE_*` (or `NEXT_PUBLIC_*`) variable —
and bundlers inline those at build time, so it shipped in plaintext inside
`dist/assets/index-*.js`. Anyone who opened devtools had it.

What that exposed: minting unlimited verification sessions against our Reclaim
quota, and running verification flows that render **as us** inside the Reclaim
Verifier app, with an attacker-controlled callback.

What it did **not** expose: the ability to forge a verification. Proofs are signed
by Reclaim's attestor witnesses and checked on-chain by `RpHelper.socialVerify`;
the app secret plays no part in that.

So the fix is not "hide the variable better" — a build-time variable cannot be
hidden. The secret has to move server-side, which is what this release does.

---

## Do I need to do anything?

| Your app | Action |
|---|---|
| Calls `createReclaimFlow` | **Migrate** — follow this guide |
| Sets `VITE_RECLAIM_APP_SECRET` / `RECLAIM_APP_SECRET` anywhere | **Migrate**, and treat that secret as compromised |
| Uses other SDK modules only (orders, prices, profile, stake, fraud-engine, simple-kyc, BVN, liveness) | **Nothing.** Bump the version and move on |

Quick check:

```bash
grep -rn "createReclaimFlow\|RECLAIM_APP_SECRET" src/
```

No hits means you are not affected.

---

## The change

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
   onStatus: (s) => console.log(s.type),
 });
```

| Removed | Replaced by |
|---|---|
| `appId` | — derived server-side from your `tenant` |
| `appSecret` | — never leaves the service |
| `providerIds` | — derived server-side from `platform` |
| `contextDescription` | `locale` (see below) |

Everything else is unchanged: `session.requestUrl`, `session.start()`,
`session.abort()`, the `onStatus` events, `ReclaimProofResult`, resuming with
`sessionId`, and the shape you pass to `prepareSocialVerify`.

`DEFAULT_RECLAIM_PROVIDER_IDS` is still exported (provider IDs are not secret) but
you no longer need it.

### Why `contextDescription` became `locale`

That string is written into the proof request and **rendered to the user inside
the Reclaim Verifier app, under our app identity**. If callers could still supply
it, anyone able to reach the endpoint could put arbitrary text in front of a
victim under a genuinely-signed session — which is the brand-impersonation half of
the original problem. Leaving it caller-controlled would have relocated the
vulnerability, not fixed it.

So the service owns the wording per tenant per locale, and you choose a language:
`"en" | "es" | "hi" | "id" | "pt"` (defaults to `"en"`).

---

## Steps

### 1. Bump the SDK

```bash
npm install @p2pdotme/sdk@^1.2.23    # or bun add / pnpm add
```

### 2. Point at the session service

```bash
# .env
VITE_RECLAIM_BASE_URL=https://reclaim-proxy.p2p.cool
```

> **Use the custom domain, not the `*.up.railway.app` hostname.** That hostname is
> DNS-blocked by some Indian ISPs, so a client pointed at it fails silently in one
> of our biggest markets.

Then replace your `RECLAIM_APP` constant:

```ts
export const RECLAIM_BASE_URL =
  (import.meta.env.VITE_RECLAIM_BASE_URL as string | undefined) ??
  "http://localhost:8000";
```

### 3. Delete the secret everywhere

`.env`, `.env.example`, `vite-env.d.ts` (or equivalent typings), your README, **and
your deploy platform's environment variables** — Netlify, Vercel, Railway, CI.

Deleting it from `.env` alone does nothing if it is still set in the dashboard.

### 4. Get a tenant

`tenant` selects which app's copy the service renders. Currently defined:

| tenant | app | status |
|---|---|---|
| `p2p` | user-app-client (app.p2p.me, app.p2p.lol) | live |
| `coinsme` | coins.me (app.coins.me) | live |
| `0xramp` | 0xramp.app | ⏳ pending [reclaim-session-service#2](https://github.com/p2pdotme/reclaim-session-service/pull/2) — merge **and deploy** before use |

**If your app is not listed, it needs a tenant added before it will work** — the
service rejects unknown tenants with `400 invalid_request`. Open a PR against
[`reclaim-session-service`](https://github.com/p2pdotme/reclaim-session-service)
adding your entry to `src/helpers/tenants.ts` with the message copy for all five
locales, or ask the team. Do not reuse another app's tenant: the text your users
see would be wrong.

### 5. Get your origin and redirect host allowlisted

The service validates both:

- `ALLOWED_ORIGINS` — the exact browser origin you call from
- `ALLOWED_REDIRECT_HOSTS` — the host of your `redirectUrl`

Your production origin and any preview/staging origins must be added, or you get
`403` on preflight and `400 redirectUrl host is not allowed`. Ask the team to add
them.

### 6. Verify

```bash
npm run build
grep -r "<the old secret>" dist/     # must return nothing
```

Then run one real verification end to end and confirm the proof still lands
on-chain.

---

## Local development

Run the service yourself rather than pointing at production, so you can allowlist
`localhost` freely:

```bash
git clone https://github.com/p2pdotme/reclaim-session-service
cd reclaim-session-service
npm install
cp .env.example .env      # fill in RECLAIM_APP_ID / RECLAIM_APP_SECRET
npm run dev               # listens on :8000
```

```bash
# your app's .env
VITE_RECLAIM_BASE_URL=http://localhost:8000
```

`redirectUrl` must be `https` unless the host is `localhost` / `127.0.0.1`, which
may use `http` and a port. A LAN IP such as `http://192.168.1.5:5173` is rejected —
for phone testing use an HTTPS tunnel, and have its host allowlisted.

---

## Errors you may hit

| Symptom | Cause |
|---|---|
| `RECLAIM_SESSION_ENDPOINT_FAILED` | Service unreachable, or it rejected the request — check the message |
| `400 unknown tenant` | Your tenant is not registered (step 4) |
| `400 redirectUrl host is not allowed` | Host not in `ALLOWED_REDIRECT_HOSTS` (step 5) |
| `400 redirectUrl must be https` | Non-loopback `http` |
| `400 redirectUrl must not contain a fragment` / `credentials` / `a port` | The redirect is rebuilt from allowlisted parts; strip these |
| `403` on preflight | Origin not in `ALLOWED_ORIGINS` (step 5) |
| `429 rate_limited` | 30/IP/hour, 20/wallet/hour |
| `503 busy` | Concurrent mint ceiling; retry |
| Type error: `sessionEndpoint` not in `ReclaimFlowParams` | Still on an SDK older than 1.2.23 |

---

## Notes

- **Credentials will be rotated** once all apps have migrated. Any app still
  shipping the old `appId` stops verifying at that moment — migrate before then.
- The redirect gets `?sessionId=…&socialPlatform=…` appended with
  `searchParams.set()`, so if you pass those yourself they are overwritten.
- The iOS deep-link flow is unchanged, but the session is now minted over the
  network. Keep minting **off-gesture** (e.g. while a tutorial modal is shown) and
  call `session.start()` synchronously inside the user's tap, or iOS will refuse
  to launch the verifier app.

Questions: `#eng`, or open an issue on `reclaim-session-service`.
