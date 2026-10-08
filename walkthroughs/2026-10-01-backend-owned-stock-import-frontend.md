## What I built
Phase C (T5, T6) of `plans/2026-10-01-backend-owned-stock-import.md`. The products-page import modal now submits one multipart `POST` to the backend import endpoint and displays the server's per-row result. The browser-owned parser, planner, catalogue fetch, paced runner, preview and `read-excel-file` dependency are deleted. Nothing is committed. The backend repo was not touched.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| T5 API types with backend file:line citations | Done | `app/types/api/stock-import.ts` |
| T5 one `useApiWrite()` multipart request, per-attempt UUID `Cle-Idempotence`, same key on retry, no manual `Content-Type`, `retry: 0` | Done | `app/composables/useStockImportRun.ts` |
| T5 direction gate kept | Done | `useStockImportRun.ts` (`submit`), `StockImportDialog.vue` (`allowed`) |
| T5 invalidate products prefix (covers inventory history) and overview statistics once after any request that may have committed (success, retryable, in-progress); none after a rejection | Done | `useStockImportRun.ts` (`refresh`, end of `send`) |
| T5 no catalogue GET, no per-row POSTs | Done | `useStockImportCatalogue.ts` deleted; asserted in `test/nuxt/stock-import-dialog.test.ts` |
| T6 submitting state, dismissal blocked while active, no stop button | Done | `StockImportProgress.vue`, `StockImportDialog.vue` |
| T6 result totals, per-row outcomes, translated row codes, backend message as text | Done | `StockImportResult.vue` |
| T6 file-level and transport failures (rejected / retryable / in-progress) | Done | `StockImportRequestError.vue`, `app/utils/stock-import-errors.ts` |
| T6 error CSV from returned raw fields | Done | `app/utils/stock-import-files.ts` (`buildStockImportErrorCsv`) |
| T6 remove obsolete modules, specs, `read-excel-file` | Done | see Deviations |
| T6 EN/FR parity, button label and page layout unchanged | Done | `i18n/locales/products/{en,fr}.json`; `app/pages/products.vue` not edited |

## Deviations
- New component `StockImportRequestError.vue` (not in the plan's file list) renders the failed state. The plan names no component for it.
- `app/types/stock-import.ts` is kept but reduced to UI types (mode, run state, failure kind, submission). `StockImportPlan`/`Row` etc. are gone.
- `app/utils/stock-import-errors.ts` was rewritten rather than deleted. It now holds `classifyStockImportError`. Status 0, 5xx and 429 are "retryable", 409 `importation_en_cours` is "inProgress", everything else is "rejected" (no retry, back to setup, new key on next submit).
- `STOCK_IMPORT_MAX_ROWS` moved from the deleted `stock-import-rows.ts` into `stock-import-files.ts`, together with a new `STOCK_IMPORT_MAX_BYTES`.
- Deleted the unused generated `app/components/ui/progress/` (untracked, added only for the old flow).
- `bun remove read-excel-file` put `package.json` and `bun.lock` back to their `HEAD` state (the dependency was only ever added in this uncommitted work).
- Specs: the nuxt test environment drops multipart bodies on registered endpoints, so the run and dialog specs fake `useApiWrite` (via `mockNuxtImport`) and inspect the `FormData`, header, URL, method and `retry` directly. The real `$csrfFetch` multipart path is therefore not exercised by tests.
- Retryable failures show only "Retry" (no "Back"), because going back and resubmitting would mint a new key and risk duplicating rows. The dialog close button still works there.

## Tests
- `bunx vitest run test/unit/stock-import test/nuxt/stock-import --coverage.enabled=false`: 6 files, 82 tests passed (76 before the follow-up). Red was seen first (64 failed before implementation).
- `bunx vitest run test/nuxt/products-workspace.test.ts`: 11 passed.
- `bun run typecheck`: exit 0. `bun run lint`: no errors (two existing warnings in `app/types/session.ts` and `test/unit/categorie-schema.test.ts`). `bun run i18n:check`: exit 0.
- `bunx oxfmt --check` on all touched stock-import, locale and page files: all formatted. `git diff --check`: clean.
- `bunx fallow dead-code`: no findings. `bunx fallow audit`: still exits non-zero with "complexity: 20 findings"; none are in files I changed (the only stock-import mention is an advisory refactoring target for `stock-import-files.ts`, a "high impact" fan-in suggestion). The earlier walkthrough recorded the same failure class (19 findings), so it predates this change.
- Covered: single POST and multipart fields, UUID key, same key on retry, new key after rejection or reset, no retry on 502, no invalidation after rejection, pending state with Escape blocked, success, partial success, all rows failed, file-level 400, 413, key conflict, in-progress 409, HTML-as-text, role gating, error CSV (formula neutralisation, only failed rows), status classification.
- Not covered: real multipart serialisation through `$csrfFetch` and the BFF, EN/FR visual check, a 500-row result list rendering, and a real backend round trip (that is T7).

## Not done
- T7 (cross-repo contract test, 500-row measurement through the proxy, manual EN/FR scenarios).
- No runtime validation of the response body against the contract; the type is trusted.

## Notes for the reviewer
- `classifyStockImportError` casts `code_erreur` to the backend code union without checking it; unknown codes fall to the generic translated message in `StockImportRequestError.vue` and `StockImportResult.vue` (`te()` guard).
- The `beforeunload` guard from the old runner is kept for the single in-flight request.
- A closed-then-reopened dialog drops the retained key and file (reset on open). After a retryable failure the product lists are already invalidated, but the user loses the same-key retry; acceptable per the plan's wording but worth a second opinion.
- `test/nuxt/stock-import-fixture.ts` carries a `fallow-ignore-next-line unused-export` on `bridgedApiWrite` because it is only reached through a dynamic import inside `mockNuxtImport`.
- Old walkthroughs `2026-09-30-bulk-stock-import.md` and `2026-10-01-bulk-stock-import.md` still describe the deleted architecture; left as history.

## Follow-up fixes (approved after the first hand-off)
- **Close/reopen keeps the retry.** `useStockImportRun` exposes `canRetry` (state failed and kind not `rejected`). `StockImportDialog.vue` skips its reset-on-open when `canRetry` is true, so the file, mode, reason, failure and idempotency key survive close and reopen; Retry then re-sends with the same key. A rejected failure or a successful result still resets on reopen (fresh setup, new key on next submit). Closing while submitting stays blocked. The state lives in the dialog's own composable instance, so it survives close/reopen but not leaving the products page (unmount); a page-level holder was not needed for the stated requirement.
- **429 copy and invalidation.** `StockImportRequestError.vue` shows a dedicated `products.stockImport.rateLimited` message (EN/FR) for status 429: rate limited, nothing applied, retry reuses the same key. It stays `retryable`. Decision: the 429 comes from the throttler ahead of the handler (backend walkthrough: shared 10 req/s throttler), so no rows run; cache invalidation is skipped for 429. 502/503/network and in-progress still invalidate.
- **Tests added** (tester): close/reopen after 502 and after 409 `importation_en_cours` (same key, file, mode, reason), fresh state after rejection and after success, 429 message and retry, 429 no invalidation. Red first (4 failing), now 82/82 pass. `bun run typecheck` exit 0, `bun run lint` no errors, `bun run i18n:check` exit 0, `oxfmt --check` clean, `git diff --check` clean, `bunx fallow dead-code` no findings.
