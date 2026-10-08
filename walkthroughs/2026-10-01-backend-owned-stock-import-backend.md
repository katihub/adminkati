## What I built
The backend half (Phases A and B, T1 to T4) of `plans/2026-10-01-backend-owned-stock-import.md`, in `/Users/michaelnji/Projects/nvc/NowTech-backend-` on `feat/prod-stock-mgt`. `POST /v1/catalogue/administration/produits/inventaire/import` takes a multipart CSV/XLSX, validates the whole file before any write, then applies each valid row in its own transaction. Row outcomes and a caller-scoped idempotency key are persisted, so a replay returns the stored result or resumes only the rows without an outcome. Nothing is committed or pushed in the backend repo. Nothing in the frontend repo was touched except this file.

## Plan coverage
| Plan item | Status | Where (backend repo) |
| :-- | :-- | :-- |
| T1 parser: CSV and XLSX, aliases, BOM, `;`, quotes, physical line numbers, 500-row cap, bounded workbook | Done | `src/catalogue/stock-import.parser.ts`, spec `src/catalogue/stock-import.parser.spec.ts` |
| T1 backend-only XLSX dependency | Done | `package.json` (`read-excel-file ^9.3.10`, `fflate`), `pnpm-lock.yaml` |
| T2 multipart route, 5 MiB cap, one file, DTO validation, direction-only, Swagger | Done | `src/catalogue/administration.controller.ts:240-256` (route), `src/catalogue/stock-import.dto.ts:21` (DTO), spec `src/catalogue/stock-import.controller.spec.ts` |
| T2 stable row error codes and response types | Done | `src/catalogue/stock-import.dto.ts:33-72` |
| T3 durable import and row-result tables, migration, grants, unique `(acteur_id, cle)` | Done | `prisma/schema.prisma:246` and `:267`, `prisma/migrations/20261001090000_importations_stock/migration.sql` |
| T4 catalogue resolution, validation, per-row transactions, replay and resume | Done | `src/catalogue/stock-import.service.ts` (`ouvrir` :132, `executer` :207, `terminer` :426) |
| T4 count to target under the stock row lock, zero delta is `ignore` | Done | `src/inventaire/inventaire.service.ts:251` (`appliquerComptage`) |
| T4 tests: reception, count, concurrency, partial success, actor, replay, resume | Done | `test/stock-import.integration.spec.ts` (real Postgres), `src/inventaire/inventaire.comptage.spec.ts` |
| Measure 500 rows | Partial | Service-level only, 2072 ms locally. The deployed proxy path is a T7 item and was not measured. |

## Deviations
- **New `StockImportService`** (`src/catalogue/stock-import.service.ts`) instead of adding to `administration.service.ts` (T4 file list). That file is already 1,200 lines and the import has its own state, so I kept it separate. It is registered in `src/catalogue/catalogue.module.ts`.
- **Shared actor helper.** `acteurStock` was private to the admin service. I moved its body to an exported `acteurDepuisAppelant` in `src/inventaire/inventaire.service.ts`; the admin service now delegates to it, so behaviour is the same. I also moved `MOTIF_INITIALISATION_PARESSEUSE` there for the same reason. This touches `src/catalogue/administration.service.ts`, which the plan did not list.
- **One inventory snapshot per import, not per row.** `terminer` writes the snapshot and the `termine` mark in one transaction, only if at least one row was applied. Per-row snapshots would add up to 500 `inventory_snapshots` rows per import. It also means a resumed import never snapshots twice.
- **"Serialize concurrent requests for the same key" is implemented as a lease.** Each row extends `bail_expire_le` (120 s). A second call with the same key while the lease is live gets 409 `importation_en_cours`; it does not wait. The frontend should retry the same key. If the lease has expired, one caller wins an atomic `updateMany` and resumes.
- **Controller header check.** Nest's `@Headers` does not accept pipes, so the UUID check is done in `importerStock` with `isUUID`, before the service is called.
- **Multer cap is `IMPORT_MAX_OCTETS + 1`.** Multer rejects a file whose size reaches `fileSize`, so a cap of exactly 5 MiB would reject a 5 MiB file. A file over 5 MiB gets 413 from Multer. The parser's `fichier_trop_volumineux` code is only reachable when the service is called directly.
- **Spec fixes to tester-written tests**, all test-side:
  - Two `lignes[0].x` accesses needed `?.` for `noUncheckedIndexedAccess`.
  - One CSV delimiter case used a header (`"Produit;a;b;c"`) that cannot be an alias, so I changed it to `"Produit","Quantite","Note;a;b;c"`.
  - `@nestjs/swagger/dist/constants` is not resolvable under Jest, so the spec reads `'swagger/apiConsumes'` directly.
  - The int4-ceiling count test now resets its 2,147,483,000-unit product in a `finally`, because the snapshot total is summed as int4 and the leftover quantity made every later snapshot overflow.
