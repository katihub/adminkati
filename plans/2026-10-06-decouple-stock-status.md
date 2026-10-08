# Decouple product stock status from quantity

Slug: `decouple-stock-status`. Source assessment:
`reports/2026-10-05-assessment-manual-product-stock-status.md`.

## Requirement, restated

The client manages **status for every product** but **quantity for only a few** (promotion, clearance,
limited quantity). This is how WooCommerce works: a per-product "manage stock" checkbox; status is
mandatory and easy to change; quantity only matters when the box is ticked.

Decisions (user, 2026-10-06):

1. Ship **option 1** of the assessment. A product can be forced `en_stock` or `rupture` whatever its count.
   A forced `en_stock` product is sold **without quantity reservation**. The UI shows a warning modal when
   the chosen status conflicts with the quantity.
2. **Every product is in stock by default.** Tracking a quantity is something staff opt into.
3. Existing products keep the status WooCommerce gave them; nothing is flipped in bulk.
4. The **create form** gets an initial status (default In stock), so a half-finished product can be created
   Out of stock instead of going live the moment it is saved.

Mapping to WooCommerce, which fixes the vocabulary used below:

| WooCommerce | Here |
| :-- | :-- |
| "Manage stock" ticked | tracked: the product has a count and `disponibilite_forcee` is `null`, so quantity decides |
| "Manage stock" unticked, status chosen | `disponibilite_forcee = "en_stock" \| "rupture"`: status decides, any quantity is retained but not decremented |

One nullable column, three states, no illegal combination (the assessment's `mode` + optional `statut`
allowed `manuel` with no status).

## User story

> As a **direction** user, I want to mark any product *In stock* or *Out of stock* without entering a
> quantity, so the shop reflects reality for the thousands of products we never count.

The client's words: they cannot count every product but must manage the status of every product. Promotion,
clearance and limited-quantity items are counted; everything else is status only.

| As… | I want… | So that… |
| :-- | :-- | :-- |
| direction | a **Track quantity** switch per product | promo and clearance items decrement on each order and drop off the shop at zero |
| direction | to stop tracking a product again | I don't keep counting it after the promotion, and its history survives |
| direction | a **warning modal** when my status contradicts the count | I don't sell stock I don't have, or hide stock I do |
| direction | a new product to be **in stock by default**, with an optional quantity and an initial status | I only count what I choose to, and can keep a half-finished product hidden |
| customer | no change | out-of-stock products stay hidden, forced in-stock products are orderable |

| Given | When I… | Then |
| :-- | :-- | :-- |
| An uncounted product | switch it to Out of stock | It leaves the shop at once. No count is created and I can undo it. |
| A tracked product with 12 units | force Out of stock | A modal says 12 units are on record and the product will be hidden. Confirming hides it. |
| A tracked product at 0 units | force In stock | A modal says orders won't decrement the count. Confirming makes it orderable. |
| A product forced In stock | an order is confirmed | The order goes through and the count does not change. |
| A forced product | I tick Track quantity | The count decides again. A modal warns if that flips availability. |
| The create form | I leave the quantity empty | The product is created in stock, uncounted. |
| The create form | I pick Out of stock | The product is created hidden and uncounted. |
| The create form | I enter a quantity | The product is counted and its quantity decides (an explicit `0` means out of stock). |
| Anyone who is not direction | open a product | They see the status but cannot change it. |

**What "in stock by default" already is.** Imported products already are: the legacy column is
`en_stock boolean not null default true` and the WooCommerce ingestion writes `inStock !== false`
(`scripts/ingerer-catalogue.mjs:535, 697`). The exception is the panel's create path: `creerProduit` always
counts a new product (`administration.service.ts:491`) and the form defaults the quantity to `"0"` and
always sends it (`DetailForm.vue:137, 429`), so a new product is born counted at zero, out of stock, hidden
and permanently tracked. The default therefore changes **creation**, not the fallback rule.

## Scope: both repos are ours

The backend (`../NowTech-backend-`) and this admin panel are built together, so Phase 0 is **work for this
team, not a hand-off**. Two things still hold:

- `AGENTS.md` still says the backend is read-only from this repo. Before any backend code is written the
  user confirms, and that line is corrected in place (the project rule: rewrite the conflicting text, never
  add an override clause).
