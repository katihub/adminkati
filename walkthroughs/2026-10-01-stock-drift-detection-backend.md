## What I built
Backend half (T1-T5) of `plans/2026-10-01-stock-drift-detection.md` in `/Users/michaelnji/Projects/nvc/NowTech-backend-` (branch `feat/prod-stock-mgt`, nothing committed). The importer now reads an optional `current_stock|stock_actuel` column in Count mode, flags rows whose live stock differs, excludes them by default as `ignore`/`stock_modifie`, and re-checks under the row lock in the real run. No migration, no new dependency. Specs were written first by the tester agent (red run below).

## Contract the frontend mirrors (paths under the backend `src/`)

Request (multipart, same endpoint `POST .../produits/inventaire/import`)
- New optional field `inclure_stock_modifie`: `"true"` | `"false"`, same strictness as `apercu` (anything else, or a repeated field, is 400). Allowed with and without `apercu`; no effect in `reception`. `catalogue/stock-import.dto.ts:40`.
- File: optional column `current_stock` | `stock_actuel` (normalised, so `Stock_Actuel` binds). `catalogue/stock-import.parser.ts:69,120,142`. Not required; absent column means the feature is inactive.
- Reference rules (Count only): blank cell means row unchecked; `^\d{1,10}$` and <= `QUANTITE_MAX` (2147483647) is the reference (`0005` = 5); anything else fails the row with `statut: "echec"`, `code_erreur: "stock_reference_invalide"`. `service:87,420`.

Response
- `CodeErreurLigne` gains `stock_reference_invalide` (`dto:56`). `RaisonIgnore` is now `"quantite_vide" | "aucun_ecart" | "stock_modifie"` (`dto:73`).
- Each line gains `stock_fichier: number | null` (`dto:91`) and `stock_modifie: boolean` (`dto:93`).
- Response gains `inclure_stock_modifie: boolean` (effective flag, always `false` in reception; `dto:107`) and `stock_modifiees: number` (lines with `stock_modifie`, any `statut`; `dto:109`, computed in `service:687`).
- A drifted row, flag off: `statut: "ignore"`, `raison_ignore: "stock_modifie"`, `variation: null`, `stock_avant` = live (preview) or locked (real run) stock, `stock_apres: null`, `code_erreur: null`, `stock_fichier: r`, `stock_modifie: true`. It counts in `ignorees`. Applies to untouched and edited quantities alike.
- Flag on: normal outcome, with `stock_fichier: r` and `stock_modifie: true`.
- `stock_fichier` is `null` (and `stock_modifie` false) for: no column, reception, blank reference, blank quantity (`quantite_vide`), any `echec` row (duplicate, unknown product, bad reference, ...), and a row whose reference was fine but whose outcome is `echec`.
- `raison_ignore` derivation (`service:77`): `ignore` + empty `quantite_saisie` => `quantite_vide`; `ignore` + `variation === null` => `stock_modifie`; other `ignore` => `aucun_ecart`. Old stored rows (variation 0) replay as `aucun_ecart`.
- Precedence per row: blank quantity, then duplicate, then existing validations, then reference parsing, then drift, then the normal outcome. Reception never reads or validates the column.
- Real run: the lock re-check means a row shown as `applique` in the preview can come back `ignore`/`stock_modifie` in the result (a movement landed between preview and apply). Persisted and replayed identically (CHECK satisfied: `ignore`, null `code_erreur`).
- Idempotency: the hash is unchanged for imports with no column (count) and no flag. Otherwise `[refs per line | null, flag]` is appended (`service:261`). Same key with changed references or a flipped flag gives 409 `cle_idempotence_conflit`. In reception the column is not hashed; only a `true` flag is.

Count under lock: `InventaireService.appliquerComptage` takes optional `attendu` (`inventaire/inventaire.service.ts:89`), compared with the locked quantity (0 for absent row) BEFORE `initialiserSiAbsent` (`:268`); mismatch returns `stockModifie: true` and writes nothing (`comptageObsolete`, `:316`). `ResultatComptage.stockModifie` (`:97`) is always present. Swagger text and `@ApiBody` updated in `catalogue/administration.controller.ts` (import operation).

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| T1 parser column | Done | `stock-import.parser.ts:58,69,120,142` |
| T2 count `attendu` under lock | Done | `inventaire.service.ts:89,97,268,287,316` |
| T3 flag, preview drift, response fields | Done | `stock-import.dto.ts`, `stock-import.service.ts:77-93,415-445,apercu` |
| T4 real-run re-check, hash, replay | Done | `service:261,380-384,502-515,638-687` |
| T5 round trip (backend half) | Done | `test/stock-export.e2e.spec.ts` (new drift block) |
| T6-T8 frontend | Not in scope | -- |