- **Check constraint relaxed during testing.** The first migration draft also tied `statut` to `traite_le`. The tester's raw-insert hygiene test showed that was stricter than needed, so I dropped it. Only `("statut" = 'echec') = ("code_erreur" IS NOT NULL)` remains.

## Tests
Commands, all from the backend, with `pnpm --config.pm-on-fail=ignore --dir <backend> ...` (see Notes for why):
- `test -- src/catalogue/stock-import test/stock-import src/inventaire`: **all green after the fixes above.** The earlier combined run of the parser, controller, comptage, inventaire.service and integration suites showed 118 passed in the three stock-import suites and 66 in the two inventaire ones.
- Parser spec: 57 tests, including a sheet addressed at row 1,048,576 or column AY, a `<dimension>` of `A1:XFD1048576`, and a 40 MiB decompressed zip bomb rejected in under 3 s.
- Controller spec: 24 tests (multipart binding, trimmed `motif`, mode/motif/file/header rejections without a service call, 413 above 5 MiB, exactly 5 MiB accepted, 409 passthrough, Reflect metadata for POST, path, `Role.direction`, `multipart/form-data`).
- Integration spec: 38 tests against a real disposable Postgres 17 (the dev container on `localhost:5433`). It covers:
  - reception and count semantics, concurrent count against a reception, no-change skips, and a product with no stock row;
  - unknown, withdrawn and duplicate products, and bounds;
  - actor attribution, partial success, and one snapshot per import;
  - same-key replay, key conflict and concurrent same-key calls;
  - resume after a simulated database outage mid-run;
  - table hygiene: no file-content column, no FK to `nowtech`, unique `(acteur_id, cle)`, and DELETE and TRUNCATE denied to `nowtech_app`;
  - a 500-row import.
- Full suite: `Tests: 11 failed, 780 passed, 791 total`, `Suites: 2 failed, 36 passed`. The two failing suites are `src/catalogue/administration.service.spec.ts` (11 tests) and `src/main.spec.ts`. I reproduced the same failures on a clean `HEAD` worktree (`edd49d2`, 11 failed in those two suites), so they predate this work. `main.spec.ts` passed when run on its own in my tree; I did not investigate why it fails in the full run.
- `pnpm build`: `nest build` completes with no errors.
- **Migration:** the integration suite runs `prisma migrate deploy` on a fresh database every run, so the whole chain including `20261001090000_importations_stock` applied cleanly on Postgres 17. I also applied the chain to a throwaway database and ran `prisma migrate diff --from-url <db> --to-schema-datamodel prisma/schema.prisma`. The only difference reported was an existing table `sales_goals` that exists in the database but not in the schema, which is unrelated to this change. The throwaway database was dropped.
- 500-row reception, service level, local Postgres: `[stock-import] 500 lignes importees en 2072 ms`. This does not include multipart parsing, the BFF or Traefik. T7 must still measure the real path. I saw nothing here that suggests the synchronous design is too slow.