- `app/types/api/` types must cite real backend file and line (`app/types/api/README.md`), so the admin
  phases follow the backend ones. Do not fake the feature from the frontend: the product PATCH rejects
  `en_stock` and `quantite_stock`, and the registry ignores `nowtech.produits.en_stock` once a stock row
  exists.

> **Status (2026-10-06): all phases are implemented and committed** (backend `0ee3747`, `0624f94`; admin
> `b16eb50`, `5d72da5`), nothing pushed. See `walkthroughs/2026-10-06-decouple-stock-status.md` for what differed
> from this plan.

## How the work is delivered

**One pass, in phases, on one branch per repository, both named `feat/ai-integration`**: this repo's and the
backend's. (The backend work was first committed on a branch I created, `fix/etat-stock-inventaire-non-compte`;
the user corrected that, it was fast-forwarded into the backend's `feat/ai-integration` and deleted.) No other
branches, and nothing is merged or deployed a piece at a time. Phase 0 (backend)
comes first because the admin types must cite it; Phases 1 to 4 (admin) follow. Each phase is test-first and
is committed on its branch when its tests pass. At the end each repository gets one pull request.

## Phase 0 — Backend (NowTech-backend-)

Everything here is **to be created**; nothing below exists today. Re-verified against backend `1f83abe`
(2026-10-05) on 2026-10-06; see `reports/2026-10-06-assessment-manual-product-stock-status-rerun.md`.
Citations below are to that commit's paths (`src/catalogue/administration/`, `src/catalogue/public/`).

> **Status: Phase 0 is implemented**, in backend commits `0ee3747` (the `lireEtatStock` fix) and `0624f94`
> (everything else below), on the backend's current branch. Where the build differs from this plan (a simpler
> response shape, no actor column, the reservation not using a guarded `update`), the walkthrough
> `walkthroughs/2026-10-06-decouple-stock-status.md` records it, and the text below has been updated to match.

### Schema

New table `boutique.produit_disponibilites(produit_id pk, disponibilite_forcee disponibilite_forcee null,
modifie_le)`. `NULL` or no row means tracked. The actor is recorded in the journal, not in the table.
`produit_stocks` and its check `(statut = 'en_stock') = (quantite > 0)` stay untouched.

- **A Prisma migration in the `boutique` schema.** It must be additive and replayable on a database that
  already holds orders and money (`add ... if not exists`; deploy guide §5): a failing migration stops the
  container from starting.
- **No foreign key to `nowtech.produits`.** The WooCommerce ingestion replaces the whole `nowtech` schema
  on every run (`scripts/ingerer-catalogue.mjs`, "remplacement en bloc"); a foreign key would break that
  swap. `produit_stocks` is deliberately unkeyed for the same reason (`migration.sql:3`). `boutique` is not
  swapped, so the override **survives re-ingestion**; the legacy flag does not.
- **Grants in the same migration**, as `produit_stocks` does (`migration.sql:95-96`): `SELECT, INSERT,
  UPDATE` for `nowtech_app`, no `DELETE`. "Clear the override" is an update to `NULL`, never a delete.

**No backfill.** An uncounted product (no registry row) already falls back to the legacy
`nowtech.produits.en_stock` flag everywhere (`public/statut-stock.ts:23`, `public/vitrine-catalogue.sql.ts:40`),
so an override row exists only once staff change a status. The table is the only place the override is
stored: `nowtech.produits.en_stock` is WooCommerce's copy, rewritten at every ingestion, and is **not**
written.

### Endpoint

```http
PATCH /v1/catalogue/administration/produits/:id/disponibilite      (role: direction)
{ "disponibilite_forcee": "en_stock" | "rupture" | null }
```

Response: the refreshed `InventaireProduit`. Actor from the token. Transactional upsert, journal entry
`stock.disponibilite_modifiee` (with `de` and `vers`), **no stock movement** (no units moved), and nothing
written or journalled when the decision does not change. `null` sets the column to `NULL`. Like
`changerStatutStock` (`administration.service.ts:741-753`) it must call `revalidation.previenir([slug])` and
`marquerVitrine()` so the storefront refreshes.

