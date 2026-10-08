# Bulk stock import

A dialog on the products page that imports stock movements in bulk from a `.csv` or `.xlsx` file.
Decisions come from the 2026-09-30 grilling session with the owner; backend limits were checked in
`NowTech-backend-` (`~/Projects/nvc/NowTech-backend-`, branch `feat/prod-stock-mgt`).

Slug: `bulk-stock-import` (threads `plans/` → `walkthroughs/` → `reviews/`).

## 1. Requirement, restated

Today stock changes one product at a time through `InventoryAdjustmentDialog` (per-product detail panel).
Operations need to apply many movements at once, in two situations:

- **Delivery day** — a supplier delivery touches many products; each row says how many units arrived.
- **Stock count** — a physical count yields a counted quantity per product; the system must end up equal to it.

The backend has no bulk endpoint and is read-only from this repo, so the import is a client-side
preview followed by a paced loop of the existing single-movement write.

## 2. Decisions (settled with the owner)

| # | Decision |
| :-- | :-- |
| D1 | Two modes chosen per import: **Receptions** (row quantity is added, `reception` movement, +N) and **Count** (row quantity is the absolute result; UI posts a `correction` of `counted − current`). |
| D2 | Input is a `.csv` or `.xlsx` upload, with a downloadable template. Adds one spreadsheet-parsing dependency. |
| D3 | Validate → preview table with per-row issues → confirm → sequential writes → progress → result. Partial success is allowed; failed rows come back as a downloadable error CSV. |
| D4 | Entry point: a button in the products page header, beside `products-add-button` (`app/pages/products.vue:194`), gated to `direction` like `canCreate`. |
| D5 | One required reason in the dialog; an optional per-row `reason` column overrides it. |
| D6 | Files: max 5 MB, max **500 rows** (lowered from 2 000 because of the backend throttler, see §3). |
| D7 | Parser: `read-excel-file` (lazy-loaded) for XLSX, plus an in-repo CSV parser. |
| D8 | Archived products are rejected. They are absent from the default list, so they surface as `unknownProduct`. |

## 3. Facts the plan rests on (verified)

**Frontend**

- `useAdjustProductInventory` (`app/composables/useProductInventory.ts`) POSTs `{type, variation, motif}` to
  `/catalogue/administration/produits/:id/inventaire/mouvements` and invalidates `products.all`,
  `products.inventory(id)` and `statistics.overview()` on every success. Invalidating per row in a loop would refetch
  the list hundreds of times, so the bulk path must **not** reuse that mutation's `onSuccess`; it calls
  `useApiWrite()` directly and invalidates once at the end.
- `ajustementStockSchema` (`app/schemas/inventaire.ts`) already enforces: integer, non-zero, `reception` > 0, motif
  1–200 chars after trim. The import reuses it per row instead of restating the rules.
- `ProductListItem` (`app/types/api/produits.ts`) carries `id`, `slug`, `nom`, `quantite_stock`, `retire_le`. There is
  **no SKU**; rows are matched by `id` or `slug`.
- `apiErrorText(error, t)` (`app/utils/api-error.ts`) turns a thrown fetch error into user text and already maps 409
  and 429 headlines; backend French messages are preserved beneath translated headlines.
- `useApiWrite()` wraps `$csrfFetch`, so writes carry the CSRF token.
- No progress component exists in `app/components/ui/`. Options: `bunx shadcn-vue add progress` (generated, allowed) or
  a plain `<div role="progressbar">`. Plan picks the shadcn add, to match the kit.
- Products list is an infinite query (`useProduits`) with `page`; the preview needs the **whole** active catalogue,
  which is a different access pattern (see T6).

**Backend** (read, not modified)

| Fact | Source |
| :-- | :-- |
| List `taille` max **200**, default 50 | `src/catalogue/administration.dto.ts:92-97` |
| List defaults to `etat=actifs` (`retire_le is null`); `retires` and `tous` exist | `administration.service.ts:165-181` |
| Movement endpoint is `direction`-only; server computes before/after under a row lock; negative result → **409** | `administration.controller.ts:178-190` |
| Throttler: **10/s, 120/min, 1 000/h** per caller | `src/app.module.ts:54-60` |
| Stock writes are relative (`variation`), never an absolute overwrite | `AjusterStockDto`, `inventaire.ts` types |