Not covered on purpose or by design: `stock_insuffisant` and `echec_inattendu` as row codes have no end-to-end test. They are not reachable through the public flow today (reception quantities are positive, and a count correction cannot go below zero). The mapping exists and is covered at the `appliquerAjustement` unit level for the exceptions.

## Not done
- T5, T6 and T7. T7's items are the measurement through the deployed proxy, the BFF multipart test and the cross-repo contract test.
- No ESLint or lint script runs in this repo (`pnpm lint` needs ESLint, which is not installed), so there is no lint evidence.
- No retention or cleanup job, by decision. Rows are kept as an audit trail.

## Notes for the reviewer
- **Friction, not a change.** In this shell `pnpm` fails under corepack because `packageManager` says 11.6.0 and the installed pnpm is 11.10.0; I used `--config.pm-on-fail=ignore`. `cd` is broken in this shell by a zsh hook, so I used absolute paths throughout.
- **XLSX engine.** `read-excel-file` (the same library the frontend uses) without a dimension guard ran out of memory (process abort, exit 134) on a sheet with a cell at `XFD1048576`, which I reproduced. That is why `inspecterClasseur` in the parser streams the archive with `fflate` and counts decompressed bytes. Limits are 32 MiB per entry, 64 MiB total, 200 entries, and any worksheet entry (not only the first) with a `<dimension>`, `<row r>` or `<c r>` beyond row 10,000 or column AX is rejected as `dimensions_excessives`. A workbook whose second sheet is larger than that is therefore rejected even though only the first sheet is read. Reviewer: please check the streaming error handling, since fflate swallows exceptions thrown from `ondata`; I record the first violation and rethrow it after the walk.
- **Adjacent problem, not fixed.** `InventaireService.total()` casts `sum(quantite)` to int4. With total stock above 2,147,483,647 every snapshot fails with "integer out of range". Not reachable at today's volumes, but it would make an import's final transaction fail.
- **Behaviour choices to confirm.**
  - A later row for a product already referenced by an earlier row (by id and/or slug) is always `produit_en_double`, even if the earlier row was itself invalid.
  - Precedence on a row is: missing product, unknown product, row reason over 200, then quantity.
  - A count of 0 on a product with no stock row is `ignore` and creates no row and no movement. A count above 0 initialises it first (an `initialisation` movement, then a `correction`).
  - In count mode a target above 2,147,483,647 is `stock_trop_eleve`, and a difference above 1,000,000 is `variation_hors_limite`.
  - A row failure that is not a known stock error is persisted as `echec_inattendu` with a generic message and logged. If the database itself is down, the request fails and the row stays without an outcome for the resume.
- **Replay hash.** The fingerprint covers mode, default reason and the parsed cells, not file bytes. The same data uploaded as CSV and as XLSX under one key counts as the same content.
- **HTTP status.** The route answers 200, also on replay. The plan did not say 200 or 201.

## Contract for the frontend (T5, T6)

Endpoint: `POST /v1/catalogue/administration/produits/inventaire/import`, proxied as `/api/v1/catalogue/administration/produits/inventaire/import`. Controller: `src/catalogue/administration.controller.ts:240-256`.

Request: multipart fields `fichier` (one file, `.csv` or `.xlsx`, at most 5 MiB), `mode` (`reception` or `count`), `motif` (trimmed, 1 to 200 characters). Header `Cle-Idempotence` must be a UUID. No other field or file is accepted (400). Direction only (`@Roles(Role.direction)`).

