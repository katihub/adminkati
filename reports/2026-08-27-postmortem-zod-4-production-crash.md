# Postmortem — zod 4 crashes every production request

**Date:** 2026-08-27
**Kind:** postmortem
**Status:** resolved

## Question

Every request to the Vercel deployment returned a 500 with an unhandled error, before any page
rendered:

```
[request error] [unhandled] [GET] https://nowtech-admin-j0zjirakr-new-vision-creatives.vercel.app/
 file:///var/task/chunks/virtual/entry.mjs:14
import { z, defaultErrorMap, ZodIssueCode, ZodParsedType } from 'zod';
                                           ^^^^^^^^^^^^^
SyntaxError: The requested module 'zod' does not provide an export named 'ZodParsedType'
```

Local `bun run dev` was unaffected. Why did the same code fail only in production?

## Method

What was examined:

- `package.json` and `bun.lock` — declared and resolved `zod` versions.
- `grep -rl ZodParsedType node_modules` — which package emits the failing import.
- `node_modules/nuxt-zod-i18n/package.json`, `node_modules/nuxt-zod/package.json` — how each
  declares its `zod` requirement.
- The npm registry metadata for `nuxt-zod-i18n` — whether any published version supports zod 4.
- `.output/server/package.json` and `.output/server/chunks/virtual/entry.mjs` after a production
  build — what the Nitro bundle externalises and pins.
- A local run of the built server (`node .output/server/index.mjs`) to confirm the fix.

What was **not** examined:

- No redeploy to Vercel was performed — the fix is verified against a local production build only.
- No audit of other modules for the same dev/prod resolution hazard; only `zod` was traced.
- No test was added. There is no seam to test here: the failure is dependency resolution at module
  load, and the build itself is the check.

## Findings

**1. `nuxt-zod-i18n@1.12.1` is a zod 3 module.** Its runtime plugin,
`node_modules/nuxt-zod-i18n/dist/runtime/plugin.js:1`, opens with:

```js
import { defaultErrorMap, z, ZodIssueCode, ZodParsedType } from "zod";
```

`defaultErrorMap`, `ZodIssueCode`, and `ZodParsedType` are all zod 3 exports. None exist at the root
of zod 4.

**2. The module pins zod 3 as a hard `dependencies` entry, not a peer.** Its `package.json` declares
`"zod": "^3.25.76"` under `dependencies`, so bun installed a nested
`node_modules/nuxt-zod-i18n/node_modules/zod@3.25.76` beside the root `zod@4.4.3` that
`package.json` had requested via `"^3.25.0 || ^4.0.0"`.

**3. Dev resolves the nested copy; production does not.** Vite resolves the plugin's `zod` import
relative to the importing file, finding the nested 3.25.76 — so dev worked. The Nitro build
externalises `zod` and hoists the import into `chunks/virtual/entry.mjs`, where Node resolves it
from `/var/task/node_modules/zod`, i.e. the root 4.4.3. The mismatch only ever surfaces in the
deployed function, at import time, which is why it took down every route including `/`.

**4. There is no zod-4-compatible release to upgrade to.** `nuxt-zod-i18n`'s `dist-tags.latest` is
1.12.1, the version already installed, and every published version back to 1.11.2 depends on zod 3.
Upgrading out of the problem is not available.

**5. Nothing in the app depends on zod 4.** `grep -rn "from ['\"]zod" app i18n scripts nuxt.config.ts test`
returns no matches — the repo is a scaffold and no schema has been written yet, so pinning down
costs nothing today.

## Fix

`package.json` → `"zod": "^3.25.76"` (was `"^3.25.0 || ^4.0.0"`), then `bun install`.

3.25.x is zod's bridge release: it keeps the v3 API at the package root, which is what
`nuxt-zod-i18n` needs, and ships the v4 API at the `zod/v4` subpath, which is what
`app/schemas/` should import when schemas start landing. `nuxt-zod`'s peer range
(`^3.25.0 || ^4.0.0`) is satisfied either way.

Verification, all observed:

- `bun install` → `+ zod@3.25.76 (v4.4.3 available)`.
- `bun run build` → `✨ Build complete!`, and `.output/server/package.json` now declares
  `"zod": "3.25.76"` where it previously carried 4.4.3.
- `node .output/server/index.mjs` + `curl -o /dev/null -w "%{http_code}" http://localhost:3123/`
  → `200`, with the server log recording `"path":"/","status":200`. Previously this import threw
  before the first response.

A nested `node_modules/nuxt-zod-i18n/node_modules/zod` still exists after the install, but it is now
3.25.76 as well — the same version as the root, so the dev/prod split that caused the incident is
gone.

## Recommendation

- **Keep `zod` on `^3.25.76`.** A bump to 4 reintroduces this exact crash, and it will pass lint,
  typecheck, tests, and local dev before failing on every production request. Recorded as a gotcha in
  `AGENTS.md`.
- **Import the v4 API from `zod/v4`** in `app/schemas/`, not from `zod`, so a future unpin is a
  one-line change rather than a rewrite.
- **Revisit when `nuxt-zod-i18n` ships zod 4 support**, or drop the module — it exists only to
  localise zod's error messages, which `nuxt-zod` plus a hand-written error map could also do.
- **The class of bug is worth a guard.** Dev-only resolution of a nested dependency is invisible to
  every gate in this repo; CI runs `build` but not the built server. A smoke request against
  `.output/server` after build would have caught it before deploy.