**Infrastructure constraints from `AGENTS.md`**

- The BFF route limiter for `/api/v1/**` is 600 per five minutes (≈ 2/s), separate from page routes.
- The backend window that binds is **120/min**, not 10/s: a sustained import runs at ~2 requests/second at most.
- `nuxt-security`'s 2 MB request limit does not apply: parsing happens in the browser, only small JSON bodies are sent.
- TanStack Query owns server state; Pinia must not mirror it. The import's transient state (selected file, plan, run
  progress) lives in component/composable state, not a store.

## 4. Scope

**In:** header button, dialog (setup / preview / progress / result), CSV + XLSX parsing, template download, validation
and preview, paced sequential commit with retry on 429, error CSV, EN/FR strings, tests, walkthrough.

**Out:** any backend change (no bulk endpoint, no new error codes); resuming an import after a page reload; importing
into archived products; multi-sheet XLSX (first sheet only); creating products from the file; editing rows inside the
preview; a server-side audit of the import as one unit (each movement is audited individually already).

## 5. User-facing behaviour

### 5.1 Dialog steps

1. **Setup** — mode switch (Receptions | Count), reason field (required, ≤ 200), file drop zone (`.csv`, `.xlsx`,
   5 MB), link "Download template". Helper text under the mode switch states the meaning of `quantity` in each mode.
   "Preview" button enabled when mode, reason and a file are present and the catalogue lookup has loaded.
2. **Preview** — summary chips (Ready · Skipped · Errors), then a table: line, product name (resolved), current stock,
   movement (`+12` / `−3`), resulting stock, reason, issue. Rows with issues are visually flagged and will not be sent.
   "Import N movements" is disabled when N = 0. "Back" returns to setup with the file kept.
3. **Progress** — bar `done / total`, current product name, live counters (applied · failed · retrying), a "Stop" button
   that finishes the in-flight request then halts. Closing the dialog during the run is blocked; a `beforeunload`
   guard warns on tab close.
4. **Result** — applied / failed / skipped counts. If any failed: list with line, product, reason text, and a
   "Download error file" button (CSV with the original columns plus `error`). "Done" closes and the lists refresh.

### 5.2 File format

Header row required, case-insensitive, trimmed, accent-insensitive aliases accepted (`product|produit`,
`quantity|quantite`, `reason|motif`).

| Column | Required | Meaning |
| :-- | :-- | :-- |
| `product` | yes | numeric product `id` **or** `slug` |
| `quantity` | yes | integer. Receptions: > 0. Count: ≥ 0 |
| `reason` | no | overrides the dialog reason for this row, ≤ 200 chars |

CSV: UTF-8 with or without BOM, delimiter `,` or `;` auto-detected from the header row, quoted fields with `""`
escapes, `\r\n` or `\n`. XLSX: first sheet only, first row is the header, numeric cells and numeric-looking text both
accepted.

### 5.3 Row issues (a row with an issue is never sent)

| Issue | When |
| :-- | :-- |
| `unknownProduct` | no active product with that id/slug (includes archived) |
| `duplicateProduct` | the same product appears twice (all occurrences flagged; ambiguity is not guessed) |
| `invalidQuantity` | empty, non-numeric, non-integer, negative (count) or ≤ 0 (receptions) |
| `reasonTooLong` | per-row reason > 200 chars |
| `noChange` (skipped, not an error) | count mode and `counted == current` |

Validation of the final `{type, variation, motif}` goes through `ajustementStockSchema`, so a rule change there
applies here automatically.

### 5.4 Count-mode semantics

The plan computes `variation = counted − current` at preview time from the catalogue snapshot. Immediately before
posting each row the commit loop **re-reads that product's stock** (one cheap `GET` of the inventory, see T7) and, if
it differs from the snapshot, fails the row with `stockChanged` instead of posting a stale variation. This narrows,
but cannot close, the race with live orders: it is a *re-check*, not a lock. The server's negative-stock 409 is the
last backstop. The operational freeze during counts stays an announced rule, not an enforced one
(`inventory-cutover-decisions`).

> Cost of the re-check: one extra read per row in count mode. At 500 rows that is 500 more requests against the same
> 120/min window, which **doubles the run time**. See Risk R2 and Open question Q1.

## 6. Data contracts

### 6.1 Types — `app/types/stock-import.ts` (new, not auto-imported)

