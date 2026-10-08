# Stock drift detection on import

Slug: `stock-drift-detection`.

## 1. Requirement, restated

A Count file produced by the stock export (`plans/2026-10-01-stock-export.md`, section 3.2) carries `current_stock`, the stock **at export time**, next to `quantity`, the target the operator edits. If stock moves between export and import (two units sold, say), importing the untouched pre-filled `quantity` resets the stock to the old value and silently undoes those movements. The importer must read `current_stock`, compare it with the **live** stock, flag rows whose stock has drifted, and keep those rows from being applied unless the operator explicitly says otherwise.

Files without a `current_stock` column (the plain template, older exports, hand-made files) behave exactly as today.

### Dependency

This plan builds on the export's file format (section 3.2) and on its blank-quantity rule and `raison_ignore` field (section 3.3, task T5). It can ship **after the export, or in the same release**, never before. If it ships with the export, the export's T5 lands first and this plan's B-tasks extend it.

### Decisions (user, fixed)

- Drift detection is separate from the export work, and this is its plan.
- Export access stays direction-only. The import is already direction-only, so this plan adds no access change.

### Assumptions (stated, with the default picked)

- **A1. Drift is checked in Count mode only.** In Reception, `quantity` is a delta: receiving 5 adds 5 whatever happened in between, so a drifted reference cannot cause a lost movement. In Reception mode the column is ignored, not validated, and not hashed.
- **A2. "Live stock" means `coalesce(produit_stocks.quantite, 0)`.** The export uses the same expression (`administration.service.ts:224,235`) and the preview uses `stocks.get(id) ?? 0` (`stock-import.service.ts:136`), so a product without a stock row compares as 0 on both sides.
- **A3. A blank `current_stock` cell means "no reference" for that row.** The row is imported as today, unchecked. A non-blank value that is not an integer from 0 to `QUANTITE_MAX` fails the row (section 3.2). A garbage reference is a damaged file. Treating it as "no reference" would quietly switch the safety off.

## 2. Reuse and verified context

Backend: `/Users/michaelnji/Projects/nvc/NowTech-backend-`, branch `feat/prod-stock-mgt`.

- **Parser** (`src/catalogue/stock-import.parser.ts`):
  - Aliases are one EN and one FR name per column, matched after NFD normalisation, accent stripping and lowercasing (`:64-66,96-101`).
  - Unknown columns are ignored, so `current_stock` is dropped today.
  - `cellule()` trims cells and enforces `CELLULE_MAX` (`:125-131`).
  - `LigneImport` is `{ ligne, produit, quantite, motif }` (`:52-57`).
- **Preview** (`stock-import.service.ts:120-142`):
  - It reads stock once, without a lock.
  - The order is `resoudre`, then `dejaVu`, then `valider`, then `prevoir`.
  - The preview is advisory (`:115-119`, and the backend-owned-import plan amendment).
- **Real run** (`:239-265`):
  - It reads rows from `importations_stock_lignes`, which persist `produit_saisi`, `quantite_saisie` and `motif_saisi` only (`:184-192`).
  - Every request, replays and resumes included, re-uploads and re-parses the file before anything else (`importer`, `:105`).
  - The idempotency hash covers `mode`, `motif` and `[ligne, produit, quantite, motif]` (`:170-172`).
- **Count under lock**: `InventaireService.appliquerComptage` (`src/inventaire/inventaire.service.ts:251-294`).
  - It locks the row with `verrouillerSiPresent`.
  - With no row and a non-zero target, it **initialises the row before locking** (`:261-269`).
  - Zero delta returns `ignore: true, variation: 0` (`:272-278`).
  - `ResultatComptage` is `{ etat, avant, variation, ignore }` (`:87-92`).
- **DB constraint**:
  - `migration.sql:49` requires a `code_erreur` exactly when `statut = 'echec'`.
  - `statut` is CHECK-limited to `applique|ignore|echec` (`:47`).
  - `code_erreur` is `VARCHAR(40)` with no value list, so **a new error code needs no migration; a new `statut` value would.**
- **Flag precedent**: the strict `"true"|"false"` multipart boolean is `enBooleenStrict` (`stock-import.dto.ts:19-20,31-33`).
- **Tests**:
  - The service is covered against a real DB in `test/stock-import.integration.spec.ts` and over HTTP in `test/stock-import.e2e.spec.ts`.
  - The count lock is covered in `src/inventaire/inventaire.comptage.spec.ts`.
  - Concurrency is covered in `test/inventaire-concurrence.spec.ts`.

