## What I built

Added a direction-only bulk stock import dialog to the products header, with CSV/XLSX upload, validation, preview, paced sequential movements, count-mode stock re-checks, cancellation, retries, partial results and formula-safe downloadable CSV files. The feature uses TanStack Query for the complete active catalogue and existing CSRF-safe writes, with English/French copy. Implementation is ready for review, but repository-wide tests and the fallow gate are not clean, and real-app manual verification has not been performed.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| T1 CSV parsing | Done | `app/utils/stock-import-csv.ts`; `test/unit/stock-import-csv.test.ts` |
| T2 grid/header validation and 500-row limit | Partial: grid row numbering preserved; physical CSV line mapping not implemented | `app/utils/stock-import-rows.ts`; `test/unit/stock-import-rows.test.ts` |
| T3 planner and product matching | Done | `app/utils/stock-import-plan.ts`; `test/unit/stock-import-plan.test.ts` |
| T4 template/error CSV and injection protection | Done | `app/utils/stock-import-files.ts`; `test/unit/stock-import-files.test.ts` |
| T5 setup schema | Done | `app/schemas/stock-import.ts`; `test/unit/stock-import-schema.test.ts` |
| T6 complete active catalogue | Done | `app/composables/useStockImportCatalogue.ts`; `test/nuxt/stock-import-catalogue.test.ts` |
| T7 sequential commit, pacing, retries, stop, invalidation | Done | `app/composables/useStockImportRun.ts`; `app/utils/stock-import-errors.ts`; `test/nuxt/stock-import-run.test.ts` |
| T8 generated progress primitive | Done | `app/components/ui/progress/Progress.vue`, `index.ts` |
| T9 preview | Done | `app/components/products/StockImportPreview.vue`, `StockImportPreviewRow.vue`; `test/nuxt/stock-import-preview.test.ts` |
| T10 dialog orchestration and states | Partial: implemented; XLSX component scenarios untested | `app/components/products/StockImportDialog.vue`, `StockImportSetup.vue`, `StockImportProgress.vue`, `StockImportResult.vue`; `test/nuxt/stock-import-dialog.test.ts` |
| T11 page wiring and role gate | Done | `app/pages/products.vue`; `test/nuxt/stock-import-page.test.ts` |
| T12 translations | Done | `i18n/locales/products/en.json`, `fr.json` |
| T13 exact dependency pin and license | Done | `package.json`, `bun.lock`; `read-excel-file` 9.3.10, MIT |
| T14 verification gates | Partial: all requested commands run; full tests/fallow fail | Results below |
| T15 walkthrough | Done | This file |
| T16 real direction login/manual scenarios | Skipped | No real login or application access provided |

## Deviations

- The initial nested Tester invocation hit `Subagent depth limit reached (1)`. The parent session subsequently completed the mandatory Tester handoff and supplied the observed red result: `Test Files 10 failed (10); Tests 1 failed | 1 passed (2)`. Nine suites referenced absent production modules; the page test failed on the absent import trigger. I implemented against those Tester-authored specs, rather than writing replacement tests.
- Count-mode pacing includes **700 ms between the inventory GET and POST**, as well as between rows. The plan's literal “700 ms between writes” would otherwise spend about 170 requests/minute in count mode, over the shared 120/minute limit. The preview estimate includes both waits. A 429 retries the same row and repeats the stock re-check; fetch transport retries are disabled so the explicit retry cap and pacing remain authoritative.
- Installed `read-excel-file` **9.3.10** exposes first-sheet parsing as the named `readSheet(arrayBuffer, 1)` export from `/browser`; its default export now returns all sheets. The import remains dynamic. This was discovered through the installed package declarations/README and confirmed by typecheck/build, not by an XLSX interaction test.
- `useStockImportCatalogue(enabled = true)` accepts a reactive boolean/getter, preserving the no-argument public seam tested by Tester. The dialog passes its direction-gated visibility, so page view and closed dialogs do not fetch. `ProductListQuery` already exposes `taille`; no API type change was needed.
- Added optional resolved `productName`, `stockBefore` and `motif` fields to plan rows so known skipped/invalid rows can still display their resolved product, stock and chosen reason. These do not make invalid rows writable. Existing movement-only test fixtures remain valid.
- Extracted setup, progress, result and preview-row components, plus error/retry helpers, to keep the dialog orchestration-focused and reduce complexity. No generated UI files were hand-edited.
- The shadcn CLI attempted unrelated VueUse/reka dependency upgrades. Restored the original package constraints and the original reka lock entry; `bun install --frozen-lockfile` installed `reka-ui@2.10.4`. Final package/lock changes are only the spreadsheet parser and its transitive packages; no second lockfile was added.
- Corrected three Tester type errors without changing assertions: TanStack invalidation filters may be getters, and h3's typed `retry-after` header accepts a number.
- CSV parsing now throws on unclosed quotes, quotes inside an unquoted cell, and invalid characters after a quoted cell. The dialog translates these into a generic unreadable-file alert; the plan did not specify a parser-error return contract.

