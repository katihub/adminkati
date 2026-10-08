## What I built

Moved the products filter bar into its own full-width row beneath the title and action buttons. Kept the import and add actions together beside the title and added a page-level regression test for the row order.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| T11 — Products page wiring | Done | `app/pages/products.vue`; `test/nuxt/stock-import-page.test.ts` |

## Deviations

The original plan called for no layout change and for the filter row to keep wrapping beside the title. The owner subsequently requested a dedicated filter row below the title/action row; this follow-up implements that direction without changing filter behavior.

## Tests

- `bunx vitest run test/nuxt/stock-import-page.test.ts test/nuxt/products-workspace.test.ts` — 2 files passed, 14 tests passed.
- `bun run lint` — passed; emitted only the existing warnings in `app/types/session.ts` and `test/unit/categorie-schema.test.ts`.
- `bun run typecheck` — passed with no diagnostics.
- `bunx oxfmt --check app/pages/products.vue test/nuxt/stock-import-page.test.ts` — all matched files formatted.
- `git diff --check` — no diagnostics.

## Not done

No browser-based visual check was performed.

## Notes for the reviewer

The regression test checks that the title/action row and filter row are adjacent siblings in that order. Existing unrelated worktree changes were left untouched.

## Follow-up: catalogue 429 throttling

The catalogue query previously fetched all pages back-to-back, while ofetch and TanStack Query could retry a throttled request immediately or replay the full pagination loop. It now waits 700 ms between pages, disables automatic retries at both layers, and retries only the 429 page up to three times using `Retry-After` (15 seconds when the header is absent). The complete snapshot still remains all-or-error.

### Verification

- `bunx vitest run test/unit/stock-import-*.test.ts test/nuxt/stock-import-*.test.ts` — 10 files passed, 91 tests passed.
- `bun run lint` — passed; existing warnings only in `app/types/session.ts` and `test/unit/categorie-schema.test.ts`.
- `bun run typecheck` — passed with no diagnostics.
- `bunx oxfmt --check app/composables/useStockImportCatalogue.ts test/nuxt/stock-import-catalogue.test.ts` and `git diff --check` — passed.
- `bun run fallow` — failed with 19 complexity findings in the broad changed-file audit; none of the reported findings were in the catalogue fetcher or its test.

The catalogue test verifies inter-page pacing and that a transient 429 retries only page 2 after the server-provided delay, without requesting page 1 again. A live call against the user's backend was not available, so the retry behavior is verified against the H3 test endpoint rather than the production rate limiter.