**It must not call `initialiserSiAbsent`.** The existing `ajusterStock` and `changerStatutStock` lazily
create a zero registry row for an uncounted product (`administration.service.ts:726, 746`), and a registry
row can never be deleted (`DELETE` revoked, movement FKs `RESTRICT`). Reusing that path would make every
status change irreversible; the override exists to avoid exactly that.

### Response shape

**`statut_stock` is now the effective selling status, everywhere.** The list, the detail, the status filter,
the counters and the Stock tab all read it through `statutStockSql()`, which puts the decision first, so no
separate `disponibilite` field is needed (an earlier draft of this plan had one, and four call-site swaps in
the admin to match; both were dropped as unnecessary). The only addition is, on `InventaireProduit`
(`administration.service.ts:63`, exposed by the detail's `inventaire` object and by `GET .../inventaire` and
the `PATCH` response):

| Field | Meaning |
| :-- | :-- |
| `disponibilite_forcee: "en_stock" \| "rupture" \| null` | the direction's decision; `null` when the stock decides |

`quantite_stock` keeps meaning the physical count. The list rows do not carry the decision (the badge does
not need it).

### Behaviour that must change (every place that reads availability)

Availability is read through **two predicates, one statement and one verifier condition**:

1. `enStock()` / `produitVisible()` (`public/vitrine-catalogue.sql.ts:40-68`) and `statutStockSql()`
   (`public/statut-stock.ts:23`): both become `coalesce(override, registry status, legacy flag)`. Between
   them they feed the storefront, the admin list/detail/`stock` filter, the public filter, the cart
   verifier and the `ruptures` count, so the quick-filter pills and KPIs follow with no extra work. The
   source-scanning guard in `public/statut-stock.spec.ts` must be updated to expect the override.
2. Cart `verifier` (`public/catalogue.service.ts:364`): the quantity check becomes
   `p.auRegistre && p.forcee !== 'en_stock'`, so a forced `en_stock` product accepts any quantity and a
   forced `rupture` one is refused with `motif: 'rupture'`.
3. Reservation (`inventaire.service.ts`, `reserverCommande`): forced `en_stock` skips the decrement and
   writes **no** `commande_confirmee` movement. Forced `rupture` does **not** block: it hides the product and
   refuses new carts, like a WooCommerce status, but an order already placed stays confirmable (decided
   2026-10-06; an earlier draft of this plan refused it here). The reservation therefore reads only the
   `en_stock` decisions, and a forced-out product falls back to what it was: counted, it reserves through the
   guarded `update`; never counted, it passes without a movement. The decisions are read once inside the
   confirmation's transaction rather than inside the guarded `update`: a toggle that commits just after the
   read makes the confirmation look as if it happened first, which is a possible order and never a double
   count, so no extra locking is needed.

   **The reservation is not the only gate.** `confirmer` re-runs the cart check (`verifier`) before it
   reserves, and that check refused a forced-out product too. `verifier` now takes `commandeDejaPassee`, which
   `confirmer` passes: a `rupture` the direction decided no longer refuses the line, while a `rupture` it did not
   decide (the count at zero, the catalogue flag) still does, and a counted product's quantity is still
   compared. Order creation, quotes and the public route keep the refusal.
4. `libererCommande` needs no change: it credits back only existing reservation movements, so a product
   switched to forced mode after an order was reserved still balances.
5. **Fix the existing defect first.** *Implemented on 2026-10-06, in its own plan
   `plans/2026-10-06-fix-uncounted-inventory-read.md` and walkthrough
   `walkthroughs/2026-10-06-fix-uncounted-inventory-read.md`.* `lireEtatStock`
   (`administration.service.ts:768-776`, behind `GET .../inventaire`) returns `rupture` and quantity 0 for
   an uncounted product that the detail read reports as `en_stock`. Route it through `statutStockSql()` and
   widen the guard regex, which currently only matches `coalesce(x.statut::text, 'rupture')`, to
   `?? 'rupture'`. It needs no migration and no override. Add one test to
   `administration.inventaire.spec.ts`: an uncounted product flagged `en_stock` reads `en_stock` from both
   endpoints.
6. **Creation (`creerProduit`, `administration.service.ts:439-491`).** Call `initialiserStock` only when
   `quantite_stock_initiale` is present; today it runs on every create, with `?? 0`. An explicit `0` keeps
   its meaning (counted at zero, out of stock). `CreerProduitDto` also accepts an optional
   `disponibilite_forcee`, and `rupture` writes the override row **in the same transaction**; an omitted
   value means the product is simply in stock (the column default is `true`). Do not accept both a quantity
   and a forced status: a counted product's status is decided by its count until staff change it afterwards.

