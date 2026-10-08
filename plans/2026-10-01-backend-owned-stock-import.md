# Backend-owned stock import

Slug: `backend-owned-stock-import`.

## 1. Requirement, restated

Replace the current browser-owned CSV/XLSX parsing, active-catalogue download, row planning, and per-product write loop with one backend-owned import. The products-page modal remains responsible for choosing the mode, reason, and file, submitting it, and displaying the backend's per-row results. It must not fetch the full catalogue or calculate stock changes in the browser.

This plan supersedes the client-side execution architecture in `plans/2026-09-30-bulk-stock-import.md`; its user-facing file format, access restriction, limits, partial-result behavior, and EN/FR expectations remain the baseline unless explicitly changed below.

## 2. Reuse and verified context

### Frontend — `nowtech-admin` worktree

- `app/pages/products.vue` already provides the direction-gated import entry point and revised title/actions + filters layout; retain it.
- `app/components/products/StockImportDialog.vue`, `StockImportSetup.vue`, and `StockImportResult.vue` provide the modal shell, inputs, and result surface. Replace the preview/client-run flow with submit → pending → server result.
- `useApiWrite()` in `app/composables/useApi.ts` uses the CSRF-aware `$csrfFetch`; the BFF in `server/api/v1/[...path].ts` already proxies multipart bodies and permits a 16 MB multipart request. `buildProxyHeaders()` already forwards `cle-idempotence`.
- `app/utils/stock-import-files.ts` can retain the template and error-CSV download helpers, adapted to the server response. `apiQueryKeys` can invalidate products, inventory histories, and overview statistics after the request settles.
- Current browser-only catalogue/parser/planner/runner modules and `read-excel-file` are not required once the endpoint owns those responsibilities.

### Backend — sibling `NowTech-backend-` worktree

- `src/catalogue/administration.controller.ts` already exposes direction-only stock movement routes.
- `AdministrationCatalogueService.ajusterStock()` in `src/catalogue/administration.service.ts` writes one movement in a transaction, obtains the actor from the authenticated caller, and appends a stock snapshot.
- `InventaireService.appliquerAjustement()` in `src/inventaire/inventaire.service.ts` locks the stock row and enforces non-negative/int4 stock. Count mode must use that same lock to compute its delta from the **current** quantity; a client- or preflight-computed absolute count must never overwrite a concurrent movement.
- The backend uses Nest + Express + Multer, Prisma migrations under `prisma/migrations/`, and Jest. `src/vitrine/vitrine.controller.ts` is the multipart-upload precedent. Do not add a foreign key to `nowtech.produits`: that schema is regenerated during catalogue ingestion.
- Backend limits already established by the import plan: `.csv` / `.xlsx`, 5 MiB, at most 500 non-empty data rows, first worksheet only, ID-or-slug matching, direction-only, and up to 200 characters for the effective reason. Per-movement changes preserve the existing ±1,000,000 DTO limit.

## 3. Proposed API contract

**Endpoint:** `POST /v1/catalogue/administration/produits/inventaire/import` (called through the admin BFF as `/api/v1/...`). It consumes `multipart/form-data` with exactly one `fichier`, `mode` (`reception` or `count`), and `motif` (trimmed, 1–200 characters), plus a UUID `Cle-Idempotence` request header. It is direction-only and processes at most one 5 MiB file / 500 data rows.

The backend validates the complete file structure and prepares all row inputs before its first stock write. Row-level failures do not block valid rows: each valid row is handled independently and the response describes applied, unchanged, and failed rows. A malformed/oversized file or invalid top-level fields fails before any movement. In count mode, the backend reads/locks the stock row and derives the correction atomically at commit time; a target already equal to the locked quantity is returned as skipped without a ledger movement.

Response contract (exact field names to live in backend response types and be mirrored in `app/types/api/stock-import.ts`):