```ts
export type StockImportMode = "reception" | "count"

/** One parsed line of the file, before any product resolution. */
export interface StockImportRow {
  line: number // 1-based file line, header is line 1, so data starts at 2
  product: string // raw cell text, trimmed
  quantity: string // raw cell text; parsed in the planner so "abc" is a row issue, not a parse crash
  reason: string | null
}

export type StockImportIssue = "unknownProduct" | "duplicateProduct" | "invalidQuantity" | "reasonTooLong"

export interface StockImportPlannedMovement {
  line: number
  productId: number
  productName: string
  type: "reception" | "correction"
  variation: number
  motif: string
  stockBefore: number // snapshot from the catalogue, used for count-mode re-check and preview
}

export interface StockImportPlanRow {
  row: StockImportRow
  movement: StockImportPlannedMovement | null
  issue: StockImportIssue | null
  skipped: "noChange" | null
}

export interface StockImportPlan {
  rows: StockImportPlanRow[]
  ready: number
  skipped: number
  errors: number
}

export type StockImportFailureReason = "stockChanged" | "conflict" | "tooManyRequests" | "forbidden" | "unknown"

export interface StockImportFailure {
  line: number
  product: string
  reason: StockImportFailureReason
  message: string // apiErrorText output, shown as is
}

export interface StockImportRunResult {
  applied: number
  failed: StockImportFailure[]
  stopped: boolean // user pressed Stop; remaining rows were not attempted
}
```

### 6.2 Schema — `app/schemas/stock-import.ts` (new, Zod 3.25 via `zod/v4` like `schemas/inventaire.ts`)

`stockImportSetupSchema = { mode: "reception" | "count", motif: string 1..200 trimmed }`. Error messages are i18n
keys (`validation.required`, `validation.tooLong`), consistent with the existing schemas.

### 6.3 Endpoints (all exist today; nothing to create)

| Use | Call |
| :-- | :-- |
| Catalogue snapshot | `GET /catalogue/administration/produits?taille=200&page=N` until `page >= pages` (active only) |
| Count-mode re-check | `GET /catalogue/administration/produits/:id/inventaire?taille=1` |
| Movement | `POST /catalogue/administration/produits/:id/inventaire/mouvements` |

## 7. Reuse

| Need | Existing thing |
| :-- | :-- |
| Dialog shell, footer, error line | `InventoryAdjustmentDialog.vue`, `DeliveryIntervalDialog.vue` (structure, testids, `apiErrorText`) |
| Native select / input / label | `@/components/ui/native-select`, `input`, `label` |
| Movement validation | `ajustementStockSchema` |
| Error → text | `apiErrorText`, `toApiError` |
| CSRF-safe write | `useApiWrite` |
| Read | `useApiFetch` |
| Query keys | `apiQueryKeys.products.all`, `.statistics.overview()` |
| Download via object URL | pattern in `app/utils/order-export.ts` (`downloadOrderExport`) |
| Table | `@/components/ui/table` (native table inside a scroll area; the preview is a dialog-local table, not a taxonomy table, so the `tables-follow-taxonomy` rule about page-level tables does not apply) |
| Icons | Phosphor only (`ph:upload-simple`, `ph:file-csv`, `ph:warning`, `ph:check-circle`); no text arrows |
| Toasts | `vue-sonner` |
| Test fixtures | `test/nuxt/delivery-fixture.ts` (`stubEndpoint`), inventory fixtures in `test/nuxt/inventory-fixture.ts` |

New generated UI: `bunx shadcn-vue add progress` (lands in `app/components/ui/progress/`, not hand-edited).

## 8. Tasks

Order is by dependency; each phase is independently reviewable and demonstrable. Every task follows red → green:
failing test first, then the minimum code. Load the `tdd` skill before writing tests; the `tester` role writes them.

### Phase A — Pure logic (unit tests, no Nuxt)

**T1 — CSV parsing.** `app/utils/stock-import-csv.ts`, test `test/unit/stock-import-csv.test.ts`.
- What: `parseCsv(text): string[][]` (RFC-4180-ish: quotes, escaped quotes, embedded newlines, `\r\n`, BOM strip,
  delimiter sniffed from the first line between `,` and `;`, blank trailing lines ignored).
- Done when: tests cover quoted comma, `""` escape, embedded newline, `;` file, BOM, ragged rows, empty input; `bunx vitest run test/unit/stock-import-csv.test.ts` passes.

