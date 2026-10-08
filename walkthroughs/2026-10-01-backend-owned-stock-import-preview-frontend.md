## What I built
The products import modal now has a backend preview step: setup, "Review changes", a preview of what will change (nothing written), then an explicit "Apply N changes", then the existing progress and result. The preview calls the same endpoint with `apercu=true` and no `Cle-Idempotence`. Apply re-sends the same file, mode and reason with a fresh UUID key. I also investigated the "result table shows no data" report (Job A). Nothing is committed; the backend repo was not touched.

## Job A: result table empty after a live import
**Root cause of the symptom, reproduced:** the result screen showed the badges ("N applied") but no table, with the Vue warning `Failed to resolve component: ProductsStockImportRowsTable`. It happens in a long-running `nuxt dev` when a new auto-imported child component file is created while the server is up: the parent SFC (`StockImportResult.vue`) is compiled before Nuxt's component registry knows the new file, Vue only warns, and the child renders nothing. A page reload does not fix it; restarting `nuxt dev` does.

**How I got there:**
- Real stack: built backend on :3101 against a throwaway DB copy (`pg_dump` of the dev DB, dropped afterwards), `nuxt dev` on :3100, `agent-browser`, login as `dev@nowtech.local`.
- Before my changes, the real flow with `/Users/michaelnji/Downloads/stock-import-test.xlsx` rendered all 10 rows in dark and light. Also rendered correctly: reception and count modes, a mixed CSV with 6 failed rows, a 500-line CSV (500 rows in the DOM), 1280x577 and 1440x900 viewports. The product Stock tab also refreshed with the new movements.
- It reproduced the moment I added `StockImportRowsTable.vue` and rewrote `StockImportResult.vue` seconds apart in the running dev server (0 `table` elements in the DOM, reload still empty). After restarting `nuxt dev`, the same flow showed 7 rows and 1 table.

**What is not proven:** that this is what the user hit. It is the only mechanism I could produce that gives exactly "badges present, table empty". The earlier implementation also added the row component while the user's dev server may have been running, which fits, but I could not observe the user's session. If the user restarts `nuxt dev` and still sees it, the cause is something else and I have no reproduction of it.

**Regression test (`test/nuxt/stock-import-views.test.ts`):** mounts `StockImportResult` and `StockImportPreview` directly, asserts one row per response line with status labels, that no `Failed to resolve component` warning is logged, and that 500 lines render 500 rows. Mutation check: renaming the child tag in `StockImportResult.vue` made 3 tests fail, then restored. It cannot reproduce dev-server registry staleness itself (the nuxt test env builds the registry fresh), so it guards unresolved or renamed children, not the stale-dev case.

