# Publishing

Releases are published manually to the public npm registry as `@p2pdotme/sdk`. There is no CI automation — every publish is a deliberate local action.

## Prerequisites

- npm account with publish rights to the `@p2pdotme` scope
- npm token set in your environment: `export NPM_TOKEN=npm_...`

## Release flow

### 1. Create a changeset

Run this on your feature branch before merging:

```bash
bun run changeset
```

Follow the prompts — choose `patch` / `minor` / `major` and write a one-line summary. Commit the generated `.changeset/*.md` file with your PR.

| Change type | When to use |
|---|---|
| `patch` | Bug fixes, internal refactors |
| `minor` | New public API, new module export |
| `major` | Breaking change to an existing public API |

### 2. Apply version bump

After merging to `main`, bump the version and update the changelog:

```bash
git checkout main && git pull
bunx changeset version
git add -A && git commit -m "chore: version packages"
```

### 3. Build and publish

```bash
NPM_TOKEN=npm_... bun run release   # bun run build && changeset publish
git push --follow-tags
```

`bun run release` builds, publishes to `https://registry.npmjs.org` with `--access public`, and creates a git tag. Push the tag so the release is traceable.

## Installing in a consumer project

No auth needed — the package is public.

```bash
npm install @p2pdotme/sdk
# or
bun add @p2pdotme/sdk
```

```ts
import { createOrderRouter } from "@p2pdotme/sdk/order-routing";
import { createProfile } from "@p2pdotme/sdk/profile";
import { createPayloadGenerator } from "@p2pdotme/sdk/payload";
import { createFraudEngine } from "@p2pdotme/sdk/fraud-engine";
import { SdkProvider, useOrderRouter } from "@p2pdotme/sdk/react";
import { parseQR } from "@p2pdotme/sdk/qr-parsers";
```

## Troubleshooting

| Error | Fix |
|---|---|
| `401 Unauthorized` | `NPM_TOKEN` is missing or expired — regenerate at npmjs.com |
| `409 Conflict` | Version already published — run `bunx changeset version` first |
| `403 Forbidden` | Token lacks publish rights to `@p2pdotme` scope |
