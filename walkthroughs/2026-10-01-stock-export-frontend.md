## What I built
The frontend of both `plans/2026-10-01-stock-export.md` (T7-T11) and `plans/2026-10-01-stock-drift-detection.md` (T6-T8). The products page now has an **Export** action before "Adjust stock". It opens a dialog (mode Count/Reception, format XLSX/CSV, active-filter line, matching count, volume and withdrawn/stale notices) that downloads through the BFF using the server-sent filename. The import UI now shows blank-quantity rows as "not touched", flags drifted rows ("Exported at X, now Y"), and has a single "Apply these rows anyway" switch that re-runs the preview with `inclure_stock_modifie=true`. Backend not touched.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Export T7 types + helpers (`stockExportUrl`, `filenameFromDisposition`, `describeExportFilters`, `exportVolume`, ceiling const) | Done | `app/types/api/stock-export.ts`, `app/types/api/stock-import.ts:39-96`, `app/utils/stock-export.ts` |
| Export T8 one download helper | Done | `app/utils/download-file.ts`; `order-export.ts`, `stock-import-files.ts` delegate (signatures unchanged) |
| Export T9 `useStockExport` | Done | `app/composables/useStockExport.ts` |
| Export T10 dialog, page wiring, copy | Done | `app/components/products/StockExportDialog.vue`, `StockExportSummary.vue`, `app/pages/products.vue:187-194`, `i18n/locales/products/{en,fr}.json` (`products.stockExport.*`) |
| Export T11 blank-quantity display | Done | `app/utils/stock-import-row.ts`, `StockImportResultRow.vue`, `StockImportSetup.vue` (hint) |
| Drift T6 types, flag, re-preview | Done | `app/types/stock-import.ts`, `app/composables/useStockImportRun.ts` (`buildBody`, `setIncludeChanged`) |
| Drift T7 row/preview/result UI + copy | Done | `StockImportResultRow.vue`, `StockImportPreview.vue`, `StockImportChangedNotice.vue` (new), `StockImportResult.vue`, `StockImportDialog.vue` |
| Export T12 / Drift T8 verification | Done except Excel/LibreOffice/Sheets, deployed BFF | see Tests and Not done |

## Deviations
- **Dialog default mode is Count** (plan did not fix one). Reason: Count is the mode that needs a pre-filled file. Easy to flip in `StockExportDialog.vue`.
- **Included drift rows keep a different notice text** (`stockChanged.noticeIncluded`, new key EN/FR). The planned notice says rows "are skipped", which contradicted the screen once the switch is on (seen in the screenshots).
- **Row table height `max-h-[50vh]` -> `max-h-[40vh]`** (`StockImportRowsTable.vue`). With the new warning notice the Apply/Back footer fell below the fold of the 900px-high dialog.
- **Empty and over-ceiling states show only their own notice**; the withdrawn/stale advice is hidden there (seen in the empty-state screenshot as noise).
- Mode hint is an `InfoTip` as planned; filter line renders as "Label: value" chips.
- The tester's page spec exported with a list total of 0, which correctly disables Export. I fixed the test to seed `total: 5` (test bug, not a behaviour change).
- Existing fixture `test/nuxt/stock-import-fixture.ts` updated for the new response fields (contract change, not a weakening).

## Tests
Written first by the tester agent. Red runs it captured before any production code: `test/unit/stock-export.test.ts` "Cannot find module '../../app/utils/stock-export'"; `stock-export-run`/`stock-export-dialog` "Failed to resolve import" (composable / component); `stock-import-page` 3 failed (`products-export-button` missing); `stock-import-run` 12 failed (`setIncludeChanged is not a function`); `stock-import-views` 15 failed (no drift badge/notice/switch, blank row labelled "Stock already at this quantity", `stock_reference_invalide` shown as unexpected failure); `stock-import-dialog` 3 failed (hint, switch, blank label). `test/unit/stock-import-files.test.ts` was a regression guard that already passed (the error CSV filters on `echec`).

Green, final run:
`bunx vitest run test/unit/stock-export.test.ts test/unit/stock-import-{files,errors,schema,stage}.test.ts test/unit/order-export{,-bff}.test.ts test/nuxt/stock-export-{run,dialog}.test.ts test/nuxt/stock-import-{page,run,views,dialog}.test.ts test/nuxt/download-file.test.ts test/nuxt/products-workspace.test.ts test/nuxt/orders-export-dialog.test.ts --coverage.enabled=false` -> `Test Files 16 passed (16), Tests 273 passed (273)`. (Under heavy load the two "2000-line response" view specs timed out at the default 5s; they also timed out against the original `StockImportResultRow.vue` restored from HEAD, so it was load, not a regression. They pass at normal load.) Full `bunx vitest run` not run, as instructed.