**T2 — Rows from a grid.** `app/utils/stock-import-rows.ts`, test `test/unit/stock-import-rows.test.ts`.
- What: `rowsFromGrid(grid: string[][]): { rows: StockImportRow[] } | { error: "missingColumn" | "empty" | "tooManyRows"; column?: string }`.
  Header normalisation (trim, lowercase, strip accents, aliases from §5.2), skip fully blank lines, enforce the
  500-row cap (constant `STOCK_IMPORT_MAX_ROWS` exported for the dialog), keep the original file line number.
- Done when: missing `product` or `quantity` column → `missingColumn` with the column name; 501 rows → `tooManyRows`;
  aliases map; blank lines skipped but line numbers preserved.

**T3 — Planner.** `app/utils/stock-import-plan.ts`, test `test/unit/stock-import-plan.test.ts`.
- What: `planStockImport({ rows, mode, motif, products }): StockImportPlan`, where `products` is a
  `Map` built by `indexProducts(list)` (keys: `String(id)` and `slug`). Pure: no fetch, no store.
  Applies §5.3, computes `variation` per mode, calls `ajustementStockSchema.safeParse` as the last gate, counts
  `ready / skipped / errors`.
- Done when: tests cover both modes; id and slug matching; duplicate detection flags **every** occurrence; `"12.0"`,
  `"1 200"` (space/NBSP thousands) and `"١٢"` (non-ASCII digits) are handled deliberately (accepted or rejected, and
  the test states which); count `== current` → skipped; receptions `0` or negative → `invalidQuantity`; reason 201
  chars → `reasonTooLong`; per-row reason beats the dialog reason; an archived product absent from the map is
  `unknownProduct`.

**T4 — Result files.** `app/utils/stock-import-files.ts`, test `test/unit/stock-import-files.test.ts`.
- What: `buildStockImportTemplate(mode)` and `buildStockImportErrorCsv(failures, originalRows)`. A cell that starts
  with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'` (spreadsheet formula-injection guard); fields with comma,
  quote or newline are quoted. Output starts with a UTF-8 BOM so Excel opens accents correctly.
- Done when: a failure whose product cell is `=HYPERLINK(...)` is neutralised; a reason containing `"` and a newline
  round-trips through `parseCsv` (T1) unchanged; template has header + one example row per mode.

**T5 — Setup schema.** `app/schemas/stock-import.ts`, test `test/unit/stock-import-schema.test.ts` (alongside
`inventaire-schema.test.ts`).
- Done when: blank or 201-char reason and an unknown mode are rejected with the i18n keys above.

### Phase B — Data access

**T6 — Catalogue snapshot.** `app/composables/useStockImportCatalogue.ts`, test in `test/nuxt/`.
- What: `useStockImportCatalogue()` exposes `{ products, isLoading, isError, refetch }`. Loads every active page at
  `taille=200` (sequentially, so 1 000 products cost 5 requests), using `useQuery` with a key under
  `apiQueryKeys.products` so any stock write invalidates it. `enabled` only while the dialog is open (not loaded on
  page view, to respect the SSR / above-the-fold rule in `AGENTS.md`). Confirm `ProductListQuery` exposes `taille`;
  add it to `app/types/api/produits.ts` with a source citation if it does not.
- Done when: a 2-page stub (`pages: 2`) yields the concatenated list; a failing page 2 surfaces `isError` and keeps
  page 1 out of the plan (no partial catalogue: a partial map would mislabel real products as `unknownProduct`).

**T7 — Commit loop.** `app/composables/useStockImportRun.ts`, test `test/nuxt/stock-import-run.test.ts`.
- What: `useStockImportRun()` exposes `{ state, progress, run(plan, mode), stop(), reset() }`. Sequential, awaited
  one at a time. Pacing constant `STOCK_IMPORT_INTERVAL_MS = 700` between writes (≈ 85/min, under 120/min even with
  the re-check reads counted separately, see R2). Count mode: before each write, GET the product inventory and compare
  `quantite_stock` to `stockBefore`; mismatch → failure `stockChanged`, no write. On 429: wait the `retry-after` header
  if present, else 15 s, then retry the **same row**, at most 3 times, then fail it `tooManyRequests`. On 403: stop the
  whole run (role lost), remaining rows untouched. On 409: fail the row with the backend's message (`conflict`).
  On network error: fail the row, continue. Always ends with **one** invalidation of `products.all` and
  `statistics.overview()`, including after `stop()` and after failures. `beforeunload` guard registered only while
  running (VueUse `useEventListener`).
