# Review — Product inventory and descriptions (admin `29ddac1..1670cf2`, backend `fc21e54..2724999`)

## Verdict
**Ship after fixes.** The ledger, migration, guarded reservation, release-once mechanism and the admin UI are solid and well tested. But the admin's own "Confirm" button does not go through the reserving path (MAJOR 1), so in normal use orders are confirmed without any stock reservation. Several rollout and gap items (MEDIUM 2-7) also need a decision before cutover.

- MAJOR: 1 · MEDIUM: 6 · MINOR: 5 · INT: 6
- Tests I ran:
  - Admin: `env -u <leaked vars> bunx vitest run --coverage.enabled=false` → 173 files, 1247 tests, all passed. `bun run lint` and `bun run i18n:check` exit clean.
  - Backend: `pnpm test -- src/inventaire src/commandes src/catalogue/administration.inventaire src/catalogue/catalogue.service.stock src/catalogue/administration.propositions src/catalogue/administration.delai test/inventaire-concurrence test/importer-stock-initial` → 12 suites, 347 tests, all passed. None were skipped, so the database-backed suites ran, on throwaway databases only.
  - A bare backend `pnpm test` dies in the known `main.spec` crash (`app.set is not a function`) and prints no summary. The known baseline failures are unchanged.
  - I did not run `typecheck`, `build`, `fallow`, or the import script. I did not run the app or a browser.

## Plan fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| Durable `produit_stocks` + append-only `mouvements_stock`, no FK to `nowtech.produits` | DONE | `prisma/migrations/20260930100000_inventaire_produits/migration.sql:16-98` |
| DB invariants (>=0, statut iff quantite>0, non-zero variation, unique self-FK release) | DONE | migration `:23-26, 47-51, 64, 69, 90` |
| Extra CHECKs (before/after arithmetic, sign per type, order refs, motif) | EXTRA, justified | `:48, 52-65`. I found no legitimate flow they block. A zero-variation correction is refused by the service anyway. Status journal entries go to `journal`, not the ledger. |
| Append-only grants | DONE | `:95-98` |
| `InventaireService` primitives (init, adjust, zero-status, reserve asc-order guarded, release once) | DONE | `src/inventaire/inventaire.service.ts:127-322` |
| Snapshot from durable stock, after successful tx | DONE | `:88-131, 325-331`; `confirmer` `:332` |
| Catalogue projection, filter, `fiche_technique`, embedded `inventaire`, derived `en_stock` | DONE | `administration.service.ts:198-290` |
| Role split (direction writes, direction+comptoir reads), actor from token | DONE | `administration.controller.ts:166-203`; `acteurStock` `:534-541`. No body-supplied actor. DTOs are `whitelist` + `forbidNonWhitelisted` (`main.ts:135`). |
| Remove `PATCH …/stock` | DONE | controller diff |
| Public `statutStock`, no quantity, `verifier` reasons | DONE | `catalogue.service.ts:214, 340-352` |
| `confirmer` reserves in-tx; `poser` releases on `confirmee→soumise` / `→annulee` | PARTIAL | `commandes.service.ts:289-305, 620-632`. **`poser` never reserves. See MAJOR 1.** |
| `effetStock` matrix guarding against transitions bypassing release | PARTIAL | `machine-etats.ts:82-98`. It classifies `reservation` but nothing enforces it in `poser`. |
| Concurrency spec on real DB | DONE (deviation acknowledged: written by implementer) | `test/inventaire-concurrence.spec.ts`, passes |
| Admin types, schemas (create/update split), composable, query key | DONE | `app/types/api/inventaire.ts`, `app/schemas/produit.ts:88-105`, `app/composables/useProductInventory.ts` |
| `InventoryPanel` / dialog / long description / initial stock / DetailForm rewiring | DONE | `app/components/products/*`. `isLocalProduct`, `en_stock` payload and `LocalInventoryPanel` are gone. |
| Status badges, Restocking filter, semantic tokens | DONE | `app/utils/product-status.ts:20-25` |
| i18n fr/en parity | DONE | `i18n:check` clean |
| Opening-stock script and runbook | DONE, with issues | MEDIUM 4, 6; MINOR 7 |
| Storefront release | MISSING, acknowledged (O1) | owner unknown |
| Proposals ignore stock fields | DEVIATED, explained, questionable | MEDIUM 3 |
| Catalogue `verifier()` kept pre-transaction | DEVIATED, explained, sound | The guarded UPDATE is the real gate. A lost race gives the same 409 shape (`reserverLignes`). No wrong-error case, since a stale precheck can only over-refuse. |
| Reserve without `SELECT … FOR UPDATE` | DEVIATED, sound | The guarded UPDATE locks the row itself. |
| Release on every `→annulee`, incl. `soumise→annulee` | DEVIATED, sound | Safe no-op, and the concurrency spec covers it. |
| Client caller recorded as actor `systeme` | DEVIATED, explained | MINOR 10 |