Success, HTTP 200 (`src/catalogue/stock-import.dto.ts:51-74`):
```ts
type ReponseImportStock = {
  importation_id: string
  mode: "reception" | "count"
  total_lignes: number
  appliquees: number
  ignorees: number
  echouees: number
  lignes: Array<{
    ligne: number            // physical line (CSV) or sheet row (XLSX), header included
    produit_saisi: string
    quantite_saisie: string
    motif_saisi: string | null
    produit_id: number | null
    produit_nom: string | null
    variation: number | null
    stock_avant: number | null
    stock_apres: number | null
    statut: "applique" | "ignore" | "echec"
    code_erreur: CodeErreurLigne | null   // non-null exactly when statut is "echec"
    message: string | null                // French, at most 500 characters, null unless echec
  }>
}
```

Row error codes `CodeErreurLigne` (`src/catalogue/stock-import.dto.ts:33-44`):
`produit_manquant`, `produit_introuvable` (unknown, or withdrawn), `produit_en_double`, `quantite_invalide`, `motif_invalide`, `variation_hors_limite`, `stock_insuffisant`, `stock_trop_eleve`, `echec_inattendu`.

Request-level failures. The body is `{ statusCode, error, message, code_erreur }` for the codes below (`src/catalogue/stock-import.service.ts:117` for file errors, `:179` and `:196` for the 409s):
- **400** with `code_erreur` from `CodeErreurFichier` (`src/catalogue/stock-import.parser.ts:29-40`): `fichier_vide`, `fichier_trop_volumineux`, `format_non_pris_en_charge`, `contenu_incoherent`, `classeur_invalide`, `csv_invalide`, `colonnes_manquantes`, `aucune_ligne`, `trop_de_lignes`, `dimensions_excessives`, `cellule_trop_longue`. Nothing was written.
- **409** `cle_idempotence_conflit`: same key, different content. Nothing was written.
- **409** `importation_en_cours`: same key while the first run still holds its lease (120 s, extended after each row). Retry with the same key.
- **400** without `code_erreur`: invalid `mode` or `motif` (the class-validator message array), a missing or extra field, a missing file, a second file, a missing or non-UUID `Cle-Idempotence`.
- **413**, stock Nest/Multer body without `code_erreur`: file above 5 MiB.
- **401 and 403**: the existing auth guards.

Replay: the same key with the same content returns the stored result (HTTP 200, same `importation_id`). If an earlier run stopped part-way, the call resumes the rows that have no outcome. The key is scoped to the caller.

Parsing rules the UI template and copy can rely on: header aliases `product|produit`, `quantity|quantite|quantité`, optional `reason|motif` (case and accent insensitive, any column order, unknown columns ignored); `,` or `;` delimiter; BOM accepted; blank rows skipped; at most 500 non-empty data rows; only the first worksheet of an `.xlsx`; each cell at most 1,000 characters. Reception quantities are integers from 1 to 1,000,000. Count targets are integers from 0 up to 2,147,483,647, and the correction (`target - current`, computed by the server) is limited to 1,000,000 in absolute value. A row's own `reason` overrides the default `motif`; the effective reason is capped at 200 characters.

---

## T7 - cross-repo contract and operational check (2026-10-01)

Nothing committed or pushed in either repo. Everything below was run locally; no production or deployed host was called.

### Added
- Backend `test/stock-import.e2e.spec.ts` (new, 6 tests). Nest test app with the real `AdministrationCatalogueController`, the real `StockImportService` and `InventaireService`, the real migration chain on a disposable `test_inventaire_*` Postgres 17 database (same harness as `test/stock-import.integration.spec.ts`). Requests are real multipart bodies sent over HTTP with supertest. The auth guard is replaced by a middleware that sets a `direction` caller, as in `stock-import.controller.spec.ts`. These are verification tests for behaviour that already existed, so they passed on first run (no red phase).
  - CSV and XLSX (hand-built in-memory workbook): response keys match the contract exactly (top level and per row), row numbers, `applique` / `echec` codes (`produit_introuvable`, `produit_en_double`), and exactly one non-initialisation movement per applied row.
  - Count mode: target equal to current stock gives `ignore`, `variation 0`, no movement and unchanged quantity; a different target gives one movement.
  - Same key after a dropped first response: replay returns 200 with the stored result and creates no new movement; same key with different content gives 409 `cle_idempotence_conflit`. A second test aborts the client request mid-flight (`abort()` on a timer) and replays; it asserts one movement whether or not the first request reached the server before the abort, so it does not prove which of the two happened.
  - 500 rows over multipart HTTP: 500 applied, 500 movements.