```ts
{
  importation_id: string
  mode: "reception" | "count"
  total_lignes: number
  appliquees: number
  ignorees: number
  echouees: number
  lignes: Array<{
    ligne: number
    produit_saisi: string
    quantite_saisie: string
    motif_saisi: string | null
    produit_id: number | null
    produit_nom: string | null
    variation: number | null
    stock_avant: number | null
    stock_apres: number | null
    statut: "applique" | "ignore" | "echec"
    code_erreur: string | null
    message: string | null
  }>
}
```

`code_erreur` is a stable enum for UI translation (unknown/inactive product, duplicate product, invalid quantity/reason, movement limit, insufficient stock, and unexpected row failure); `message` is bounded backend detail for display, not a value the frontend must parse. The raw input columns are returned so the frontend can offer a failed-row CSV without reparsing the upload. There is no preview plan, client-derived stock delta, client stop button, or per-row HTTP request.

**Idempotency and partial progress:** persist the import request key, caller, payload hash, parsed row inputs, and each row outcome. The key is unique per caller; reusing it with different contents returns 409. A row's stock movement and successful row outcome commit in the same transaction. A repeated request with the same key returns a completed result or resumes only rows without a persisted outcome, so a lost response does not duplicate already-committed receipts. Serialize concurrent requests for the same key. Persist metadata and parsed cells only, never the uploaded binary.

## 4. Implementation tasks

Each task follows the repository's red → green discipline: write the failing spec from this contract first, capture the expected failure, then implement the smallest change that passes it.

### Phase A — Backend parser and contract

**T1 — File parsing and bounded inputs.** Backend files: `src/catalogue/stock-import.parser.ts`, `src/catalogue/stock-import.parser.spec.ts`, `package.json`, and `pnpm-lock.yaml`.
- What: Add a pure parser for CSV and XLSX. Preserve UTF-8/BOM, comma-or-semicolon CSV, quoted fields, header aliases (`product|produit`, `quantity|quantite`, `reason|motif`), first-sheet-only XLSX behavior, physical source line numbers, and the current 500 non-empty-row limit. Use a maintained server-compatible XLSX parser; add its dependency only to the backend. Reject empty files, invalid quoting/workbooks, missing required headers, excess rows, extension/content mismatch, and unbounded worksheet dimensions before returning rows.
- Done when: parser specs cover both formats, aliases, BOM/delimiters/quotes, row-number mapping, empty/malformed inputs, size/row/dimension boundaries, and no parser accepts more than 500 non-empty rows.

**T2 — Request, result, and upload boundary.** Backend files: `src/catalogue/stock-import.dto.ts` (or the existing administration DTO module if that matches local style), `src/catalogue/administration.controller.ts`, and controller specs in `src/catalogue/administration.inventaire.spec.ts` or a focused `src/catalogue/stock-import.controller.spec.ts`.
- What: Add the multipart route with one in-memory file, a 5 MiB Multer cap, `mode`/`motif` validation, `@ApiConsumes`/Swagger contract, and direction authorization. Reject absent/unexpected files or fields. Keep parsing/service work out of the controller. Define and document stable row error codes and the response shape above.
- Done when: route metadata and tests prove direction-only access, valid multipart binding, DTO and file validation, one file only, and rejection before the service is called on an invalid top-level request.

### Phase B — Backend domain execution and replay safety

**T3 — Durable import/replay record.** Backend files: `prisma/schema.prisma`, a new dated migration under `prisma/migrations/`, and focused model/service specs.
- What: Add import-run and row-result storage in the `boutique` schema for the idempotency key, payload hash, mode/caller, parsed source cells, processing state, and row outcomes. Add indexes/unique constraints and least-privilege grants consistent with the application DB role. Do not add any FK to the regenerated `nowtech` schema and do not store original file bytes.
- Done when: the migration chain applies cleanly to a disposable local test DB, Prisma client generation/build succeeds, duplicate caller/key is serialized, a different payload under the same key conflicts, and recorded movement outcomes survive a replay.