**Walkthrough accuracy.** Mostly accurate. Points where the code says something different or more:
- Phase 3 says `effetStock` "classifies every transition as reservation, release or none". True, but only `liberation` is acted on in `poser`. The walkthrough never says the generic `avancer` route can still perform `soumise→confirmee`, and the `effetStock` docstring implies bypass protection.
- Phase 6 calls `operations-page.test.ts` flaky or env-sensitive. With the env unset it passed for me.
- The runbook's Step 3 smoke check 1 expects `quantiteDisponible` on the public product response. The code never returns it (MINOR 7).
- Everything else I checked matches the code: the test counts, the 6-failure baseline explanation, no `server/` diff, and the removal of `en_stock` from write payloads.

## Findings

### MAJOR

**1. Confirming an order from the admin UI (`/avancer` with `vers: confirmee`) reserves no stock.**
- Where: `NowTech-backend-/src/commandes/commandes.service.ts:472-549` (`avancer`) and `:579-640` (`poser`). Admin call site: `app/components/orders/TransitionDialog.vue:74-85`, with the target list from `app/utils/order-transitions.ts:45`.
- Axis: Logic/correctness, concurrency (focus 1).
- Problem:
  - `avancer` accepts any transition in `TRANSITIONS`, and `soumise→confirmee` is in it. `DROITS[confirmee]` includes `comptoir`, and the route has no `@Roles`.
  - `poser` only acts when `effetStock(de, vers) === 'liberation'`. The `'reservation'` case is never handled there.
  - The admin app's Confirm button is the transition dialog, which posts `avancer`. `useOrderMutations().confirm` (`/confirmer`) is defined but no component calls it (grep).
- Failure:
  - A comptoir user confirms a `soumise` order for the last unit through the UI. The order goes to `confirmee`, with no `commande_confirmee` movement, no decrement and no snapshot.
  - A second customer order for the same unit still passes `verifier`, so the same unit is sold twice.
  - Later cancellation calls `libererCommande`, which finds nothing and does nothing. That part is safe, but the oversell has already happened.
  - This path also skips the price-freeze and price-drift logic in `confirmer`. That part is pre-existing, but it shows the route was never a safe confirmation path.
  - The concurrency spec only drives `confirmer()`, so it cannot see this.
- Fix (either):
  - In `avancer`, reject `vers === confirmee` when `de === soumise` and route it to `confirmer` (or a 409 saying so).
  - Or make `poser` perform the reservation when `effetStock === 'reservation'`, and add a spec asserting that every path into `confirmee` writes a `commande_confirmee` movement.
  - Also point the admin `TransitionDialog` at `/confirmer` for that transition, so price freeze and stock go together.
- Refutation attempted: I looked for a guard on `confirmee` in `avancer`, the DTO (`vers` is a plain `IsEnum(StatutCommande)`) and the controller. There is none, and the admin UI lists `confirmee` under `soumise`.

### MEDIUM