- Done when (fake timers): rows are written in file order, one at a time; interval respected; 429 then 200 retries the
  same row once and applies it; a stale count row is not posted; 403 stops the run; `stop()` halts after the in-flight
  row; invalidation is called exactly once per run; unmount mid-run aborts without further writes.

### Phase C — UI

**T8 — Progress primitive.** `bunx shadcn-vue add progress` → `app/components/ui/progress/`. Not hand-edited, not
linted (ignored paths in `AGENTS.md` Gotchas). Done when the files exist and `bun run typecheck` is still clean.

**T9 — Preview table.** `app/components/products/StockImportPreview.vue`, test `test/nuxt/stock-import-preview.test.ts`.
- Props: `plan: StockImportPlan`. Renders summary chips and the table inside a `ScrollArea` with a sticky header; issue
  cells use semantic tokens (`text-destructive`, `text-muted-foreground`), movement sign with `−`/`+` characters
  (not arrows). Narrow container → issue text under the product name instead of a wide column.
- Done when: a plan with one ready, one skipped, one errored row shows the three counts and exposes each issue by an
  accessible name; no row is selectable or editable. (Test asserts counts and issue text, not classes or structure.)

**T10 — Dialog.** `app/components/products/StockImportDialog.vue`, test `test/nuxt/stock-import-dialog.test.ts`.
- What: orchestration only. Holds step state, file, parse result; delegates parsing to T1/T2, planning to T3, running
  to T7, file building to T4. XLSX goes through a dynamic `import("read-excel-file/browser")` (check the package's
  actual export path at install time) so it never enters the main bundle. The file is read with `File.text()` (CSV) or
  `File.arrayBuffer()` (XLSX). Rejects by extension **and** by size before reading. Closing is blocked during the run.
  Trigger slot like `InventoryAdjustmentDialog`. If it grows past orchestration, the progress and result views move
  to `StockImportProgress.vue` / `StockImportResult.vue`.
- States (every async surface): *catalogue loading* → Preview disabled + spinner; *catalogue error* →
  `InlineStateNotice` with retry inside the dialog; *file parse error* (missing column, too many rows, unreadable
  XLSX, wrong type, too large) → inline `role="alert"` message naming the column or limit; *no usable rows* → message
  and Import disabled; *running*; *partial failure*; *all applied* (success toast, dialog closes on Done).
- Done when: component tests cover the happy path per mode with a stubbed catalogue and stubbed movement endpoint
  (file → preview → confirm → result), a missing-column file, an oversize file, and the `direction`-only gate.

**T11 — Page wiring.** `app/pages/products.vue`: add the trigger button inside `v-if="canCreate"` next to
`products-add-button`, `data-testid="products-import-button"`, Phosphor `PhUploadSimple`, `variant="outline"`, label
from i18n. No layout change beyond the added button; the filter row keeps wrapping as today.
- Done when: a `direction` session sees the button, a `comptoir` session does not (assert in an existing page test or a
  small new one).

### Phase D — Copy and gates

**T12 — i18n.** `i18n/locales/products/en.json` and `fr.json`, under a new `products.stockImport` group (steps, mode
labels and helper text, column help, every issue and failure reason, counters, buttons, template/error file names).
English first, then French with the same keys. No raw UI strings in templates.
- Done when: `bun run i18n:check` passes (key parity and raw-string audit).