- Frontend `test/unit/api-proxy.test.ts`: one test that a 5 MiB + 512 byte multipart body on the import path is passed to `sendProxy` with the boundary-bearing `content-type`, `cle-idempotence`, the unchanged body object and the right target URL. The existing helper gained an optional extra-headers parameter.

### Real round trip through the BFF (done, not committed)
Setup: a throwaway database `t7_roundtrip_<pid>` created with `pg_dump | psql` from the local dev database (not the dev DB itself), `prisma migrate deploy` applied the new migration to it, the built backend (`node dist/src/main.js`, `SUPABASE_URL` unset so the local `MOT_DE_PASSE_DEV` login works) on port 3101, and `nuxt dev --port 3100` with `NUXT_API_BASE_URL=http://localhost:3101`. Login through `/api/auth/login` with the CSRF meta token and the seeded direction account, then `curl -F` multipart with the session cookie to `/api/v1/catalogue/administration/produits/inventaire/import`. All three processes and the database were removed afterwards.

| Case | Result |
| :-- | :-- |
| 500-row CSV (10,611 bytes uploaded), reception | 200, 500 applied, 0 failed, **2.15 s** (one run) |
| Same file, same `Cle-Idempotence` | 200, same `importation_id`, **0.03 s**, movement count unchanged (501 -> 501) |
| 500-row XLSX (8,732 bytes), reception | 200, 500 applied, **1.92 s** (one run) |
| 500 valid rows padded with blank lines to exactly 5 MiB (5,243,297 bytes uploaded) | 200, 500 applied, **3.46 s** (one run) |
| Same, 5 MiB + 1 byte | 413 `File too large` from Multer, nothing written |
| Count mode, 3 targets equal to current stock | 200, 3 `ignore`, movement count delta 0 |
| 17 MB multipart | 413 from the nuxt-security limiter in the BFF |
| No CSRF header | 403 |
| No `Cle-Idempotence` header | 400 from the backend (header reached the BFF-to-backend hop only when sent; the replay case above shows it is forwarded) |

Conclusions: the BFF forwards the multipart body with its boundary intact (the backend parsed it), forwards `Cle-Idempotence` (replay hit the stored result), and neither the 16 MB BFF cap nor the 2 MB raw-write limiter rejects a 5 MiB multipart upload (multipart uses `maxUploadFileRequestInBytes`, 16,000,001).

### 500-row timing
Local only: about 2 s for 500 rows through BFF + backend + local Postgres, 3.5 s for a 5 MiB body. Backend-only HTTP level (e2e spec, 4,524-byte CSV): 2,111 ms; service level earlier: 2,072 ms. Single runs on a laptop, no network latency, no Traefik. The deployed-proxy measurement is **not done**.

### Claim check: "11 failures in `administration.service.spec.ts` plus `src/main.spec.ts` also fail on clean HEAD `edd49d2`"
Verified in a throwaway `git worktree` at `edd49d2` (node_modules symlinked from the backend checkout, so it shares the generated Prisma client built from the current schema; removed afterwards, no stash used).
- HEAD worktree: `Test Suites: 2 failed`, `Tests: 11 failed, 4 passed, 15 total`.
- Working tree, same two files: identical counts, and the sorted lists of 11 failing test names are identical (`diff` empty). All 11 are in `administration.service.spec.ts` (derived brands, atomic category relations, product image URLs).
- `src/main.spec.ts` crashes its Jest worker on both ("Jest worker encountered 4 child process exceptions") with `TypeError: app.set is not a function` at `src/main.ts:37`. **Correction to the earlier walkthrough:** it said `main.spec.ts` passed when run alone in the working tree. I could not reproduce that; it fails alone on both HEAD and the working tree. `src/main.ts` is unmodified.
- The claim holds: all pre-existing, unrelated to the import.