**2. A product with no stock row is a dead end, and the UI offers controls that answer 404.**
- Where: `inventaire.service.ts:341` (`verrouiller` → `NotFoundException`); `administration.service.ts:1040-1076` (creation proposals insert no stock row); `restaurerProduit`; `InventoryPanel.vue:22`; `InventorySummary.vue:34-41`.
- Axis: Logic/UX, plan requirement ("every sellable product has exactly one stock state"). Recorded in the walkthrough as a known gap. I disagree that it is only a gap.
- Failure:
  - Every product created by an accepted creation proposal, every newly ingested product after cutover, and every withdrawn product excluded by the import (`importer-stock-initial.mjs:245-246`) has no row.
  - It reads `rupture`, is unorderable, and the direction user sees an enabled "Adjust" button. Saving returns "Aucun stock pour le produit N." Restocking toggles fail the same way.
  - The only way to fix it is re-running the CLI import on the production host, which the runbook lists as unknown (O4).
- Fix: on `reception`/`correction` (or a distinct "set opening stock" action) for a product that exists in `nowtech.produits`, lazily call `initialiserStock` inside the same tx. At minimum, hide the controls and explain "no stock initialised" when `inventaire.modifie_le === null`.

**3. The arbitrage pipeline still emits stock diffs that can no longer be applied.**
- Where: `scripts/arbitrer-catalogue.mjs:80-81` still lists `en_stock` and `quantite_stock` in `CHAMPS`; `administration.service.ts:1080-1086`.
- Axis: Logic, plan deviation.
- Failure:
  - Any WooCommerce stock change creates a `modification` proposal whose only fields are stock. Accepting it returns 400 "aucun champ applicable", so the review queue fills with unacceptable items.
  - A mixed proposal is accepted and reported as applied, but the stock part is silently dropped.
  - The deviation is recorded in the walkthrough, but the producer side was not adjusted.
- Fix: drop the two fields from `CHAMPS`, or auto-decline stock-only proposals with an explanatory motif.

**4. The runbook does not net in-flight confirmed orders and leaves a window on the old backend.**
- Where: `reports/2026-09-30-assessment-product-inventory-cutover.md`, Step 0 item 7 and Steps 2-3.
- Axis: Rollout safety (focus 9).
- Failure:
  - Orders already `confirmee` / `en_preparation` at cutover never had a reservation, and their units are still physically counted. The new ledger treats those units as free, so they can be sold again.
  - Between the count (T0), the import (T1) and the backend switch (T2), the old backend keeps confirming orders against the boolean. Those confirmations are never reflected in the ledger.
- Fix: add a pre-flight step to freeze or drain confirmations. Deduct open confirmed orders' lines from the count, or apply a signed `correction` per product right after the import. Record both in the reconciliation.

**5. Adjusting stock or toggling Restocking wipes the unsaved product form.**
- Where: `app/components/products/DetailForm.vue:242-245`, `app/composables/useProductInventory.ts:25-32, 46-56`.
- Axis: UI/UX, draft preservation (focus 6). Code reading only, no browser run.
- Problem:
  - The mutations invalidate `products.all`, which refetches the product detail.
  - `product` comes from that query (`app/pages/products.vue:127-136, 227`). The changed quantity gives new data, so the shallow `watch(product)` fires `applyProduct(next)` and sets `activeTab = "overview"`.
- Failure: a direction user types a long description or a new price, then records a stock reception in the panel below. The dialog closes and every unsaved field resets. The same happens on a refused restocking change, because it uses `onSettled`.
- Fix: guard the watcher so it re-applies only when the product id changes or the form is not dirty. Alternatively, refresh only the inventory query and the list, not the detail data that feeds the form (stock is already served by the `inventory` key).

**6. Movement history shows only the first 20 rows and cannot be paged.**
- Where: `useProductInventory.ts:6-16`, `InventoryHistory.vue:22-24`.
- Axis: UI/UX, requirement "every quantity change must be auditable".
- Failure: every confirmed and cancelled order adds a row. A busy product pushes the opening `initialisation` entry and older corrections out of anything staff can see. The API is paginated, but the tool people use is not.
- Fix: a "load more" or page control using the existing `page` / `pages`.

