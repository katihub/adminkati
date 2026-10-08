# Postmortem — Node 26 `localStorage` and the aborted plugin chain

**Date:** 2026-09-01 · **Issue:** [NVC-17](https://linear.app/new-vision-creatives/issue/NVC-17/nuxt-test-env-windowlocalstorage-is-undefined-on-node-26)

## Question

Why does the `nuxt` vitest project fail on Node 26, and what is the smallest fix that makes it
version-independent rather than version-pinned?

## Method

Reproduced on a clean `development` (`6ad86d0`) under Node v26.8.1, tallied the distinct errors,
then probed the test environment's storage globals directly from inside a scratch spec. Confirmed
each conclusion by re-running under Node 24.19.0.

## Findings

### 1. The reported symptom is a minority of the failures

NVC-17 reports `window.localStorage.clear()` at `test/nuxt/app-initialization.test.ts:7` throwing.
That is real, but it is three of twenty failures. The tally on a clean base:

| Count | Error | Meaning |
| :-- | :-- | :-- |
| 4 | `Cannot read properties of undefined (reading 'setQueryData')` | `$queryClient` never provided |
| 3 | `Cannot read properties of undefined (reading 'clear')` | the spec's own storage calls, plus `$queryClient.clear()` |
| 2 | `Cannot read properties of null (reading 'type')` | downstream mount failure |
| 2 | `Cannot read properties of null (reading 'emitsOptions')` | downstream mount failure |

The dominant cause is **not** the spec. It is `app/plugins/i18n-storage.client.ts:13`, which read
`window.localStorage.getItem(…)` unguarded. A Nuxt plugin that throws aborts the plugin chain, so
`app/plugins/vue-query.ts` — which sorts after it — never ran, and `$queryClient` was never
provided. Coverage confirmed it: `i18n-storage.client.ts` at 41% with lines 16–30 unreached,
`vue-query.ts` at 0%.

The only surfaced diagnostic was a bare `[NUXT_E1005]` on stderr. Nuxt's default reporter prints
the error code and discards the cause, so nothing named the plugin or the line.

**Consequence for the fix:** the issue's preferred option 3 — stub the storage seam in the specs —
would have fixed 3 of 20 failures and left the plugin defect in place.

### 2. The plugin defect is a latent production bug, not a test-only one

`localStorage` is unreachable in real browsers too: Safari in private mode, and any browser with
site data blocked, **throw on access** rather than returning `null`. In those browsers the same
unguarded read would have aborted the plugin chain and taken `vue-query` down with it — TanStack
Query owns all API state, so the app would have failed to boot for those users.

Node 26 is how we found it. It was never only about Node 26.

### 3. happy-dom is not at fault; one property is squatted on

Probing the environment:

```json
{
  "globalLocalStorage":  "undefined",
  "windowLocalStorage":  "undefined",
  "windowIsGlobal":      true,
  "storageCtor":         "function",
  "descriptor":          { "configurable": true, "hasGet": true },
  "sessionStorage":      "object"
}
```

`sessionStorage` is a working happy-dom `Storage`, and `new Storage()` constructs and round-trips
correctly. So happy-dom installs its storage fine. Node 26 ships an experimental `localStorage`
global that stays `undefined` without `--localstorage-file`; it occupies that one slot on
`globalThis` (which *is* `window` here) as an own accessor, and happy-dom never installs over it.

The descriptor is `configurable: true`, so the slot can simply be handed back.

### 4. CI was green by accident

`.github/workflows/quality.yml` has no `actions/setup-node`; it installs bun and runs
`bunx vitest run` against whatever Node the `ubuntu-latest` image preinstalls — Node 24 today. CI
would have started failing on the next runner image bump, with no code change to blame.

## What was changed

| Change | Why |
| :-- | :-- |
| `app/utils/local-storage.ts` — new `readStoredValue` / `writeStoredValue` | Guards the real defect. Absent or throwing storage now reads as an unset key. |
| `app/plugins/i18n-storage.client.ts` | Uses those helpers instead of touching `window.localStorage`. |
| `test/setup/local-storage.ts` + `setupFiles` in `vitest.config.ts` | Hands the `localStorage` slot back to happy-dom's own `Storage` when Node has squatted on it. No-op on Node 24. |
| `.fallowrc.jsonc` — `entry: ["test/setup/*.ts"]` | fallow does not trace vitest `setupFiles`, which are strings in the config, and reported the file as unreachable. `entry` is additive, so auto-discovery still runs. |
| `test/unit/local-storage.test.ts` — 6 cases | Covers working, empty, absent, and throwing storage for both read and write. |

The environment fix and the app fix are deliberately both present. Either alone leaves a hole: the
app guard alone would let the i18n plugin silently no-op in tests, making
`app-initialization.test.ts`'s locale-persistence assertion vacuous; the environment fix alone would
leave Safari private mode broken.

## Result

```
Node v26.8.1   Test Files  26 passed (26)    Tests  101 passed (101)
Node v24.19.0  Test Files  26 passed (26)    Tests  101 passed (101)
```

Was 20 failed on Node 26. `lint`, `typecheck`, `i18n:check` clean; `fallow` exit 0.

## Not examined

- **Whether to pin Node.** The issue's option 1 (`.node-version` / `engines` / `actions/setup-node`)
  was not done. It is a reproducibility measure, not a fix — the issue itself notes it "does not
  remove" the failure, and the suite is now version-independent for this defect. Worth doing on its
  own merits; it is a separate decision.
- **Whether a newer happy-dom claims the slot** (option 2). Untested, and now moot.
- **Other unguarded browser-global access.** Only `localStorage` was audited. `sessionStorage`,
  `matchMedia`, and `navigator` were not swept for the same pattern.
- **Node 25 and 27.** Only 24.19.0 and 26.8.1 were run.