**Storefront (`now-tech--website`, `main` `65cd4c7`): no change required.** It holds no stock logic; it
reads `enStock` on cards and `commandable`/`motif` from `/catalogue/verifier`, and the backend already hides
out-of-stock products, so both forced states follow from the predicates above. Optional, unrelated to the
feature: its `MotifRefus` type (`src/lib/verification.ts:28`) omits `stock_insuffisant` and
`reapprovisionnement`, which the backend returns, so customers get a generic "indisponible".

Accepted consequence of option 1: orders on a forced-`en_stock` product leave the count untouched, so the
count drifts. Staff correct it with a `correction` when they resume tracking (the resume dialog says so).

## Reuse (frontend)

- `useProductInventory.ts` — add one mutation beside `useSetProductStockStatus`, reusing
  `useInvalidateInventory` (already refreshes list, detail, history, statistics).
- `OverviewStockIndicator.vue` — already the one place the status shows and already carries the
  `productId`-only-for-staff gate (`DetailForm.vue:90-93`, role `direction`).
- `deriveProductStatus` (`utils/product-status.ts`) — unchanged, and so are its call sites: `statut_stock` is
  already the selling status.
- `@/components/ui/alert-dialog` — used as-is. Nearest precedents for a confirm dialog:
  `points-of-sale/DeleteDialog.vue`, `quotes/ArchiveDialog.vue`.
- `apiErrorText` for failures, `InfoTip` for the hint, `Switch` already imported.

`app/components/ui/` is user-owned and is **not** edited.

## Phase 1 — Types and the conflict rule (pure, TDD first)

| | |
| :-- | :-- |
| **What** | Add `StatutForce = "en_stock" \| "rupture"` and `disponibilite_forcee: StatutForce \| null` to `InventaireProduit`; add `ChangerDisponibiliteInput { disponibilite_forcee: StatutForce \| null }`. Each with a citation to the backend commit's file and line. |
| **Where** | `app/types/api/inventaire.ts` |
| **Done when** | `bun run typecheck` reports only the fixtures that must now carry the new field (enumerate with it; fix them). |

| | |
| :-- | :-- |
| **What** | `availabilityConflict(inventory, target)` where `target` is `StatutForce \| null`. Returns `"sell-without-stock"` (forcing `en_stock` at quantity 0), `"hide-with-stock"` (forcing `rupture` at quantity > 0), `"resume-flips"` (`null` while the current effective status differs from what the quantity gives), else `null`. Quantity-derived status = `quantite_stock > 0 ? "en_stock" : "rupture"`; physical `reapprovisionnement` counts as unavailable. Returns a value, no side effects. |
| **Where** | new `app/utils/stock-availability.ts` |
| **Done when** | `bunx vitest run test/unit/stock-availability.test.ts` passes (written first, red). |

## Phase 2 — Mutation

| | |
| :-- | :-- |
| **What** | `useSetProductAvailability(productId)`: PATCH `/catalogue/administration/produits/${id}/disponibilite`, `onSettled` invalidates, like `useSetProductStockStatus` — a refused change leaves the screen stale, so reload on failure too. |
| **Where** | `app/composables/useProductInventory.ts` |
| **Done when** | the Phase 3 component test sees the request body and the refetch. |

No Zod schema: the body is a closed enum chosen from buttons, with no free text to validate, and the type
union is the contract. If a schema is wanted anyway it goes in `app/schemas/inventaire.ts`.

## Phase 3 — UI

All strings in both `i18n/locales/products/en.json` and `fr.json`; `bun run i18n:check` must pass.
Phosphor icons only, never text arrows.