**Fix applied:** none beyond the tests; there is nothing in the committed code to fix. I did not switch the components to explicit sibling imports (that would depart from the repo's auto-import convention on an unconfirmed cause).

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Types: `importation_id: string \| null`, `apercu: boolean`, citations | Done | `app/types/api/stock-import.ts` (`ReponseImportStock`, `LigneResultatImport`) |
| Preview request: same endpoint, `apercu=true`, no key, abortable, no cache invalidation | Done | `app/composables/useStockImportRun.ts` (`runPreview`, `buildBody`) |
| Apply: same file/mode/reason, no `apercu`, fresh UUID per attempt, same key on retry | Done | `useStockImportRun.ts` (`apply`, `runApply`, `retry`) |
| Apply impossible without a current preview | Done | `apply()` returns unless state is `preview` with `appliquees > 0`; the apply screen only exists after a fresh preview, and Back or reset discards it |
| Preview screen: badges, columns, "Current" arrow "New", statuses, note, fail notice, Back, error file, "Apply N changes", empty state at N = 0 | Done | `StockImportPreview.vue`, `StockImportRowsTable.vue`, `StockImportResultRow.vue` (`preview` prop) |
| Setup button "Review changes", EN/FR parity | Done | `i18n/locales/products/{en,fr}.json`, `StockImportSetup.vue` unchanged (uses `submit` key) |
| Back keeps file/mode/reason; changes need a new review | Done | `StockImportDialog.vue` (inputs live in the dialog; `runner.reset` on Back) |
| Preview failures: 400 back to setup; transient shows Retry preview | Done | `StockImportRequestError.vue` (`phase` prop), `useStockImportRun.ts` (`failurePhase`) |
| Closing while previewing aborts; applying stays blocked | Done | `StockImportDialog.vue` (`visible` setter, `cancelPreview`) |
| Existing apply-time semantics, close/reopen retention | Done | unchanged behaviour, covered by adapted specs |
| Visual verification light and dark | Done | see Tests |

## Deviations
- **New component `StockImportRowsTable.vue`** (scroll container, header, rows) shared by `StockImportResult.vue` and `StockImportPreview.vue`, instead of duplicating the table. `StockImportProgress.vue` now takes a `label` prop (used for both submitting and previewing).
- **`StockImportPreview.vue`** is the one new screen component, which the brief anticipated ("one more small component only if justified").
- **Back discards the preview** rather than keeping it dormant, so "input change invalidates preview" holds by construction: Apply exists only on the screen reached from a fresh Review. There is no stale-preview comparison logic.
- **Plural**: "Apply {count} change | Apply {count} changes" via vue-i18n pluralization; FR uses the same two-form rule.
- **TDD**: I wrote the composable and components while the tester wrote specs, so the tester observed no red run (its report says so). To recover evidence, I temporarily broke the composable five ways and restored it each time (`diff` identical): preview sends a key (10 specs failed), apply without the preview guard (3), preview invalidates caches (12), apply sends `apercu` (21), apply reuses a key (4).
- The description line under the modal title was reworded for the preview flow and still shows on the result screen, where it reads slightly stale. Left as is.

## Tests
Commands run from the repo root:
- `bunx vitest run test/unit/stock-import test/nuxt/stock-import test/nuxt/products-workspace --coverage.enabled=false`: `Test Files 8 passed (8)`, `Tests 127 passed (127)`.
- `bun run typecheck`: no errors printed. `bun run lint`: no errors, the same two pre-existing warnings (`app/types/session.ts`, `test/unit/categorie-schema.test.ts`). `bun run i18n:check`: exit 0.
- `bunx oxfmt --check` on the touched components, composable, types, locales and stock-import specs: "All matched files use the correct format." `bunx fallow dead-code`: "No issues found". `git diff --check`: clean.
- Visual, real backend and real browser (EN dark and light, FR dark):
  - Setup screen (count mode, file chosen), preview with 2 will apply, 1 unchanged and 3 will fail (dark and light), result after Apply (dark and light), FR zero-applicable preview ("Rien à appliquer", no Apply button), FR preview-failed screen with the backend stopped ("Réessayer l'aperçu"), FR previewing spinner (backend paused with SIGSTOP), then Retry preview succeeding once it resumed.
  - Database check: after a preview, stock and the import count were unchanged; after Apply, product 739 went 6 to 50 and 748 went 9 to 0, one new import row.
  - Layout in the 896px dialog: no overflow or odd wrapping; the table scrolls inside `max-h-[50vh]`.
- Not covered by tests: real multipart through `$csrfFetch` (the nuxt env drops multipart bodies, so the write client is faked); it was exercised by hand in the browser.

## Not done
- Dev-server staleness cannot be tested automatically (see Job A).
- No screenshot of the dialog at a narrow mobile width.
- Preview latency at 500 rows through the app was not measured (the backend walkthrough did not measure it either).

## Notes for the reviewer
- `apply()` requires `appliquees > 0`; a preview of zero applicable rows can never be applied from the UI, which matches the brief but also means "apply the rest later" is impossible without fixing the file.
- A preview that is closed mid-flight is aborted client-side; the backend has no side effects to cancel, so this is safe, but the request may still complete server-side.
- The backend preview reads stock without a lock; the note under the table says so, and the result screen shows the real figures. A count-mode row can therefore differ between preview and result.
- `bunx fallow audit` was not run this time; `fallow dead-code` is clean.
- While testing I started with a CSV path that did not exist (my own mistake), which gave a "connection interrupted" screen whose Retry then worked once the file existed. This shows a File object read failure is classified as retryable; not changed.
- Pre-existing, unrelated: the first page load in dev logged `Failed to fetch dynamically imported module .../products.vue` once (Vite dependency re-optimisation); it did not recur.
