## What I built
A server-side preview (dry run) on the existing stock import endpoint in `/Users/michaelnji/Projects/nvc/NowTech-backend-` (branch `feat/prod-stock-mgt`, nothing committed). A new optional multipart field `apercu=true` parses and validates the file exactly like a real run, then computes each row's outcome from the current stock and writes nothing. Only the frontend plan and this walkthrough were touched in the frontend repo.

## Plan coverage
Source: the "Plan amendment: backend preview" section appended to `plans/2026-10-01-backend-owned-stock-import.md`, from the user's request.

| Plan item | Status | Where (backend repo) |
| :-- | :-- | :-- |
| `apercu` field, strict boolean-ish, unknown fields still rejected | Done | `src/catalogue/stock-import.dto.ts:30-33` |
| No `Cle-Idempotence` needed in preview (ignored if sent, even if invalid) | Done | `src/catalogue/administration.controller.ts:265`, `:271` |
| Preview computed from current stock, same bounds and codes | Done | `src/catalogue/stock-import.service.ts:120` (`apercu`), `:348` (`prevoir`) |
| Writes nothing | Done | `apercu` only calls `chargerCatalogue` and `produitStock.findMany`; proved by the integration `preview` describe (`test/stock-import.integration.spec.ts:719`) |
| Shared validation between preview and real run | Done | `valider` `:328` (used by both), `dejaVu`/`doublon` `:282`, `assembler` `:554` |
| `apercu: true/false` in the response, `ReponseImportStock` | Done | `stock-import.dto.ts:74-77` |
| Direction-only, 5 MiB / 500 rows and file-level 400s apply | Done | unchanged route and parser; the preview branch runs after `lire` (`stock-import.service.ts:106`) |
| Swagger / DTO docs | Done | `administration.controller.ts:218-221` (description), `:238` (`apercu` body property), `:248-252` (header now optional) |
| Frontend plan amendment | Done | `plans/2026-10-01-backend-owned-stock-import.md`, last section |

## Deviations
- **`importation_id` is `string | null`**, `null` in a preview, because nothing is persisted and no id exists. The brief said "same shape plus `apercu`"; this is the one change to an existing field. The frontend must not assume a string.
- **Tester ran after the implementation was in the working tree, so there was no red phase it observed.** I started the implementation in parallel while the tester wrote specs, and it reported 156/156 passing. To recover evidence, I temporarily disabled the preview branch (`if (false && dto.apercu)`) and re-ran: `Test Suites: 2 failed, 2 passed, 4 total`, `Tests: 9 failed, 147 passed, 156 total`. I then restored the line. This shows the new tests can fail, but it is not a true red-then-green.
- **The "apercu" Swagger property is a string enum `['true','false']`** (multipart carries strings), not a boolean.
- **Tester-side fixes** in existing specs: `'apercu'` added to the exact key list `CLES_REPONSE` in `test/stock-import.e2e.spec.ts`, and two `importation_id` accesses in `test/stock-import.integration.spec.ts` now use `!`.
- The service throws 400 if a non-preview call arrives without `cle` (defensive; the controller already guarantees one).

## Tests
Commands use `pnpm --config.pm-on-fail=ignore --dir /Users/michaelnji/Projects/nvc/NowTech-backend- ...`.
- `test src/catalogue/stock-import test/stock-import src/inventaire`: `Test Suites: 6 passed, 6 total`, `Tests: 222 passed, 222 total`. The integration and e2e suites ran against a disposable `test_inventaire_*` database, not skipped (no "skipped" output). The dev DB was not modified.
- `tsc --noEmit`: exit 0.
- `pnpm build` (`nest build`): exit 0.
- New coverage:
  - Controller (`src/catalogue/stock-import.controller.spec.ts:215`): `true`/`false` arrive as booleans; `yes`, `1`, empty, `TRUE`, `0`, `oui` and a repeated field are 400 with no service call; extra field still 400; no header or non-UUID header is fine in preview and still 400 without it; Swagger documents `apercu`.
  - Integration (`test/stock-import.integration.spec.ts:719`): before/after snapshot of `produit_stocks`, movements, `importation_stock`, `importation_stock_ligne` and `inventory_snapshots` identical after reception and count previews, including products with no stock row; every row code; parity of a preview with the real run on unchanged stock; a reception landing between two previews changes the next one; same key as a finished import neither replays nor conflicts; real runs and replays report `apercu:false`.
  - E2E over real multipart: preview with no header returns 200, `apercu:true`, `importation_id:null`, no movements.
- Not run: the full backend suite (the earlier walkthrough records 2 known pre-existing failing suites, `administration.service.spec.ts` and `src/main.spec.ts`; I did not re-run them), any lint (none exists in the backend), the frontend suites, and the deployed proxy.

## Not done
- No frontend changes (dialog, confirm step, types, BFF test); out of scope.
- Preview latency at 500 rows was not measured. It does a catalogue query and one stock query with no per-row writes, so it should be well under the real run, but that is not measured.

## Notes for the reviewer
- **Advisory by design.** The preview reads stock without a lock. A real run recomputes the count delta under the row lock (`inventaire.service.ts:251`), so it can differ if stock moved in between. The frontend confirm step should say so and show the real run's result afterwards.
- **Duplicate bounds logic.** `prevoir` (`stock-import.service.ts:348`) re-states the bounds that `InventaireService.appliquerComptage` and `deplacer` enforce (`VARIATION_MAX`, `QUANTITE_MAX`, non-negative result), because those functions write inside a transaction and cannot be reused read-only. The parity test guards against drift; it is the one place where the "single function" ask is only partly met. Please judge whether to extract a pure bounds function in `InventaireService`.
- `stock_insuffisant` in `prevoir` is unreachable today (reception adds, a count target is non-negative) and has no test.
- A preview with a high-numbered `Cle-Idempotence` of any value is ignored, including an invalid one.

## Contract for the frontend (mirror this)
Endpoint, unchanged: `POST /v1/catalogue/administration/produits/inventaire/import` (`administration.controller.ts:255`, handler `importerStock` at `:258-274`). Direction only.

Request additions:
- Multipart field `apercu`: `"true"` or `"false"` only (`stock-import.dto.ts:30-33`). Omitted is `false`. Any other value, or the field repeated, is a 400 with the class-validator message array and no `code_erreur`.
- `Cle-Idempotence`: required (UUID) when `apercu` is not `"true"`; ignored in a preview, so do not send it (`administration.controller.ts:265`).
- `fichier`, `mode`, `motif` as before.

Response, HTTP 200 (`stock-import.dto.ts:73-86`):
```ts
type ReponseImportStock = {
  importation_id: string | null // null in a preview
  apercu: boolean               // true for a preview, false for every real run and replay
  mode: "reception" | "count"
  total_lignes: number
  appliquees: number            // in a preview: rows that WOULD apply
  ignorees: number
  echouees: number
  lignes: LigneResultatImport[] // unchanged shape
}
```
In a preview `statut: "applique"` means "would apply", `stock_avant` is the current stock, `stock_apres` is `avant + variation`, and in count mode a zero delta is `ignore` with `variation: 0`. Row error codes are the same set as a real run, including `variation_hors_limite`, `stock_trop_eleve` and `produit_en_double`. File-level 400s (`code_erreur` from `CodeErreurFichier`) and 413 behave as for a real run; the 409 codes `cle_idempotence_conflit` and `importation_en_cours` cannot occur in a preview.

Suggested flow: send `apercu=true`, render the diff, and on explicit confirm send the real request with a fresh `Cle-Idempotence` (reuse it on retry).