| | |
| :-- | :-- |
| **What** | Rework `OverviewStockIndicator`. For staff (`productId` set): a **"Track quantity"** switch, **derived** as `inventaire.modifie_le !== null && disponibilite_forcee === null` (a product is tracked only if it has a count and no override). When on: status shown read-only from `disponibilite`, quantity and pencil as today. When off: the existing status switch is live and **always writes an explicit override** (`en_stock` or `rupture`), never `null`: for an uncounted product, `null` would fall back to the legacy flag, which is `false` for products WooCommerce marked out of stock, so choosing In stock would not stick. The quantity stays visible but muted with a "not counted" cue. **While `modifie_le === null` the Track switch is disabled with a hint pointing at the count dialog**: a count (the pencil, which creates the registry row) is how a product starts being tracked; only then can ticking the switch clear the override. A new product therefore reads Track off, status In stock. Without `productId` the whole row stays read-only. Replace the disabled switch and the "managed from the Stock tab" hint. |
| **Where** | `app/components/products/OverviewStockIndicator.vue` |
| **Done when** | a `direction` session can toggle both controls, anyone else sees them disabled. |

| | |
| :-- | :-- |
| **What** | Create form (`mode === "add"`): the initial-quantity field starts **empty**, is optional, and is sent only when filled (today `initialStock = ref("0")` and `parseRequiredNumber(...) ?? 0` always send it). Beside it an initial status control, default **In stock**, that sends `disponibilite_forcee: "rupture"` only when Out of stock is chosen and is disabled while a quantity is typed. Update the hint to "Leave empty to sell without counting". |
| **Where** | `app/components/products/OverviewInitialStock.vue`, `app/components/products/DetailForm.vue:137, 253, 429`, `app/schemas/produit.ts:70-77` (`produitCreateSchema` gains the optional `disponibilite_forcee`), `i18n/locales/products/{en,fr}.json` (`products.detailForm.initialStock`) |
| **Done when** | creating with an empty quantity posts a body with no `quantite_stock_initiale`; choosing Out of stock posts `{ disponibilite_forcee: "rupture" }`; typing `0` still posts `quantite_stock_initiale: 0`. |

| | |
| :-- | :-- |
| **What** | `StockConflictDialog` — an `AlertDialog` that explains the conflict from `availabilityConflict`'s result (one message per kind, includes the current quantity) and confirms or cancels. It owns no mutation; the indicator sends it on confirm. Non-conflicting changes send immediately, no dialog. |
| **Where** | new `app/components/products/StockConflictDialog/StockConflictDialog.vue` (folder-per-component rule) |
| **Done when** | choosing `en_stock` at quantity 0 opens the dialog; cancel changes nothing; confirm sends the PATCH. |

| | |
| :-- | :-- |
| **What** | Hide the restocking button when `disponibilite_forcee !== null`: `reapprovisionnement` only exists in tracked mode and the forced status would hide its effect. |
| **Where** | `app/components/products/InventoryActionBar.vue` (and `toggledRestockingStatus` if cleaner) |
| **Done when** | forced product shows no restocking toggle; tracked product at quantity 0 still does. |

### Surfaces that display status (Phase 4)

**No change needed.** The four `deriveProductStatus` call sites (`SummaryKpis.vue:16`, `HeroBanner.vue:20`,
`ListItem.vue:22`, `taxonomy/CategoryProductCard.vue:14`) keep reading `statut_stock`, which is now the selling
status. `product-form-source.ts` already drops the whole `inventaire` object from the form signature, so the
new `disponibilite_forcee` inside it is excluded without an edit.

**Done when** the list shows a forced product with its selling status (checked in the running panel), and the
quick-filter pills still add up to the catalogue total.

## States

| Surface | Loading | Error | Empty / partial |
| :-- | :-- | :-- | :-- |
| Indicator | switches disabled with the inventory query pending | `apiErrorText` under the row (`role="alert"`), refetch restores truth | `inventory` undefined renders nothing, as today |
| Conflict dialog | confirm button disabled with spinner while pending | closes only on success; error shown in the indicator row | n/a |
| Product with no stock row | indicator still renders: backend returns quantity 0 and the effective status | same | quantity muted, "not counted" |

## Tests

Three new, per the repo's "few meaningful tests" rule. Composables get none unless asked.

1. **Unit — `test/unit/stock-availability.test.ts`.** Functionality: each conflict kind and the `null` case.
   Robustness: quantity 0 vs 1, physical `reapprovisionnement`, resuming tracking when nothing flips.
2. **Nuxt — extend `test/nuxt/products-overview-stock-indicator.test.ts`.** One flow: direction forces
   `en_stock` on a zero-quantity product, the dialog appears, cancel sends nothing, confirm sends
   `{ disponibilite_forcee: "en_stock" }`. Security axis in the same file: a non-direction session cannot
   toggle either control. Robustness in the same file: on an uncounted product the Track switch is disabled
   and choosing In stock sends an explicit override, not `null`.