### Gates
- Backend: `test -- src/catalogue/stock-import src/inventaire test/stock-import`: 6 suites, 191 tests passed. `pnpm build`: exit 0. Full suite: `Test Suites: 2 failed, 37 passed, 39 total`, `Tests: 11 failed, 786 passed, 797 total` (the two known pre-existing failing suites only).
- Frontend: `bunx vitest run test/unit/stock-import test/nuxt/stock-import test/nuxt/products-workspace.test.ts test/unit/api-proxy.test.ts --coverage.enabled=false`: 8 files, 101 tests passed. `bun run typecheck` exit 0. `bun run lint`: no errors, the same two existing warnings. `bun run i18n:check` exit 0. `bunx oxfmt --check` on `api-proxy.test.ts` and the touched stock-import, products, locale and page files: all formatted. `git diff --check`: clean.

### Not verified
- A real browser: `$csrfFetch` serialising a `FormData`, the dialog against a live backend, and the EN/FR copy. The round trip used curl multipart; the nuxt test environment fakes `useApiWrite`.
- Anything through the deployed proxy (Vercel / Traefik / production timeouts and body limits).
- Whether the abort test actually aborted before or after the server committed (it is valid either way).
- Production-sized catalogue and concurrent users. The local database had 4,275 active products; the rows used were the first 500 by id.
- No lint exists for the backend (no ESLint installed), so `test/stock-import.e2e.spec.ts` has no lint or format evidence.
- Adjacent, still unfixed: `InventaireService.total()` int4 overflow noted above.

### Manual checklist for you
Deployed proxy (before enabling the limit in production):
1. Sign in to the deployed admin as `direction`. Use a staging dataset or a set of products you can afford to bump by 1; the import writes real stock movements.
2. Build a 500-row CSV `product,quantity,reason` with real product ids or slugs, quantity 1, reason `Test T7`. Include a blank-padded variant of about 5 MiB if you want the worst-case body.
3. Open DevTools, Network tab, Preserve log. Import it in reception mode from the products page and read the `import` request's total time (waiting + content download). Record it for the 500-row file and, optionally, the 5 MiB one.
4. Compare with the platform and Traefik request timeout. If the 500-row time approaches it, stop and decide on the job/poll contract before enabling.
5. Re-submit the same file without reloading the dialog (Retry) or replay the request with the same `Cle-Idempotence` from DevTools "Copy as cURL": the response must carry the same `importation_id` and stock must not move again.
6. Confirm no 413 or 502/504 from the proxy for the 5 MiB case, and 413 for a file just over 5 MiB.

Authenticated scenarios, each in EN and FR (switch locale, repeat):
- Reception: CSV, then XLSX. Totals, per-row outcomes and the product list stock update; open a product's inventory history and see one reception per applied row attributed to you.
- Count with no change: targets equal to current stock -> all rows "unchanged", no new movements in history.
- Count with a change: one correction per changed row with the right before/after.
- Partial failure: a file mixing valid rows, an unknown product, a duplicate product, a bad quantity. Valid rows applied, failures listed with translated reasons; download the error CSV and check it only holds failed rows and opens cleanly in a spreadsheet.
- File-level failures: wrong extension, empty file, missing columns, more than 500 rows, a file over 5 MiB: a no-write error message, no stock change.
- Network drop: start an import, kill the connection (DevTools offline) or let it fail, reopen the dialog, Retry: the same key is reused, no duplicate movements.
- Non-direction account: the import entry point is not offered.
- Dialog cannot be closed while submitting; layout of the products page header is unchanged.