Other gates: `bun run typecheck` exit 0; `bun run lint` 0 errors (2 pre-existing warnings in files I did not touch); `bun run i18n:check` exit 0; `bunx oxfmt --check` on every touched file: clean (the checked set excludes the user's uncommitted `Overview*`, brand-logo, `produits.ts` and their specs); `bunx fallow audit` exit 0 (6 inherited complexity findings excluded by the gate; none in my files); `git diff --check` exit 0.

## Visual and real verification
Real stack: throwaway DB `xpfront_throwaway` (pg_dump of the dev DB into the same Postgres container, dropped afterwards), backend compiled with a scratchpad tsconfig excluding `marques-logo.service.ts` on :3101, `nuxt dev` on :3100, `agent-browser`, login as `dev@nowtech.local`.
- Filter "routeur" -> Export (Count, XLSX): 153 rows (152 + header); the exported ids equal, in order, the ids paged from `GET produits` with the same params. CSV also downloaded (153 lines). `Content-Disposition: attachment; filename="stock-count-2026-10-01-1225.csv"`, `text/csv; charset=utf-8`, `Cache-Control: no-store` pass through the BFF; the anchor `download` attribute was the server filename (`stock-count-2026-10-01-1225.xlsx`).
- `page=1` on the export URL really answers 400 `property page should not exist`, which confirms the stripping requirement.
- Full catalogue (4,275 rows, `etat=tous`): CSV 385,768 B in 106 ms, XLSX 237,879 B in 103 ms through the local BFF.
- Drift flow ("ThinkBook", 11 rows, one withdrawn, some without stock rows): exported Count XLSX, edited 3 quantities and blanked one, changed stock of three products by SQL after the export. Preview: "2 will apply, 9 unchanged, 3 stock changed since export", drifted rows "Stock changed / Skipped: stock changed since export / Exported at 12, now 10", blank row "Quantity left empty, not changed", withdrawn blank row, zero-delta "Stock already at this quantity". Switch on -> re-preview (5 will apply, rows show "Will apply" plus the drift line). Switch off + Apply: result "2 applied, 9 skipped, 3 stock changed" with the skipped notice; DB confirmed the drifted products kept their live stock.
- Second import with a stock change made by SQL between preview and Apply (796: 24 to 23): preview had 2 will apply with no drift, the result had 1 applied, 10 skipped, 1 stock changed (the row "Exported at 24, now 23"), DB kept 23. This is the lock-time re-check.
- Screenshots reviewed (light and dark, EN and FR): export dialog (dark, light, FR with the 2,000-row split warning for 4,275 products, empty state), setup with the new hint, preview with drift (light, dark with switch on), result (light, dark). Fixes made from them are in Deviations (notice text when included, table height, chip border in light theme, notices at empty/over-ceiling). No overflow or wrapping problems at the 896px dialog width.
- Cleaned up: browser closed, Nuxt and backend stopped, throwaway DB dropped, temp files and scratchpad build deleted.

## Not done
- Opening the XLSX in Excel, LibreOffice, Google Sheets and the CSV in Excel-fr (accents/columns): not possible here. The XLSX only proved readable by the backend's own parser and a ZIP/XML inspection.
- Timing and size through the **deployed** BFF (R5): only measured locally.
- The `export_trop_volumineux` path against the real backend (the catalogue has 4,275 rows, below the ceiling); it is covered by the composable and dialog specs with a mocked 400 body.
- Role check against the real stack (`comptoir` has no Export button): covered by specs only.
- Backend T-suites and `pnpm build` were not run (out of scope for this handoff).

## Notes for the reviewer
- **Backend module conflict found, not fixed (told not to touch it):** `src/catalogue/catalogue.module.ts` in `NowTech-backend-` imports `StockExportService` but its `providers` array does not list it (another session's marques-logo edit rewrote the line). Nest fails at boot with "can't resolve dependencies of AdministrationCatalogueController ... StockExportService". I ran the backend by patching the compiled scratchpad copy only. The export endpoint will not work until `StockExportService` is added to `providers`.
- Drift counts in the existing "unchanged" badge (`ignorees`), so "9 unchanged" includes the 3 drifted rows next to the separate warning badge. That is the backend's contract; say if the preview badge should subtract them.
- I did not touch `OverviewDelivery.vue` / `OverviewDetails.vue` or the other uncommitted brand-logo work.
- Adjacent: `bun run lint` still reports the two pre-existing warnings (`app/types/session.ts:33`, `test/unit/categorie-schema.test.ts:34`).
- Nothing committed or pushed.