**T4 — Backend validation and per-row stock execution.** Backend files: `src/catalogue/administration.service.ts`, `src/catalogue/administration.inventaire.spec.ts` (or new `src/catalogue/stock-import.service.spec.ts`), `src/inventaire/inventaire.service.ts`, and their specs.
- What: Resolve numeric IDs/slugs against active products in one bounded catalogue query; flag duplicate aliases for the same product; validate quantities and effective per-row/default reason; and persist every row result. Process eligible rows sequentially, each in its own transaction so one stock conflict does not roll back other valid rows. Reuse the existing actor and movement ledger semantics. Add a count-to-target operation that computes `target - current` under the inventory row lock, skips zero delta, enforces non-negative/int4 stock and the existing per-movement limit, and writes the correction plus snapshot consistently. Persist the row outcome in the same transaction as its successful movement. On replay, skip rows that already have durable outcomes.
- Done when: service tests cover reception and count semantics, concurrent stock changes during count, no-change skips, invalid/archived/unknown and duplicate products, bounds, negative-stock conflicts, partial success, actor attribution, movement history, and no duplicate movement after same-key retry or interrupted-run resume.

### Phase C — Frontend becomes upload + result display

**T5 — API type and one-request upload.** Frontend files: `app/types/api/stock-import.ts`, `app/composables/useStockImportCatalogue.ts`, `app/composables/useStockImportRun.ts`, `app/components/products/StockImportDialog.vue`, and any targeted specs under `test/nuxt/`. Add source citations to the backend route/types in the API type file, per `AGENTS.md`.
- What: Replace catalogue fetching and the browser movement loop with one `useApiWrite()` multipart request, including a per-attempt UUID `Cle-Idempotence` reused on transport retry. Do not set multipart `Content-Type` manually. Keep the direction gate. Remove browser dependencies on parsed rows, catalogue snapshots, and planned stock deltas. Invalidate product lists, matching inventory-history key prefixes, and overview statistics once after any submitted request that may have committed rows, including an ambiguous transport failure.
- Done when: component/composable tests assert one POST, correct multipart fields/header, no products-catalogue GET, no per-row POSTs, no automatic POST retry, authorization gating, and cache invalidation occurs once after settlement.

**T6 — Modal states, display, and exports.** Frontend files: `app/components/products/StockImportDialog.vue`, `StockImportSetup.vue`, `StockImportResult.vue`, `StockImportProgress.vue`, `app/types/stock-import.ts`, `app/utils/stock-import-files.ts`, `i18n/locales/products/en.json`, `i18n/locales/products/fr.json`, relevant `test/nuxt/stock-import-*.test.ts` and `test/unit/stock-import-*.test.ts`, `package.json`, and `bun.lock`.
- What: Keep file/mode/reason input and the downloadable template; replace Preview/Progress with a disabled submitting state and server-returned results. Display totals and per-row outcomes from the response, translate stable error codes, and retain error CSV download from returned raw row fields. Show file-level HTTP/parser errors without pretending any rows were applied. Remove obsolete client CSV/XLSX parsing/planning/catalogue/retry modules and the frontend `read-excel-file` dependency after tests no longer use them. Preserve the products-page button label/layout and EN/FR parity.
- Done when: component tests cover pending, complete success, partial success, all rows rejected, file-level failure, error export, close behavior while submitting, and copy parity; `i18n:check` passes.

### Phase D — End-to-end verification

**T7 — Cross-repo contract and operational check.** Files: backend controller/e2e specs under `src/catalogue/` or `test/`, frontend `test/nuxt/stock-import-dialog.test.ts`, and this plan's eventual walkthrough.
- What: Exercise the BFF multipart path with a real in-memory CSV and XLSX fixture against the Nest test application and a test DB; verify response types and one movement per successful row. Measure a 500-row file through the deployed proxy path before enabling the limit in production. Confirm replay after a simulated lost response does not duplicate movements.
- Done when: backend focused Jest suites + `pnpm build` pass; frontend stock-import suites + `bun run typecheck`, `bun run lint`, `bun run i18n:check`, touched-file `oxfmt --check`, and `git diff --check` pass. The authenticated manual scenarios in the earlier plan pass for reception, count/no-change, partial failure/error CSV, and movement history in EN and FR.