3. **Nuxt — create form, in `test/nuxt/products-detail-form.test.ts`.** An empty quantity omits
   `quantite_stock_initiale`; Out of stock sends `disponibilite_forcee: "rupture"`.

Existing specs that reference the initial quantity and must be **updated, not added to**:
`test/unit/produit-schema.test.ts`, `test/nuxt/products-initial-stock-error.test.ts`,
`test/nuxt/products-detail-form.test.ts`, `test/nuxt/products-overview-stock-indicator.test.ts`.

Backend tests (in `NowTech-backend-`, same repo rules): the `lireEtatStock` consistency test (Phase 0
item 5), the override in `statutStockSql()` / `enStock()`, the verifier skipping the quantity check when
forced, the reservation honouring the override inside the guarded statement, and `creerProduit` creating no
registry row without a quantity.

Not tested: dialog markup, the Switch itself, the invalidation list, the four one-line field swaps.

## Risks

- **Phase 0 has not shipped.** Phases 1–4 need it, because the types must cite real backend lines. Earliest
  signal: no backend file:line to cite.
- **New products go live the moment they are saved.** A zero count used to act as an implicit draft. The
  create form's initial status is the mitigation; an operator who forgets it publishes an unfinished
  product. Recommended default is still In stock, per the decision.
- **Re-ingestion changes the legacy flag, never the override.** WooCommerce can still flip an uncounted
  product's flag at the next import, but once staff set a status in the panel the override wins and
  WooCommerce no longer affects that product. Say this to the client. Not examined: whether products created
  in the panel survive a re-ingestion; the script says products absent from the file "ne sont pas repris".
- **The two admin stock reads disagree for uncounted products (open defect).** `GET .../inventaire` says
  `rupture`, the detail says `en_stock`, for the roughly 3 962 uncounted products flagged available. The
  Stock tab then offers "mark restocking" on a selling product (hidden since the 2026-10-06 slice), and the
  lazy-initialisation path is one click away from removing it from the storefront for good. Pre-existing,
  so Phase 0 item 5 fixes it first. Production already has the list, filters and cart fixed (see
  "Production rollout"), which made this the **one remaining admin surface** that reported `rupture` for
  every uncounted product. The fix is verified on the local stack: the detail and Stock-tab reads agree for
  an uncounted product. It is not yet merged or deployed.
- **The registry is permanent.** No registry row can be deleted, so counting a product is one-way. The
  override is what makes a counted product able to stop being tracked; never use the lazy-init path to
  change a status.
- **Stale citations.** 39 citations in `app/types/api/*.ts` point at `administration.{service,dto,controller}.ts`
  line numbers that moved when the backend split the service. New types cite the new paths; the old ones
  are a separate chore.
- **Quantity drift** while forced `en_stock` (accepted, see Phase 0). The resume dialog is the mitigation.
- **Cutover runbook.** `reports/2026-09-30-assessment-product-inventory-cutover.md` plans an opening count by
  Operations. Under this model only tracked products need one. Not re-read for this plan; check before the
  count is scheduled.