**7. A catalogue ingestion breaks checkout price verification. Pre-existing, not made worse here, but the runbook prescribes an ingestion and the durability test masks it.**
- Where: `scripts/ingerer-catalogue.mjs:395-410` (`creerTables` has no `promo_debut`/`promo_fin`) and `:262-330` (only `sql/droits.sql` is replayed). `sql/promotions.sql` is applied by hand (`scripts/preparer-dev.sh:83`). Runbook Step 6 and O2.
- Axis: Rollout safety (focus 9), assessed as the caller asked.
- Assessment:
  - Real. Ingestion drops `nowtech_ancien … cascade`, which takes `nowtech.prix_effectif` and `promotion_active` with it.
  - The rebuilt `produits` has no promo columns.
  - The base branch already calls both in `CatalogueService` (`development:src/catalogue/catalogue.service.ts:193, 284`), so `verifier`, the public product read and the admin list/detail all fail until `promotions.sql` is replayed.
  - This feature does not introduce it or worsen it.
  - `test/inventaire-concurrence.spec.ts` rebuilds its stand-in `nowtech` with those objects present, so its "survives ingestion" claim is true only for the stock tables.
- Fix (separate work item): replay `sql/promotions.sql` and `sql/description-fiche.sql` in the ingestion switch, or add the columns to `creerTables`. Confirm with pre-flight check 4 before any post-cutover ingestion.

### MINOR

**8. Runbook inaccuracies.**
- Where: runbook Step 1 rollback and Step 3 smoke check 1, plus a deploy-order gap.
- Problems:
  - The rollback `drop table …` leaves the `statut_stock` and `type_mouvement_stock` enum types. Deleting the `_prisma_migrations` row and re-running `migrate deploy` then fails on `CREATE TYPE` (no `IF NOT EXISTS`).
  - Smoke check 1 expects `quantiteDisponible` on the public response, but it is deliberately never returned (`catalogue.service.ts:97-99`). Check the admin `inventaire` endpoint instead.
  - Between Step 3 (backend) and Step 4 (admin), the old admin still sends `en_stock` on every product PATCH (`DetailForm` before the change). The backend's `forbidNonWhitelisted` returns 400, and the old stock panel's route is gone. Say so, or deploy the two together.
- Fix: correct the text.

**9. A variation can overflow int4.**
- Where: `administration.dto.ts` (`AjusterStockDto` allows ±2,000,000,000); `inventaire.service.ts:172-185`; `total()` (`sum(quantite)::int`).
- Failure: a reception of 2,000,000,000 on a product holding 1,000,000,000 computes `apres = 3e9`. The Prisma update rejects it as out of int4 range, which surfaces as a 500 rather than a 409/400. Separately, a total above 2^31 would make every confirmation fail on the snapshot. The importer guards the total, but the service does not.
- Fix: bound `apres` (and the resulting total) below 2,147,483,647 and return a 409.

**10. The ledger records a client caller as `systeme` and the panel shows a raw member UUID.**
- Where: `commandes.service.ts:621-623` and `InventoryMovementRow.vue:11-15`.
- Failure: a customer reopening a confirmed order (`confirmee→soumise`, allowed to `client` in `DROITS`) writes a `commande_liberee` movement labelled "System". Team actors render as `role · <uuid>`, which means nothing to staff.
- Fix: allow an `acteur_type = 'client'` value, or store a readable label. Resolve member names in `lireInventaire`.

**11. Test gap on the `quantite >= n` guard.**
- Where: `test/inventaire-concurrence.spec.ts`, `inventaire.service.ts:241`.
- Problem: the mutation check noted in the walkthrough shows `quantite >= n` alone is not detected. Every scenario uses one unit.
- Failure if the guard is dropped: stock 2, two concurrent confirmations of 2. The loser trips `produit_stocks_quantite_check` and returns a raw 500 constraint error, instead of the intended 409 with `stock_insuffisant`.
- Fix: add that scenario (stock 2, orders of 2 and 2, expect one 409).

**12. `creerProduit` calls `exigerInventaire()` twice.**
- Where: `administration.service.ts:326-336`.
- Problem: the call before the slug lookup is redundant; the second one returns the value used. A failure in images, categories or delivery interval after the tx leaves a product with initialised stock (known, recorded).
- Fix: keep one call.

### INT

