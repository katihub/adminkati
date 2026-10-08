## What I built
Backend half of `plans/2026-10-01-stock-export.md` (T1-T6) in `/Users/michaelnji/Projects/nvc/NowTech-backend-` (branch `feat/prod-stock-mgt`, nothing committed). The list filter is now one shared builder, a new direction-only `GET .../produits/inventaire/export` produces an import-ready CSV or XLSX, and the importer treats a blank quantity as "not touched" (`ignore` + response-only `raison_ignore`). No migration, no new dependency, no drift detection.

## Contract the frontend mirrors

### Export endpoint
- `GET /v1/catalogue/administration/produits/inventaire/export` (BFF: `/api/v1/catalogue/administration/produits/inventaire/export`). `src/catalogue/administration.controller.ts:153-160`.
- Access: `@Roles(Role.direction)` only (`:150`). Throttle `moyen 5/min`, `long 60/h` (`:151`), same as the order PDF export.
- Query (`ExporterStockDto`, `src/catalogue/stock-export.dto.ts:22-28`): every filter of `GET produits` with identical validators and defaults (`q`, `rayon`, `categorie`, `marque`, `stock`, `etat` default `actifs`, `tri` default `recent`), plus required `mode` = `reception|count` and required `format` = `csv|xlsx` (`FORMATS_EXPORT`, `:6`). `page`, `taille` and any unknown param are 400 (global ValidationPipe, whitelist + forbidNonWhitelisted); the frontend must strip them.
- 200 headers: `Content-Type: text/csv; charset=utf-8` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; `Content-Disposition: attachment; filename="stock-<mode>-<YYYY-MM-DD>-<HHmm>.<csv|xlsx>"` in Africa/Douala time (`stock-export.service.ts:42-45`); `Cache-Control: no-store` (`controller:152`).
- Errors: 400 Nest validation body (no `code_erreur`) for bad/missing params; 400 `{ statusCode: 400, error: "Bad Request", message, code_erreur: "export_trop_volumineux", maximum: 10000 }` when more than `EXPORT_MAX_LIGNES = 10_000` rows match (`stock-export.dto.ts:13`, `stock-export.service.ts:73-81`; single query with `limit 10001`); 401/403/429 from guards. Zero matches returns a header-only file.
- Columns, in order: `product;name;brand;category;current_stock;quantity;reason` (`stock-export.service.ts:9`). `category` is the primary category name. Count: `quantity = current_stock` for active products, empty for withdrawn. Reception: `quantity` empty. `reason` always empty.
- CSV: UTF-8 BOM, `;`, CRLF (also after the last row), RFC 4180 quoting; text cells (`name`, `brand`, `category`) starting with `= + - @ TAB CR` get a leading `'` (`stock-export.csv.ts`); numbers never altered. XLSX: one sheet `Stock`, inline strings, no formulas (`stock-export.xlsx.ts`).

### Import change
- `LigneResultatImport.raison_ignore: "quantite_vide" | "aucun_ecart" | null` (`stock-import.dto.ts:63,79`), present on every line of preview, real run and replay. `ignore` + empty `quantite_saisie` is `quantite_vide`; any other `ignore` is `aucun_ecart`; otherwise `null` (`stock-import.service.ts:77-78`, set at `:558` and `:580`, derived from stored data so old records replay as `aucun_ecart`). `statut` has no new value and `code_erreur` stays null for `ignore`.
- A row with a blank (trimmed) quantity is `ignore` before the duplicate check and before any other validation, in preview (`:137`) and real run (`:264`). The product is shown when resolved; unknown or withdrawn is not an error. `variation`, `stock_avant`, `stock_apres`, `code_erreur`, `message` are null. Blank rows do not register in `vus` and are excluded from the resume seed (`:253-255`). They count in `total_lignes` and `ignorees`, and toward the 2000 cap (unchanged: 2001 is `trop_de_lignes`).
- A row where product and quantity are both blank but a reason is present is `ignore` too (the blank check wins).

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| T1 shared DTO + builder | Done | `administration.dto.ts:61,89`, `filtre-produits.ts:25`, `administration.service.ts:162` |
| T2 CSV writer | Done | `stock-export.csv.ts` |
| T3 XLSX writer | Done | `stock-export.xlsx.ts` |
| T4 service, DTO, route, module | Done | `stock-export.dto.ts`, `stock-export.service.ts`, `administration.controller.ts:123-160`, `catalogue.module.ts` |
| T5 blank quantity | Done | `stock-import.service.ts`, `stock-import.dto.ts`, Swagger text in `administration.controller.ts` (stale "500" fixed to 2000) |
| T6 round-trip + parity e2e | Done | `test/stock-export.e2e.spec.ts` |
| T7-T12 frontend / manual checks | Not in scope | -- |