**T13 — Dependency.** `bun add read-excel-file` (pin exact, per the repo's pinning habit for modules). Confirm the
license and that `bunx fallow` does not flag it as unused.
- Done when: `bun.lock` is the only lockfile changed and the dynamic import resolves in `bun run build`.

**T14 — Gates.** `bun run lint`, `bun run format:check` (files touched only), `bunx fallow`, `bun run typecheck`,
`bunx vitest run`, `bun run build`, `bun run i18n:check`. The pre-commit hook is the gate; never `--no-verify`.

**T15 — Walkthrough.** `walkthroughs/2026-09-30-bulk-stock-import.md`, recording every deviation from this plan.

### Phase E — Manual verification (real app)

**T16 — Run it.** With the dev server and a real `direction` login, import: a 5-row delivery CSV, a count XLSX, a file
with every issue type, a file with 501 rows, a `;`-delimited Excel-saved CSV with accents. Check the product's
movement history shows one movement per row with the chosen reason.
- Done when: each scenario behaves as §5 states and the history is correct. Not E2E-automated (the repo has no e2e).

## 9. States matrix

| Surface | Loading | Empty | Error | Partial |
| :-- | :-- | :-- | :-- | :-- |
| Catalogue snapshot | spinner, Preview disabled | "No active products" (Preview disabled) | `InlineStateNotice` + retry | never shown partial; all-or-error |
| File parse | "Reading file…" | "No rows found" | inline alert naming column/limit | n/a |
| Preview | n/a | "Nothing to import" (Import disabled) | issues per row | ready + skipped + errors shown together |
| Run | bar + current product | n/a | failed rows listed, run continues | applied + failed both reported |
| Result | n/a | n/a | 403 mid-run stops the run, says so | "N applied, M failed, K not attempted" |

## 10. Tests (what earns its place)

Per `AGENTS.md`: unit for pure logic, component for the dialog; no e2e; nothing that only re-tests Vue, Zod or
TanStack.

- **Functionality:** both modes end to end through the planner and run; reason precedence; id and slug matching.
- **Robustness:** malformed CSV, BOM, `;` delimiter, ragged rows, missing columns, duplicate and unknown rows,
  501 rows, oversize file, stock changed between preview and commit, 429 retry then success, 429 exhausted, 409,
  network failure mid-run, `stop()`, unmount mid-run, one invalidation per run.
- **Security:** spreadsheet formula injection neutralised in the error CSV (and template); role gate (`comptoir` cannot
  open the dialog or trigger writes); file type and size rejected before reading; no file content is ever put into an
  error message that reaches the DOM as HTML (messages render as text).
- **Not tested:** `read-excel-file` internals, dialog markup and class names, toast wording, the shadcn progress bar.

## 11. Risks

| # | Risk | Surfaces when | Mitigation |
| :-- | :-- | :-- | :-- |
| R1 | Tab closed mid-run leaves a partial import | first real large import | `beforeunload` guard; every movement is audited individually; the error CSV plus history is the recovery path |
| R2 | Count-mode re-check doubles request count against the shared 120/min / 1 000/h windows; 500 rows could take ~12 min and starve other admins | first count import | 700 ms pacing, row cap 500, run-time estimate shown in the preview ("about N min"); Q1 lets the owner drop the re-check |
| R3 | Count mode races with live orders | counting during trading | re-check + server 409 + announced freeze; documented limit, not solved |
| R4 | Excel CSV quirks (`;` delimiter, cp1252 encoding, `12,5` decimals) | first Excel-saved file | delimiter sniffing, BOM strip, decimals rejected as `invalidQuantity`; cp1252 files show garbled accents in product text only (matching is by id/slug), accepted |
| R5 | New dependency weight and supply chain | install / build | lazy import, exact pin, licence check in T13 |
| R6 | Catalogue snapshot stale by preview-to-confirm time | long idle on preview | count re-check covers counts; receptions are relative so staleness does not matter |
| R7 | 403 mid-run (role revoked) | rare | stop the run, report "not attempted", keep applied |

## 12. Open questions

| # | Question | Options | Recommendation |
| :-- | :-- | :-- | :-- |
| Q1 | Keep the per-row stock re-check in count mode, given it doubles the request count? | (a) keep: safe against a changed row, ~2× slower; (b) drop: rely on the server's 409 guard only; (c) re-check only rows whose product appears in live orders (not knowable client-side) | **(a)**. A count posted as a stale delta silently leaves the wrong stock; the extra minutes are cheaper than a wrong inventory. Revisit if Operations finds it too slow. |
| Q2 | Header wording/naming for the button | "Import stock" / "Bulk stock" | "Import stock" (matches the owner's own phrase). |
| Q3 | Does `comptoir` need read-only access to the dialog (e.g. to download the template)? | yes / no | **no**: the movement endpoint is `direction`-only; hide the whole entry point. |

Assumptions made without asking (state, don't stall): `slug` is unique and stable enough to match on; first XLSX sheet
only; UTF-8 CSV expected; French and English share one template (column names in English, aliases accepted).