- **Authorization is clean.** Reads are direction+comptoir; the two writes and creation are direction only (`@Roles`). The actor comes from the token only, with a service-level `Forbidden` for non-`equipe`. The BFF (`server/api/v1/[...path].ts`) has no diff, so the allowlist and CSRF behaviour are unchanged. Client-side role gating (`useCachedSession`) is correctly backed by the server guard.
- **Quantity oracle.** The public `verifier` never returns the quantity, but `stock_insuffisant` lets a caller binary-search the available stock up to 99 by varying the requested quantity. The plan mandates the precheck, so accepted. Worth knowing if stock levels are commercially sensitive.
- **One snapshot per confirmation and per non-empty release** (`inventory_snapshots` grows with order volume; a `sum` over `produit_stocks` each time). Fine at current scale.
- **Import script.**
  - Design is sound: dynamic Prisma import so `.env` cannot supply `DATABASE_URL_MIGRATION`, target printed, one transaction, parameterised SQL, strict CSV, refuses duplicates.
  - A real run has no confirmation prompt, so a stale exported `DATABASE_URL_MIGRATION` in the operator's shell targets production silently apart from the printed line. Consider requiring `--essai` first or an explicit `--confirmer`.
  - Its spec needs a superuser owner for `session_replication_role`, so it would fail rather than skip on a non-superuser CI database.
- **Process.** The tester-first TDD rule was broken twice (Phase 1 ordering, Phase 6 concurrency spec). Both are acknowledged and mitigated (reconstructed red run, mutation checks).
- **Leftovers.**
  - `SummaryKpis` and `HeroBanner` are dead on the products page (acknowledged).
  - The legacy `sql/inventaire.sql` column is still added at ingestion and nothing reads it.
  - The `.env`/`pnpm-workspace.yaml` stray file mentioned in the Phase 1 notes is not in `git status`.

## Clean axes
- **Security**, apart from MAJOR 1 and the INT notes:
  - authz on every new or changed route
  - actor derivation
  - injection safety in raw SQL (all parameterised; the import script builds no SQL from CSV text)
  - no secrets, errors or stack traces leaked
  - the BFF unchanged
- **Performance:** no N+1 in the reservation, release or list paths. The list join is a PK left join. Nothing further beyond the INT snapshot note.
- **Tests** (AGENTS.md ban on useless tests): the admin panel, dialog, schema and detail-form specs test behaviour that can fail for a reason that matters (payload contents, read-only role, draft kept on error, invalidation targets). The backend DB suites prove the race, rollback, duplicate-release and durability claims. Only the gap in MINOR 11 remains.
- **Code quality:**
  - comments are English and explain why
  - `components/ui` untouched
  - schemas and types are in the right directories
  - components are lean, with the panel split into summary, history and row
  - semantic tokens are used (`bg-warning` and `text-success` exist in `main.css`)
  - nothing found beyond MINOR 12

## Verdict and open manual QA

**Ship after fixes.** Fix MAJOR 1 before merge. Decide MEDIUM 2-7 explicitly before cutover, since 2, 3, 4 and 7 are release blockers in practice. The rest are cheap.

Manual QA still open (none of it was runnable here):
1. Direction vs comptoir on a real backend: comptoir sees no controls, and a forced write returns 403.
2. Confirm an order from the admin UI after fixing MAJOR 1, and check the movement, the decrement and the dashboard total.
3. Cancel and reopen a confirmed order and check the restoration (panel and dashboard).
4. Responsive layout of the panel, history and dialog on narrow widths.
5. Create a product with a baseline and with the default zero; save a product with the long description cleared to null, then reload.
6. Restocking toggle round trip, including refusal when stock exists; verify the form draft behaviour from MEDIUM 5.
7. Customer checkout blocking for `rupture`, `reapprovisionnement` and `stock_insuffisant` through the real storefront (owner unknown, O1).
8. A real ingestion on a copy of production: stock tables intact, and whether promotions and checkout survive (MEDIUM 7).
9. A dry run and then a real run of the import on a copy of production, including the in-flight orders question (MEDIUM 4) and the Step 3 smoke checks.
10. The behaviour of a product with no stock row in the panel (MEDIUM 2).