Frontend (this worktree):

- **Preview** (`app/components/products/StockImportPreview.vue`):
  - Count badges and the `bg-warning/10 text-warning` notice idiom are at `:13-36`.
  - Apply is hidden when `appliquees === 0` (`:44`).
- **Rows** are `StockImportRowsTable.vue` + `StockImportResultRow.vue`:
  - status badge via `STATUS_VARIANT` (`:11,39`);
  - headline (`:13-19`);
  - balance with `ph:arrow-right` (`:45-49`).
- **Result** is `StockImportResult.vue:13-17`. **Badge** has a `warning` variant (`app/components/ui/badge/index.ts:18`), and `ui/switch` exists.
- **Run composable** (`app/composables/useStockImportRun.ts`):
  - `buildBody` (`:17-25`);
  - `reviewed` is the submission that Apply re-sends (`:46,141-145`);
  - a failed preview is re-run (`:148`).
- **Types**:
  - `StockImportSubmission` (`app/types/stock-import.ts:20-24`);
  - `LigneResultatImport` / `ReponseImportStock` / `CodeErreurLigne` (`app/types/api/stock-import.ts`).
- **Copy** lives in `i18n/locales/products/{en,fr}.json` under `products.stockImport`.

## 3. Design

### 3.1 Column

- New alias set `ALIAS_STOCK_FICHIER = ['current_stock', 'stock_actuel']`, which follows the existing one-EN-one-FR scheme. After normalisation it also matches `Current_Stock` and `stock_actuel` with accents. `stock_actuel` is also the FR header that the export plan's Q3 names.
- The column is optional. `LigneImport` gains `stockFichier: string | null`:
  - `null` when the header is absent;
  - otherwise the trimmed cell, which may be `''`.
- When the column is absent, the feature is **inactive**: the result is byte-identical to today, including the hash.

### 3.2 Definition of drift

The check runs for a row only when all of these hold:

- mode is `count`;
- the column is present;
- `quantite` is not blank (the export plan's "not touched" rule runs first, so a blank row stays `ignore`/`quantite_vide` and is never drift-checked);
- the row has passed `dejaVu` and `valider`.

The reference `r` is the `stockFichier` cell:

- `''` means unchecked (A3).
- A cell matching `^\d{1,10}$` with a value ≤ `QUANTITE_MAX` is the reference.
- Anything else fails the row as `echec` + `code_erreur: "stock_reference_invalide"`.

**Drift** means `r !== live` (A2). `live` is read without a lock in the preview, and under the row lock in the real run (3.4).

The check applies whether or not the operator edited `quantity`. An untouched row (`quantity === r`) is the dangerous case. An edited row is still ambiguous, because nobody knows whether the shelf count was taken before or after the sales.

### 3.3 Representation: existing statuses plus response-only fields (no migration)

A new `statut` value would need a migration on the CHECK at `:47`. Instead, drift is expressed with the statuses that already exist:

| Situation | `statut` | `raison_ignore` | `variation` | `stock_avant` | `stock_apres` | `stock_modifie` |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Drift, excluded (the default) | `ignore` | `stock_modifie` | `null` | live | `null` | `true` |
| Drift, included by the operator | outcome as today (`applique`, `ignore`/`aucun_ecart`, or `echec`) | as today | as today | live | as today | `true` |
| No drift, or unchecked | as today | as today | as today | as today | as today | `false` |

All new fields are derived. None is stored:

- `stock_fichier` is the parsed reference, or `null` when unchecked. On a real run it comes from the re-parsed request file, keyed by `ligne`. The hash (3.5) guarantees that this file is the one the import was opened with.
- `stock_modifie` is `stock_fichier !== null && stock_avant !== null && stock_avant !== stock_fichier`.
- `raison_ignore` is extended, and is still derived from stored columns (it refines the export plan's 3.3), in this order:
  1. `statut === 'ignore' && quantite_saisie === ''` gives `quantite_vide`;
  2. `statut === 'ignore' && variation === null` gives `stock_modifie`;
  3. any other `ignore` gives `aucun_ecart`.

  Rows persisted before this change all have `variation: 0` when `ignore` (`:363-364`, `inventaire.service.ts:276`), so they replay as `aucun_ecart`.

### 3.4 Operator choice, and the real run

**Default: drifted rows are excluded.** In Count mode, applying an absolute target over a drifted stock always erases the movements made in between. Including the row has to be a deliberate act, not the result of pressing Apply.

One switch in the preview, "Apply these rows anyway", sends `inclure_stock_modifie=true`. The switch applies to the whole file. Per-row selection would be row editing, which is out of scope. Toggling the switch re-runs the preview with the flag, so the diff on screen is always the exact request that Apply will send.

**The real run re-checks under the row lock (recommended).** If the check stays advisory, a sale landing between preview and Apply is undone silently, which is the exact bug this plan exists to prevent. The preview already admits it can differ from the real run.

Implementation:

- `appliquerComptage` gains an optional `attendu?: number`.
- When `attendu` is set and the locked quantity differs from it (an absent row counts as 0), the method returns `{ stockModifie: true, avant, ... }` **without writing anything**.
- The comparison happens **before** `initialiserSiAbsent` (`:267`). Otherwise a drifted row on a product without a stock row would still leave an initialisation movement behind.
- The import service passes `attendu = r` only when the row is checked and the flag is `false`.

Consequence: rows can turn from "will apply" in the preview into "stock changed, skipped" in the result. The result view makes this visible (3.7). With the flag `true` there is no lock-time check. `stock_modifie` is still computed from the locked `stock_avant`, so the result shows which rows overrode a movement.

### 3.5 Idempotency

The hash input changes **only when the feature is active**. When the mode is `count` and the column is present, or when the flag is `true`, `[stockFichier per line, inclure_stock_modifie]` is appended to the hashed array. Otherwise the input is unchanged.

As a result:

- an import opened before deploy and resumed after it keeps its hash;
- the same key with a different reference or a different flag answers 409 `cle_idempotence_conflit`;
- a resume reuses the same flag.

### 3.6 API contract changes

Request (multipart, same endpoint):

| Field | Rule | New |
| :-- | :-- | :-- |
| `inclure_stock_modifie` | optional, `"true"` \| `"false"` (`enBooleenStrict` + `@IsBoolean`), omitted means `false`; allowed with and without `apercu`; accepted but without effect in `reception` | yes |

File: optional column `current_stock|stock_actuel` (3.1).

Response:

```ts
// stock-import.dto.ts
export type RaisonIgnore = "quantite_vide" | "aucun_ecart" | "stock_modifie" // extends the export plan's T5

// CODES_ERREUR_LIGNE gains:
"stock_reference_invalide"

interface LigneResultatImport {
  // ...existing fields, plus raison_ignore from the export plan
  stock_fichier: number | null   // the file's current_stock when the row was checked
  stock_modifie: boolean         // live (preview) or locked (real run) stock differs from stock_fichier
}

interface ReponseImportStock {
  // ...existing fields
  inclure_stock_modifie: boolean // echo of the effective flag (always false in reception)
  stock_modifiees: number        // rows with stock_modifie === true, whatever their statut
}
```

The counts `appliquees`, `ignorees` and `echouees` are unchanged in meaning, and excluded drift rows count in `ignorees`. Swagger: the route description and `@ApiBody` (`administration.controller.ts:200-245`) document the column, the flag and the lock-time re-check.

### 3.7 UI

**Row** (`StockImportResultRow.vue`):

- When `line.stock_modifie`, the status badge becomes `variant="warning"` with the label `statuses.stockChanged` (or `preview.statuses.stockChanged` in the preview).
- The details cell adds a `text-warning` line with `ph:clock-counter-clockwise` and the text `stockChanged.row`, using `{file}` = `stock_fichier` and `{live}` = `stock_avant`, both through `formatNumber`.
- For an excluded row, the headline is `stockChanged.skipped`.
- For an included row, the badge keeps the warning variant and the normal status label stays visible as the headline. The balance column is unchanged.

**Preview** (`StockImportPreview.vue`):

- When `stock_modifiees > 0`, a `warning` badge shows `preview.changed`.
- Below it is a `bg-warning/10 text-warning` notice (`ph:clock-counter-clockwise`) with `stockChanged.notice`, and a `Switch` + `Label` (`stockChanged.include`) with the hint `stockChanged.includeHint`.
- The switch is shown in Count mode only, and only when `stock_modifiees > 0`. It also stays visible when the flag is on, so the operator can turn it back off.
- When every row is excluded, the existing "Nothing to apply" notice appears and Apply stays hidden. The switch stays available.

**Result** (`StockImportResult.vue`):

- A `warning` badge shows `changed` when `stock_modifiees > 0`.
- When `!inclure_stock_modifie && stock_modifiees > 0`, the notice `stockChanged.resultSkipped` appears.

**States**:

- Toggling the switch reuses the existing `previewing` stage (progress view) and the existing preview-failure view and retry.
- Nothing new is needed for loading, empty or error.

**Copy** (EN / FR), under `products.stockImport`:

| Key | EN | FR |
| :-- | :-- | :-- |
| `preview.changed` | `{count} stock changed since export` | `{count} stock modifié depuis l'export` |
| `changed` | `{count} stock changed since export` | `{count} stock modifié depuis l'export` |
| `statuses.stockChanged` | `Stock changed` | `Stock modifié` |
| `preview.statuses.stockChanged` | `Stock changed` | `Stock modifié` |
| `stockChanged.row` | `Exported at {file}, now {live}` | `Exporté à {file}, maintenant {live}` |
| `stockChanged.skipped` | `Skipped: stock changed since export` | `Ignorée : stock modifié depuis l'export` |
| `stockChanged.notice` | `Stock changed on these rows after the file was exported. They are skipped so the count does not undo those sales or receptions.` | `Le stock de ces lignes a changé après l'export du fichier. Elles sont ignorées pour que le comptage n'annule pas ces ventes ou réceptions.` |
| `stockChanged.include` | `Apply these rows anyway` | `Appliquer quand même ces lignes` |
| `stockChanged.includeHint` | `Their quantity replaces the current stock, cancelling the movements made since export.` | `Leur quantité remplace le stock actuel et annule les mouvements faits depuis l'export.` |
| `stockChanged.resultSkipped` | `Rows whose stock changed since export were skipped. Export again to count them.` | `Les lignes dont le stock a changé depuis l'export ont été ignorées. Exportez à nouveau pour les compter.` |
| `rowCodes.stock_reference_invalide` | `Invalid current_stock value` | `Valeur current_stock invalide` |

## 4. Tasks

Each task runs red then green. Backend runs `pnpm test -- <file>` (Jest); frontend runs `bunx vitest run <file>`.

### Phase A: backend

**T1. Parser reads the optional column.**
Files: `src/catalogue/stock-import.parser.ts`, `src/catalogue/stock-import.parser.spec.ts`.
- What: Add `ALIAS_STOCK_FICHIER` and `stockFichier` to `LigneImport` (3.1). It is not required by `colonnes_manquantes`.
- Done when the specs show:
  - the CSV and XLSX headers `current_stock`, `stock_actuel` and `Stock_Actuel` all bind;
  - an absent column gives `null` on every row;
  - a blank cell gives `''`;
  - a numeric XLSX cell gives `"12"`;
  - an oversized cell is still `cellule_trop_longue`;
  - the files in the existing fixtures parse to the same `produit`/`quantite`/`motif`.

**T2. Count accepts an expected stock under the lock.**
Files: `src/inventaire/inventaire.service.ts`, `src/inventaire/inventaire.comptage.spec.ts`, `test/inventaire-concurrence.spec.ts`.
- What: Add `attendu?: number` to `ComptageStock` and `stockModifie: boolean` to `ResultatComptage`. Compare the expected stock with the locked value, or with 0 for an absent row, **before** initialising; on a mismatch, return without writing (3.4). Callers that do not pass `attendu` see no change.
- Done when the specs cover:
  - a mismatch writes no movement and no initialisation row, and returns the locked `avant`;
  - a match behaves exactly like today's count;
  - an absent row with `attendu: 0` counts normally;
  - the concurrency spec shows a movement committed between the read and the lock flips the result to `stockModifie`.

**T3. Request flag, preview drift and response fields.**
Files: `src/catalogue/stock-import.dto.ts`, `src/catalogue/stock-import.service.ts`, `src/catalogue/administration.controller.ts` (Swagger), `src/catalogue/stock-import.controller.spec.ts`, `test/stock-import.integration.spec.ts`.
- What:
  - Add the `inclure_stock_modifie` DTO field, `stock_reference_invalide`, the `RaisonIgnore` value, and the row and response fields (3.6).
  - In `apercu`: parse the reference after `valider` (3.2), then mark excluded drift rows (3.3) or flag included ones.
  - `resultat()`/`assembler()` derive `stock_fichier`, `stock_modifie`, `raison_ignore` and `stock_modifiees`.
  - Reception mode skips everything here.
- Done when the specs cover:
  - the controller: `"true"`/`"false"`/absent are accepted and `"yes"` or a repeated field is a 400;
  - a preview in count mode with the column: a drifted untouched row is `ignore`/`stock_modifie`, `variation: null`, live in `stock_avant`; a drifted edited row is excluded too; a non-drifted row is unchanged;
  - with the flag, the drifted row is `applique` with `stock_modifie: true`;
  - a blank-quantity row is `quantite_vide` and never flagged;
  - a duplicate stays `produit_en_double`;
  - a reference of `-1`, `1.5`, `abc` or anything above `QUANTITE_MAX` is `echec`/`stock_reference_invalide`, and a blank reference is unchecked;
  - Reception with a garbage reference behaves exactly as without the column;
  - a file without the column produces a response equal to today's plus `stock_fichier: null`, `stock_modifie: false`, `stock_modifiees: 0`.

**T4. Real run re-checks under the lock, plus hash and replay.**
Files: `src/catalogue/stock-import.service.ts`, `test/stock-import.integration.spec.ts`.
- What:
  - `executer` receives the parsed references keyed by `ligne`, and passes `attendu` to `deplacer` and `appliquerComptage` when the row is checked and the flag is off.
  - A `stockModifie` result is persisted as `ignore` with `variation: null`, `stock_avant` = locked value, and `code_erreur: null`, inside the row's transaction.
  - The hash extension follows 3.5. `reponse()` derives the new fields from stored columns plus the re-parsed references.
- Done when the specs, on the real DB, cover:
  - a movement inserted **between preview and apply** makes that row `stock_modifie` in the result with no correction movement;
  - with the flag on, the same row applies;
  - the persisted drift row satisfies the CHECK constraint;
  - an interrupted run resumed with the same key gives the same outcome;
  - the same key with a changed reference, or a flipped flag, answers 409;
  - an import hashed **without** the column keeps the exact same hash (a fixture hash computed by today's code);
  - a completed import replayed with the same key returns `raison_ignore: stock_modifie` for the drift rows;
  - movement history shows no entry for excluded rows.

**T5. Round trip with the export.**
Files: `test/stock-export.e2e.spec.ts` (created by the export plan's T6).
- What: Export a Count file, record a sale-like movement on one product, then post the untouched bytes with `apercu=true`, then for real.
- Done when:
  - only that row is `stock_modifie` in both the preview and the result, while every other row is `aucun_ecart` or `quantite_vide`, and `appliquees: 0`;
  - the stock after the run still reflects the sale;
  - a Reception export with the same movement shows no drift.

### Phase B: frontend

**T6. Types, submission flag and re-preview.**
Files: `app/types/api/stock-import.ts`, `app/types/stock-import.ts`, `app/composables/useStockImportRun.ts`, `test/nuxt/stock-import-run.test.ts`, `test/nuxt/stock-import-fixture.ts`.
- What:
  - Mirror 3.6, with backend file:line citations.
  - `StockImportSubmission.includeChanged: boolean`. `buildBody` appends `inclure_stock_modifie=true` only when it is true.
  - New `setIncludeChanged(value)`: allowed only in the `preview` state; it updates `reviewed` and re-runs `runPreview`.
  - `review()` starts with the flag at `false`.
- Done when the specs cover:
  - toggling sends one new preview POST carrying the field;
  - Apply then sends the same field with a new key, and a retry reuses that key and that flag;
  - no field is sent by default;
  - toggling is ignored while previewing or submitting;
  - a failed re-preview lands in the existing preview-failure stage and its retry keeps the flag.

**T7. Preview, row and result UI with copy.**
Files: `app/components/products/StockImportResultRow.vue`, `app/components/products/StockImportPreview.vue`, `app/components/products/StockImportResult.vue`, `app/components/products/StockImportDialog.vue` (wires `@include-changed` to the composable), `i18n/locales/products/en.json`, `i18n/locales/products/fr.json`, `test/nuxt/stock-import-views.test.ts`.
- What: Section 3.7. The preview emits `includeChanged: [boolean]` and the dialog forwards it. No hard-coded strings, Phosphor icons only, `warning`/`muted` semantic tokens.
- Done when the specs cover:
  - an excluded drift row shows the warning status label, the "Exported at X, now Y" line and the skipped headline;
  - an included drift row keeps the warning indication;
  - non-drift rows render as before;
  - the preview badge, notice and switch appear only for `count` with `stock_modifiees > 0`, and switching emits the event;
  - with every row excluded, Apply is hidden and the switch is still available;
  - the result shows the badge and the skipped notice;
  - a `stock_reference_invalide` row shows its translated code and is included in the error CSV;
  - `bun run i18n:check` passes.

### Phase C: verification

**T8. Cross-repo and manual checks.**
- Backend: the T1-T5 suites, then `pnpm build`.
- Frontend: `bunx vitest run`, `bun run typecheck`, `bun run lint`, `bun run i18n:check`, `oxfmt --check` on touched files, `bun run fallow`, `git diff --check`.
- Manual, authenticated, EN and FR:
  - export a Count file, sell or adjust one product, and import untouched: the preview flags exactly that row and Apply is hidden;
  - turn the switch on: one change applies;
  - repeat with an adjustment made **after** the preview: the result shows the row skipped;
  - the plain template still imports.
- Done when all of the above pass and the results are in `walkthroughs/YYYY-MM-DD-stock-drift-detection.md`.

## 5. Tests worth having, by axis

- **Functionality**: drift is detected and excluded in the preview and in the real run; the switch includes drifted rows; Reception is unaffected; files without the column are unchanged.
- **Robustness**:
  - invalid and blank references;
  - a product without a stock row;
  - a movement between preview and apply;
  - resume and replay;
  - hash stability for files without the column;
  - blank-quantity and duplicate precedence;
  - every row excluded.
- **Security**:
  - the reference is untrusted input, so it is bounded-parsed (no `Number()` overflow, ≤ `CELLULE_MAX`);
  - it is covered by the idempotency hash, so a resumed request cannot swap references (409);
  - it can only *suppress* a write, never cause one.

  A forged reference equal to the live stock achieves no more than the switch already allows, and only a direction user can do either. No new access path.
- **Not tested**: badge class names, Swagger text, or the switch component itself.

## 6. Risks and open questions

| # | Risk / question | Options | Recommendation / earliest check |
| :-- | :-- | :-- | :-- |
| R1 | Including drifted rows is file-wide, so one legitimate recount forces the operator to include every drifted row | Per-row checkboxes; file-wide switch; re-export | **File-wide switch.** Per-row choice is row editing (out of scope). The notice tells the operator to re-export. Revisit if operators ask. |
| R2 | Lock-time re-check makes the result differ from the preview | Advisory only; lock re-check | **Lock re-check** (3.4). The result shows each skipped row. The difference only happens when stock really moved. T4 proves it. |
| R3 | Hash change breaks in-flight imports across the deploy | Always extend the hash; extend it only when the feature is active | **Only when active** (3.5). T4 pins the legacy hash. |
| R4 | High-traffic products drift constantly, so large Count files keep losing rows | — | Expected and correct. The answer is to export closer to import time. The export dialog's staleness note already says so. Measure in T8 with real sales volume. |
| R5 | Editing `current_stock` by hand defeats the check | — | Accepted. It is the operator's own file, and the switch does the same thing openly. |
| Q1 | Default for drifted rows | Excluded by default (recommended); flagged but applied by default | **Excluded.** In Count mode, applying always erases the in-between movements, so it must be opt-in. Change it only if the user prefers otherwise. |
| Q2 | Should Reception also flag drift (information only)? | No (A1); show an informational flag | **No.** A delta cannot undo a movement, so a flag would be noise. |

## 7. Out of scope

- Any change to the export (columns, dialog, access). The export's staleness note stays.
- Rebasing a count onto the live stock (`target + (live - reference)`). It is rejected because a count's timing relative to the sales is unknown.
- Per-row include/exclude, and editing rows in the modal.
- Drift checks in Reception mode.
- Adding `current_stock` to the import template or to the error CSV. A re-imported error file is simply unchecked.
- Persisting the reference or the flag in the database (no migration).
