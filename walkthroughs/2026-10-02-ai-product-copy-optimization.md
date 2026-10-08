# AI product-copy quality and token optimization — walkthrough

**Date:** 2026-10-02
**Slug:** `ai-product-copy-optimization`
**Plan:** `plans/2026-10-02-ai-product-copy-optimization.md`
**Status:** Implemented and locally gated. The measured quality gate, the credentialed staging smoke
test, and a repo-wide test run are not done (see Not done).

## What I built

The product-copy pipeline now takes an operator-selected field scope (`name`, `shortDescription`,
`longDescription`, `features`) and an image profile (`all-auto`, `primary-auto`,
`primary-auto-secondary-low`) in one strict structured request, generates only those fields, and
validates a closed schema for exactly that scope. The prompt is `product-copy-v2`: structured
product facts establish identity and features, images only corroborate, and incidental visual
description plus image-only inference are explicitly prohibited. The context guard is now
scope-aware, so an existing product ID or images alone can never make a request eligible. The
server records privacy-safe telemetry (cached-input/reasoning tokens, incomplete reason, field
scope, image profile, candidate/sent/fallback counts) and a best-effort `applied`/`dismissed`
outcome event. The browser reuses an exact matching session result instead of calling the provider
again, except through the explicit "fresh alternative" menu action. Defaults are unchanged: all
fields, all images at `auto`, `low` reasoning, and the existing output ceilings.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| 1. Contracts, privacy boundary, measurement baseline | Done | `app/types/ai/product-copy.ts`, `app/schemas/ai-product-copy.ts`, `app/utils/ai-product-copy.ts`, `server/utils/ai/product-copy-service.ts`, `server/utils/ai/audit.ts`, `server/api/ai/products/suggestions/outcomes.post.ts`, `server/utils/ai/config.ts`, `nuxt.config.ts`, `README.md` |
| 2. Identity-first prompt, compact provider data, scope-aware guard | Done | `server/utils/ai/product-copy-prompt.ts`, `app/utils/ai-product-copy.ts` |
| 3. Bounded image profiles and asset metadata | Done | `server/utils/ai/product-assets.ts`, `server/api/ai/products/suggestions.post.ts`, `app/components/admin/AiGenerationSettings.vue` |
| 4. Selected fields, dynamic strict schemas, partial UI state | Done | `server/utils/ai/product-copy-prompt.ts`, `app/schemas/ai-product-copy.ts`, `app/stores/ai-generation.ts`, `app/components/admin/AiGenerationSuggestionFields.vue`, `app/components/admin/AiGenerationHistoryItem.vue`, `app/components/products/DetailForm.vue` |
| 5. Session reuse, fresh alternative, outcome reporting | Done | `app/utils/ai-product-copy.ts`, `app/stores/ai-generation.ts`, `app/composables/useProductCopySuggestions.ts`, `app/components/products/ProductCopySuggestionTrigger.vue`, `server/api/ai/products/suggestions/outcomes.post.ts` |
| 6. Config and policy resolver; tuning only after the quality gate | Partial — configuration and resolver are in; tuning did not happen | `server/utils/ai/product-copy-policy.ts`, `server/utils/ai/config.ts`, `nuxt.config.ts`, `README.md` |
| 7. i18n, tests, staging smoke, gates | Partial — i18n and tests are in; staging smoke and the quality evaluation are not | `i18n/locales/products/{en,fr}.json`, `test/unit/ai-*.test.ts`, `test/nuxt/*ai-*.test.ts` |
| Visible image-context wording | Partial — shown on history entries; the inline cards still show only warnings | `app/components/admin/AiGenerationWarnings.vue`, `app/components/admin/AiGenerationEntryBody.vue` |
| README deployment documentation (no `.env.example` exists in the repo) | Done | `README.md` |

## Deviations

- **Configured default image profile is applied at the endpoint.** The request schema still
  defaults `imageProfile` to `all-auto` for callers that omit it, but the endpoint now substitutes
  `NUXT_AI_PRODUCT_COPY_DEFAULT_IMAGE_PROFILE` before parsing, so a deployment can change the
  operative default without a client release. An invalid configured value refuses the request as
  `provider_unavailable` (boot-time `assertAiConfig` already rejects it).
- **Last selected field cannot be deselected** in Settings: its button is `disabled`. The store
  already ignored an empty selection; this is only a visual affordance and has no dedicated test.
- **Tester role could not be delegated** (the configured subagent model was unavailable), so tests
  were written in this session with red→green slices and the role separation kept by hand.
- **The outcome rate limiter has no test.** Its 120-per-5-minute window is exercised only by code
  inspection (see Notes for the reviewer).