## Tests

Final observed commands/results (no commit or hook bypass):

| Command | Observed output/result |
| :-- | :-- |
| `bunx vitest run test/unit/stock-import-*.test.ts test/nuxt/stock-import-*.test.ts` | `Test Files 10 passed (10)`; `Tests 89 passed (89)`; `TARGET_EXIT=0` |
| `bunx vitest run` | `Test Files 7 failed \| 190 passed (197)`; `Tests 8 failed \| 1462 passed (1470)`; `VITEST_EXIT=1` |
| `bun run lint` | Exit 0; warnings only: `app/types/session.ts:33` empty export, `test/unit/categorie-schema.test.ts:34` conditional expect |
| `bun run format:check` with explicit touched source/locale/test/package paths | `All matched files use the correct format.`; `Finished in 292ms on 30 files using 8 threads.`; `FORMAT_SCRIPT_EXIT=0` |
| `bun run i18n:check` | `$ node scripts/check-translations.mjs`; `I18N_EXIT=0` |
| `bun run typecheck` | Nuxt module startup messages; no diagnostics; `TYPECHECK_EXIT=0` |
| `bun run build` | `Σ Total size: 48.7 MB (16.5 MB gzip)`; `✨ Build complete!`; `BUILD_EXIT=0` |
| `bunx fallow` | `✗ 10 above threshold · 5596 analyzed · maintainability 91.6 (good)`; `Failed: health (10 above threshold): start with app/pages/users.vue`; `FALLOW_EXIT=1` |
| `bun run fallow` (changed-code audit) | `✗ complexity: 10 findings · 711 changed files`; `audit gate excluded 7 inherited findings`; exit 1 |
| `git diff --check` | No diagnostics; `DIFF_CHECK_EXIT=0` |

The targeted specs cover CSV quoting/BOM/semicolon/ragged input; header aliases and row limits; both modes, duplicates, unknown products, reason precedence; spreadsheet injection; catalogue pagination/failure/retry; sequential writes, pacing, 429 retries/exhaustion, stale counts, 403, 409/500 continuation, stop, unmount, beforeunload and invalidation; dialog upload boundaries, role gates, preview/back/confirm/results, partial success and escaped backend messages.

Quantity policy is explicit in Tester tests: accept `12.0`; reject space/NBSP thousands and non-ASCII digits. XLSX happy/error paths, malformed CSV rejection branches, retry HTTP-date headers, transport-network failures, direct failure-reason/reset assertions and the added skipped-row metadata are not specifically covered. No browser/e2e test was added and no upstream parser internals were tested.

Full-suite failures were outside stock-import specs:

- `banner-artwork-preview.test.ts`, `banner-card.test.ts`, `banner-panel-artwork.test.ts`: expected IPX thumbnail URLs, received original URLs.
- `products-image-rendering.test.ts` (two cases), `products-local-preview.test.ts`: catalogue image host/domain and IPX expectations.
- `products-delivery-picker.test.ts`, `products-detail-form.test.ts`: expected default delivery badge absent. The pre-existing user edit removes that badge; I left it intact.

An earlier concurrent full-test/build attempt exceeded the 120-second tool timeout, and a later concurrent full run also had one operations-page timeout. The final sequential full run above completed without that timeout. The final build completed after restoring the original reka version.

## Not done

- Repository gates are not all green. Fallow still reports three findings in new code using **estimated** CRAP scores: planner's mapped row function (49.5), dialog `preview` (37.1), and runner `run` (31.6), alongside seven findings outside this feature. Their cyclomatic/cognitive values are within thresholds after extraction; I did not suppress findings or change fallow config. `read-excel-file` was not reported as unused.
- No real direction login, manual CSV/XLSX imports, visual viewport checks or real movement-history verification (T16). Stubbed component tests are not a substitute for those checks.
- No XLSX fixtures were supplied by Tester, and nested Tester delegation remains unavailable. Implementation supports the installed parser's first-sheet API, but automated XLSX scenarios remain outstanding.
- No claim that the unrelated full-suite failures were reproduced on a clean baseline; these are the observed failures in this worktree. I did not change image/domain configuration or protected user components to make them pass.

## Notes for the reviewer

Review count-mode pacing, cancellation during reads/backoff, the post-preview concurrency limitation and the estimated CRAP findings. Count re-checks reduce stale deltas but do not lock trading; the UI explicitly warns operators to freeze trading. Stock run invalidation covers the entire products query family and statistics exactly once each, including failures and stopping.

Source line numbers are grid-record numbers: blank grid rows retain their indexes, while an embedded newline inside a quoted CSV cell stays within one logical record. A later record's displayed line can therefore differ from its physical text-editor line; physical CSV line tracking is not implemented by the plan's `string[][]` seam.

User modifications to `OverviewDelivery.vue` and `OverviewDetails.vue` and the frozen untracked plan were not edited or reverted. No commit was made. The generated progress primitive is present and typechecks, but its visual appearance and sticky preview header have not been verified in the real browser.