- **Fixture churn.** Roughly 20 specs build products with `statut_stock`; making the new fields required
  touches the shared fixtures first (`inventory-fixture.ts`, the indicator test's `makeProduct`).
- **Stock import/export** is unaffected: it moves quantity, which no longer decides availability for forced
  products. Not examined further.

## Open questions

1. **~~Backfill uncounted products from the legacy flag?~~ Withdrawn on 2026-10-06.** The backend now falls
   back to the legacy flag for uncounted products in every read, so there is nothing to backfill.
   Replaced by: should "mark restocking" stay available on uncounted products? **Decided 2026-10-06: hide
   it.** Shipped separately, ahead of the backend contract, as `plans/2026-10-06-hide-restocking-uncounted.md`
   (walkthrough `walkthroughs/2026-10-06-hide-restocking-uncounted.md`). Phase 3's restocking guard below now
   only has to add the forced-override condition.
2. **Resume-tracking warning (`resume-flips`).** Included, because ticking "Track quantity" on a selling
   product with quantity 0 silently takes it off the storefront. Same dialog, one more message. Drop it if
   unwanted. (Open: only reachable for a counted product, since the switch is disabled while uncounted.)
3. **Should `reapprovisionnement` be selectable while forced?** Recommend **no**: it is a tracked, zero-count
   state.
4. **Existing out-of-stock products.** **Decided 2026-10-06: leave them as WooCommerce says.** No bulk flip.
   Note the roughly 343 products absent from the shop are *not visible*, which covers out of stock **and**
   withdrawn; the split was not measured.
5. **Initial status on the create form.** **Decided 2026-10-06: yes**, default In stock (Phase 3, create form;
   Phase 0 item 6).
6. **Not in scope, likely next:** a quick status toggle on the product list rows, and a bulk status change.
   The stock import moves counts, not statuses.

## Production rollout

### Facts, probed read-only on 2026-10-06

- `GET /sante` answers `200`.
- The public list reports **3 962** in-stock products, matching the in-stock count in the backend source
  (`public/statut-stock.ts` header).
- `POST /v1/catalogue/verifier` on an uncounted in-stock product answers `commandable: true`. The code before
  PR #12 answers `motif: "rupture"` and the code between #12 and #13 answers `stock_insuffisant`, so **both
  fixes are live in production**.
- The earlier report that the product list showed 4 000+ products out of stock was the **pre-#12
  behaviour**: every product with no registry row read as `rupture`. PRs #12 and #13 fixed it and the user
  confirmed on 2026-10-06 that everything now shows in stock. Not a live issue.
- Verified on the local stack on 2026-10-06 (4 275 products, 2 002 with a registry row): the admin list,
  detail, status filters (4 157 in stock, 118 out) and the panel's list all agree. Authenticated production
  views were not probed, and the registry being empty in production is from the deploy guide, not measured.

### How a change reaches production (backend deploy guide §1, §5, §6)

Merging to `main` is the deploy: Coolify rebuilds the image and swaps the container within about two
minutes. At start the container runs `prisma migrate deploy`, then replays the ten `sql/` files, then starts
the API. **If either of the first two fails the container does not start and the previous image keeps
serving.** Migrations never roll back, so every migration here is additive. Rolling back code means
redeploying the previous image in Coolify; the extra table is simply ignored by older code.

### Order of landing

The work is built in one pass on one branch per repository. When both are done, the backend pull request
lands first and the admin one second:

| Repository | Carries | Safe because |
| :-- | :-- | :-- |
| Backend | The `lireEtatStock` fix, the migration for `boutique.produit_disponibilites`, the `disponibilite` endpoint, both predicates, verifier, reservation and `creerProduit`. | Additive. With no override rows every product resolves exactly as today, so the 3 962 stay on the shop and nothing flips. |
| Admin | Types, mutation, indicator, conflict dialog, create form. | Backend first. An old admin against the new backend ignores the new fields and still posts `quantite_stock_initiale: 0` on create (same as today). A **new** admin against an **old** backend would 404 on the override, which is why the order is fixed. |

No data migration, backfill or bulk update at any step. All 4 305 products stay uncounted with no override,
Track off and status from the flag, as now.

### Checks after the backend lands, and again after the admin lands

Public, read-only, repeatable from a terminal: `GET /sante` is `200`; the public list total is unchanged at
3 962 until a status is changed in the panel; `POST /v1/catalogue/verifier` on an uncounted in-stock product is
`commandable: true`. Then, in the panel as `direction`: set one product Out of stock and see the public total
drop by one within the revalidation window, then set it back.

## Order of work

All on the current branches (see "How the work is delivered").

0. **Done:** the backend is confirmed in scope and `AGENTS.md` is corrected.
1. **Phase 0, backend:** the `lireEtatStock` fix (done), then the migration, endpoint, predicates, verifier,
   reservation and `creerProduit`; each with its test written first.
2. **Phases 1 to 4, admin:** types and `availabilityConflict` (test red, then green) → mutation → indicator,
   dialog, restocking guard (indicator test red first) → create form → four call-site swaps and the form
   signature.
3. Gates, per repo: `bun run lint`, `bun run format`, `bun run i18n:check`, `bunx fallow`,
   `bun run typecheck`, `bunx vitest run` in the admin; the backend's own `npm test` and PR checks.