- **Warnings inside the product editor cards are unchanged.** The new candidate/sent/fallback
  context renders on history entries, not on the per-field cards.

## Tests

Observed results, in the order the commands ran:

| Command | Result |
| :-- | :-- |
| `bun run test:unit` (before the last spec, 93 files) | `Test Files 93 passed (93)`, `Tests 1117 passed (1117)` |
| 12 focused AI specs — `ai-audit`, `ai-config`, `ai-generation-store`, `ai-product-assets`, `ai-product-copy-api`, `ai-product-copy-outcomes-api`, `ai-product-copy-policy`, `ai-product-copy-prompt`, `ai-product-copy-schema`, `ai-product-copy-service` (unit) + `ai-generation-launcher`, `products-ai-suggestions` (nuxt) | `Test Files 12 passed (12)`, `Tests 402 passed (402)` |
| Same 4 nuxt/unit specs after the final Settings tweak | `Test Files 4 passed (4)`, `Tests 134 passed (134)` |
| `bun run test:unit` (final, with the new `toProductCopyDraftSource` spec) | `Test Files 93 passed (93)`, `Tests 1119 passed (1119)` |
| `bun run typecheck` | clean (no output after the Nuxt banner lines) |
| `bun run lint` | 2 pre-existing warnings (`app/types/session.ts`, `test/unit/categorie-schema.test.ts`), no errors |
| `bun run format:check` | `All matched files use the correct format.` |
| `bun run i18n:check` | passed |
| `bun run fallow` | `✓ No issues in 90 changed files` |
| `bun run build` | `Build complete!` |
| `bunx vitest run` (whole repo, both projects) | not observed green — timed out twice at 5–6 minutes on this machine; see Not done |

What the AI-focused specs cover: dynamic strict schemas per scope, canonical field ordering,
SHA-256 fingerprint stability over canonically equivalent input, the scope-aware context guard,
profile-to-image-part mapping and fallback, provider usage mapping with and without cached/reasoning
detail, audit redaction with marker strings, outcome-endpoint authorization/strictness/redaction,
store reuse/restore behavior, settings scope and profile persistence, subset cards, and reuse versus
fresh-alternative versus telemetry-failure behavior.

## Not done

- **Repo-wide `bunx vitest run` was never observed passing.** It timed out twice (the suite exceeds
  six minutes here). An earlier partial run also showed failures in files unrelated to this change:
  banner/IPX thumbnail tests, `products-detail-form` (the worktree concurrently carries uncommitted
  storefront-link work in `DetailActionButtons.vue`/`DetailForm.vue`), `operations-page`, and two
  `stock-import-views` timing tests. CI is the backstop for the full suite.
- **No real-model smoke test or blinded quality evaluation.** No verified model/pricing check was
  possible in this session. Therefore no lean default was enabled: still all fields, `all-auto`,
  `low` reasoning, 12 000-token ceilings, and the price still reaches provider input.
- **Prompt caching was not attempted** — the plan gates it on observed cached-token metrics for the
  deployed model.
- **The outcome rate limiter is untested and its window map is never pruned.** Entries are keyed by
  user ID; the process-local map grows by one small record per operator and persists for the
  process lifetime.
- **No `minimal` reasoning, no output-cap reduction, no image-default change** — all deferred to the
  quality gate, by design.

## Notes for the reviewer

- `bun run fallow` reads the coverage artifact from the most recent coverage-enabled run. A
  single-file run makes the report noisy; the final verified run was after the full unit project.
- Raw-input safety is tested with marker strings: draft text, suggestion text, image URLs, tokens,
  and provider messages are asserted absent from audit and outcome records.
- The reuse fingerprint is computed over a field-by-field copy of the draft plus language, canonical
  fields, image profile, target, and a browser-local image signature. Neither the raw canonical
  payload nor image URLs are persisted; only the digest is kept in in-memory history.
- A "fresh alternative" and a retry both bypass reuse (`generateIn(language, true)`), so they always
  contact the provider.
- The endpoint's `configuredImageProfile` throw uses `provider_unavailable` for an impossible
  configuration; `assertAiConfig` rejects the value at boot first.
- `app/components/admin/AiGenerationWarnings.vue` renders the new image-context line on history
  entries only. Confirm you agree that this satisfies the plan's "results/warnings identify when
  fewer or no images reached the model", or request inline-card wording as a follow-up.
- The working tree also carries unrelated uncommitted changes (`app/utils/storefront.ts`, the
  storefront link in `DetailActionButtons.vue`, and the deletion of
  `test/nuxt/product-copy-apply-all.test.ts`) that predate this optimization work. The deleted
  spec's scenario — apply-all through the panel — is still exercised by the editor specs.