## Deviations
- T1 spec lives in a new `src/catalogue/filtre-produits.spec.ts`, not `administration.service.spec.ts` (that suite already has 11 unrelated failures).
- The `STATUT_PAR_FILTRE` map moved out of `administration.service.ts` into `filtre-produits.ts`; the list's SQL is unchanged (existing `listerProduits` specs pass untouched).
- `enregistrerEchec` renamed `enregistrerSansMouvement` since it now also stores `ignore` rows.
- Existing specs that build the controller got a `StockExportService` provider / 5th ctor arg, and exact-shape assertions got `raison_ignore`. Reception/count "blank quantity is invalid" cases in `test/stock-import.integration.spec.ts` were removed or changed to `'+3'` because blank is now a skip.

## Tests
Written first by the tester agent (red = TS compile errors, since modules/fields did not exist); verified against a scratch implementation, then made green here.
- `pnpm --pm-on-fail=ignore --dir <backend> test -- src/catalogue src/inventaire test/stock-import test/stock-export --runInBand`: 19 suites, 636 tests; 625 pass, 11 fail. All 11 are `administration.service.spec.ts` (relations, image URLs, derived brands) = the known pre-existing failures. `src/catalogue/marques-logo.service.spec.ts` also fails to compile (see below). Everything of mine passes: filtre-produits, csv (injection), xlsx (injection), service, controller, stock-import integration (100 tests), both e2e suites (real disposable DBs, not skipped, including export-to-import round trip for each mode x format and id/order parity with the paged list over 16 filter sets).
- `test/stock-import.e2e.spec.ts` "2000 rows" test failed once when run in parallel with other DB suites ("Unable to start a transaction", the 2000-way seeding `Promise.all`); it passes alone (8/8) and under `--runInBand`.
- `tsc --noEmit -p tsconfig.json`: 2 errors, both `sharp` call signatures in `src/catalogue/marques-logo.service.ts:330` and its spec, which is uncommitted work from another session, not mine. No error in my files.
- `pnpm build` (`nest build`): fails on that same `marques-logo.service.ts` error; I did not verify a clean build of my changes in isolation.
- Not run: `main.spec.ts`, lint, the full backend suite, Excel/LibreOffice/Google Sheets opening of the XLSX (T12 manual), timing of the 4,305-row export.

## Not done
Frontend tasks T7-T12; manual Excel-fr / LibreOffice / deployed-BFF checks; drift detection.

## Notes for the reviewer
- The working tree also contains unrelated uncommitted changes (`administration.service.ts` marques/logo block, `.env.example`, `sql/*.sql`, `configuration.ts`, `marques-logo.service*`). They are not mine; commit selectively.
- Ordering ties: the list's `order by` has no tie-breaker (kept byte-identical), so `tri=nom` or price with equal values is not guaranteed identical between a paged list and the export. The parity test seeds distinct values.
- Excel strictness of the hand-built XLSX is only proven against our own parser (R2 fallback: `write-excel-file`).
- Injection neutralisation applies to text columns only; the `'` prefix is visible in the CSV by design (matches frontend `csvCell`), and a product whose name starts with `=` is still resolved because the importer matches on the id.