## 5. UI states and failure behavior

- **Setup:** direction-only; mode, reason, template link, and `.csv`/`.xlsx` picker. Client size/extension checks are quick feedback only; backend validation is authoritative. No catalogue-loading/error state.
- **Submitting:** one spinner/label; disable duplicate submit and block dialog dismissal while the request is active. Do not claim cancellability: aborting the browser request cannot guarantee that server-side movements stop.
- **Result:** applied / skipped / failed totals and the backend's line-level result. Valid rows may be applied even when other rows fail; the UI must say so before submit. Error CSV uses response fields.
- **Request error:** show file/top-level API errors as no-write failures when the API guarantees preflight rejection. For an ambiguous transport error, retain the exact file and idempotency key and offer retry with that same key; never silently generate a new key for that retry.
- **Refresh:** invalidate relevant product, inventory, and overview query prefixes after the request settles, since a transport error can follow committed rows.

## 6. Risks and open questions

| Question / risk | Options | Recommendation / earliest check |
| :-- | :-- | :-- |
| Can a single synchronous upload complete within the production proxy/request timeout at 500 rows? | Synchronous result response; or a persisted asynchronous job with polling. | Assume synchronous to match the requested upload → results modal, but make T7 measure the worst-case 500-row path through the actual proxy before release. If it exceeds the timeout, stop and ask before changing to a job/poll contract. |
| How long should persisted idempotency/result rows be retained? | Keep as an import audit; expire after a defined period. | Keep parsed rows/results but not file bytes; confirm retention before migration. Recommend align with stock-ledger audit needs, then add bounded cleanup only if operations requires expiry. |
| XLSX parser resource exhaustion | Trust extension; or validate ZIP/workbook contents and dimension bounds. | Validate content and bounded worksheet dimensions, plus 5 MiB input, in T1 before any service writes. |
| Mid-import server failure | No recovery; retry whole import; durable per-row resume. | Persist row outcome atomically with each successful movement and resume only pending rows using the same caller-scoped idempotency key. Test this before wiring the UI. |

Out of scope: editing rows in the modal, previewing a browser-calculated stock plan, importing into archived products, multi-sheet XLSX, background queue infrastructure unless the measured timeout requires a separately approved design, and changes to the products header/filter layout.


## Plan amendment: backend preview

The user now requires the operator to see a diff before anything is written, then confirm explicitly. This replaces the "no preview" stance above. The diff is computed by the backend, never by the browser.

- Same endpoint, new optional multipart field `apercu`: the string `"true"` or `"false"` (anything else, or a repeated field, is a 400). Omitted means `false`. Unknown fields are still rejected.
- With `apercu=true`: same parsing, same file-level 400 errors, same row error codes, direction only, same 5 MiB / 500 rows limits. Each row is evaluated against the current stock; nothing is written (no movement, stock change, import record or snapshot). `Cle-Idempotence` is not needed and is ignored if sent.
- Response is `ReponseImportStock` plus `apercu: boolean` (`true` for a preview, `false` for every real run, replays included). In a preview `importation_id` is `null` and `statut: "applique"` means "would apply". Zero delta in count mode is `ignore`.
- The preview is advisory. A real run recomputes under the row lock, so numbers can differ if stock moved in between. The confirmation step should say so and show the real result after.
- Frontend flow: send the file with `apercu=true`, render the diff, and on explicit confirm send the real request (new `Cle-Idempotence` per confirmed attempt, reused on retry). Contract with file:line citations: `walkthroughs/2026-10-01-backend-owned-stock-import-preview-backend.md`.