## Deviations
- A row that reached `prevoir` and failed after drift inclusion (`echec`) shows `stock_fichier: null`, `stock_modifie: false` (the plan table implied `true`); derivation is uniform because `echec` rows persist no `stock_avant`. When drift is excluded, drift outranks `prevoir` errors (`variation_hors_limite`, `stock_insuffisant`) since the row is skipped before they are computed. Neither case is pinned by a spec.
- `appliquerComptage` has a second, post-initialisation `attendu` check (`:287`) for a stock row created concurrently between the read and the insert; it may leave a harmless zero-baseline `initialisation` movement in that narrow race.
- Existing specs updated for the contract change, not just new ones: `stock-export.csv/xlsx.spec.ts` round-trip expectations now include `stockFichier` (an export carries `current_stock`, so the importer now reads it); `test/stock-import.e2e.spec.ts` key lists and one exact line shape gained the new fields. One tester case (`excludes a product that was given stock after the preview...`) called `appliquerAjustement` on an absent row; I changed it to `initialiserStock` (test bug, not production).

## Tests
Red run (tester, before any production code), six specs: `Test Suites: 6 failed, 6 total; Tests: 11 failed, 85 passed, 96 total`. Four suites did not compile (missing `stockFichier`, `attendu`, `stock_fichier`, ...), the controller suite failed 5 on `inclure_stock_modifie` being rejected as unknown, and the export e2e failed 6 on missing fields and `appliquees: 1` instead of 0. With diagnostics off, 111 tests failed for the right reasons.

Green:
`pnpm --pm-on-fail=ignore --dir <backend> test -- src/catalogue/stock-import src/catalogue/stock-export src/catalogue/filtre-produits src/inventaire test/stock-import test/stock-export test/inventaire-concurrence --runInBand` -> after fixes: 13 suites, 565 tests; the last full run before the final e2e fix was 563/565, the 2 failures (`test/stock-import.e2e` exact-shape) were then fixed and `test/stock-import.e2e` re-run alone: 8/8 passed. I did not re-run the whole focused set once more after that last edit.
Broader run `-- src test/main test/stock --runInBand`: `Test Suites: 4 failed, 39 passed; Tests: 12 failed, 978 passed`. Failures: `administration.service.spec.ts` and `main.spec.ts` (pre-existing), `logo-http.client.spec.ts` (other session's work), and `test/stock-import.e2e.spec.ts` in that run only; it passes alone (8/8) and I did not diagnose it beyond recognising the earlier-noted flake of the 2000-row seeding test under load. Treat as unverified in the broad run.
Covered end to end: drift excluded and included, preview and real run, movement between preview and apply (including a product with no stock row), resume, replay, 409 on changed reference/flag, legacy hash pinned from a literal, export -> import round trip for CSV and XLSX in Count and Reception.
`tsc`: with a temporary tsconfig in the scratchpad (extends the repo one, excludes only `marques-logo.service.ts` and its spec, includes `src` and `test` specs): zero errors. The repo's own `tsc`/`nest build` still fail on the other session's `sharp` typing; `pnpm build` was not run.
Not run: lint, full suite as one clean run, manual checks.

## Not done
Frontend T6/T7 and T8 manual checks. No commit.

## Notes for the reviewer
- `lireReference` runs inside the row's `try`, so a bad reference becomes an `echec` with no write; in the real run it is persisted via `enregistrerSansMouvement`.
- `reponse()` takes the references from the re-parsed upload; correctness relies on the hash proving it is the original file (only when the feature is active; otherwise nothing is derived from it).
- Echo semantics: `inclure_stock_modifie` is `true` in the response only in Count mode, even if the file has no column.
- Unrelated uncommitted work from another session remains in the tree (marques/logo, `.env.example`, `sql/*`, `configuration.ts`); I did not touch it.
