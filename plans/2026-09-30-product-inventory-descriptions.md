# Product inventory and descriptions

## Requirement

Every sellable product needs a physical stock quantity and one customer-facing availability state:
**In stock**, **Out of stock**, or **Restocking**. Direction can correct quantities at any time.
A confirmed online order reserves/decrements the relevant quantity; an order that is cancelled or
returned to the submitted state releases that reservation. Every quantity change must be auditable.

The product editor must expose both short and long manual descriptions. The existing short
description must be retained. AI-generated text is explicitly outside this release.

## Backend reconciliation

The plan is reconciled against `/Users/michaelnji/Projects/nvc/NowTech-backend-` on 2026-09-30.
These facts determine the design:

1. **`nowtech.produits` is not durable.** `scripts/ingerer-catalogue.mjs:232-261` creates a
   replacement schema and renames it over `nowtech` on every import. The current `en_stock` and
   `quantite_stock` columns therefore cannot be the source of truth for stock reservations or an
   audit ledger. As with `ProductCost` and `ProduitDelaiLivraison` in
   `prisma/schema.prisma:78-135`, durable stock data belongs in the Prisma-owned `boutique` schema
   and must not have a foreign key to a regenerated product.
2. **There is already a partial inventory implementation, but it is insufficient.**
   `InventaireService` totals `nowtech.produits.quantite_stock`
   (`src/inventaire/inventaire.service.ts:20-24`), and
   `AdministrationCatalogueService.modifierQuantiteLocale()` permits a direct total overwrite only
   for panel-created ids (`src/catalogue/administration.service.ts:355-378`). It loses per-product
   history, excludes synchronized products, and can be erased by ingestion.
3. **The order confirmation seam already exists.** `CommandesService.confirmer()` rechecks
   catalogue availability, then conditionally moves a `soumise` order to `confirmee` in one Prisma
   transaction (`src/commandes/commandes.service.ts:221-326`). The read is currently non-locking, so
   it must be replaced by guarded inventory updates inside that same transaction to prevent two
   confirmations spending the last unit.
4. **The existing state machine has relevant reversal paths.** `soumise -> refusee|annulee` occurs
   before any reservation. A confirmed order can later return to `soumise`, and can become
   `annulee` through `annulation_demandee` (`src/commandes/machine-etats.ts:27-40`). A release must
   happen only for an actual prior reservation and exactly once.
5. **Both description columns already exist and are customer-facing.** `nowtech.produits.description`
   and `fiche_technique` are accepted by `ModifierProduitDto`
   (`src/catalogue/administration.dto.ts:139-160`) and returned by the public catalogue as
   `description` and `ficheTechnique` (`src/catalogue/catalogue.service.ts:63-76, 196-201`).
   `description` is already the short description in the admin UI; `fiche_technique` is the missing
   long-description field. No duplicate column or data migration is needed.

## Decisions

1. **Authoritative inventory**: create durable per-product inventory state and an append-only
   movement ledger in `boutique`. The regenerated fields remain a temporary read compatibility
   projection only and are never mutated by stock operations.
2. **Stock-state invariant**: quantity is a non-negative integer. `en_stock` means quantity is
   greater than zero. `rupture` means quantity is zero. `reapprovisionnement` is a deliberate
   staff-set, zero-quantity state. Receiving a positive quantity always returns the product to
   `en_stock`; staff cannot manually claim a zero-quantity product is in stock.
3. **Ordering policy**: `rupture` and `reapprovisionnement` are both non-orderable. Restocking
   carries no ETA in this release. The public catalogue exposes the state but never exposes raw
   stock quantity.
4. **Auditing policy**: staff apply a signed quantity variation with a required reason rather than
   overwriting a total. The backend calculates `quantite_avant` and `quantite_apres` while holding
   the row lock. A stocktake is represented as a correction movement, not a special silent write.
5. **Order policy**: aggregate each confirmed order's lines by product, reserve them atomically on
   `soumise -> confirmee`, and create one order-linked movement per product. A later
   `confirmee -> soumise` or transition to `annulee` reverses each reservation exactly once.
   `soumise -> refusee` has nothing to restore; the release function is a safe no-op when no
   reservation exists.
6. **Description policy**: keep `description` as the short description and surface
   `fiche_technique` as the long description. Both remain nullable plain text. The existing backend
   20,000-character bound applies to the long field; the admin keeps its 500-character short-field
   product limit.
7. **Access policy**: `direction` can make inventory and description changes. `direction` and
   `comptoir` can read product inventory and its movement history. The browser never receives a
   write path that bypasses the backend role guard.
8. **Explicit exclusion**: do not add an AI provider, key, generation endpoint, prompt,
   dependency, or UI action in this work.

## Reuse

| Need | Existing implementation | Use in this feature |
| :-- | :-- | :-- |
| Durable data outside regenerated products | `ProductCost`, `ProduitDelaiLivraison` in `prisma/schema.prisma` | Model inventory by `product_id` without an FK to `nowtech.produits`. |
| Transactional aggregate metric | `InventaireService` and `InventorySnapshot` | Refactor the service to total durable inventory and snapshot only after a successful stock transaction. |
| Product mutation authorization and audit actor | `AdministrationCatalogueController` and `AdministrationCatalogueService` | Continue deriving the actor from `@AppelantCourant`, never request it in a body. |
| Atomic order transition | `CommandesService.confirmer()` and `poser()` | Add reservation/release inside their existing transactions and retain conditional status writes. |
| Admin server state | TanStack Query composables and `apiQueryKeys` | Add an inventory query-key group and invalidate product list/detail after every stock mutation. |
| Product work area | `app/components/products/DetailForm.vue` | Replace the local-only inventory card with a product-wide inventory panel, outside the ordinary product-text save payload. |
| Text input UI | `OverviewShortDescription.vue`, `Textarea`, `Label` | Keep the short field and add a focused long-description sibling, rather than creating an editor or HTML format. |
| Error-state policy | `InlineStateNotice.vue`, `ApiErrorCard.vue`, `EmptyStateCard.vue` | Use the wide-panel error/empty components for inventory history; retain the product page's existing loading/error shell. |
| BFF | `server/api/v1/[...path].ts` | No new handler: the authenticated catch-all proxy already forwards these API routes with CSRF and its explicit header allowlist. |

## Data contracts

### Durable backend model (new)

Add these Prisma types in `NowTech-backend-/prisma/schema.prisma`. Names follow the backend's French
domain convention; exact relation syntax can follow the nearby order models.

```ts
enum StatutStock {
  en_stock
  rupture
  reapprovisionnement
}

enum TypeMouvementStock {
  initialisation
  reception
  correction
  commande_confirmee
  commande_liberee
}

model ProduitStock {
  produitId       Int         @id @map("produit_id")
  quantite        Int
  statut          StatutStock
  modifieLe       DateTime    @updatedAt @map("modifie_le") @db.Timestamptz(3)
  mouvements      MouvementStock[]

  @@map("produit_stocks")
}

model MouvementStock {
  id                      String              @id @default(uuid()) @db.Uuid
  produitId               Int                 @map("produit_id")
  type                    TypeMouvementStock
  variation               Int
  quantiteAvant           Int                 @map("quantite_avant")
  quantiteApres           Int                 @map("quantite_apres")
  motif                   String?             @db.VarChar(200)
  acteurType              String              @map("acteur_type") @db.VarChar(20)
  acteurId                String?             @map("acteur_id") @db.VarChar(64)
  acteurRole              String?             @map("acteur_role") @db.VarChar(40)
  commandeId              String?             @map("commande_id") @db.Uuid
  transitionCommandeId    String?             @map("transition_commande_id") @db.Uuid
  annuleMouvementId       String?             @unique @map("annule_mouvement_id") @db.Uuid
  creeLe                  DateTime            @default(now()) @map("cree_le") @db.Timestamptz(3)

  produit                 ProduitStock        @relation(fields: [produitId], references: [produitId], onDelete: Restrict)
  commande                Commande?           @relation(fields: [commandeId], references: [id], onDelete: Restrict)
  transitionCommande      CommandeTransition? @relation(fields: [transitionCommandeId], references: [id], onDelete: Restrict)
  annuleMouvement         MouvementStock?     @relation("MouvementAnnule", fields: [annuleMouvementId], references: [id])
  mouvementDeLiberation   MouvementStock?     @relation("MouvementAnnule")

  @@unique([transitionCommandeId, produitId])
  @@index([produitId, creeLe])
  @@index([commandeId])
  @@map("mouvements_stock")
}
```

Add the matching `mouvementsStock MouvementStock[]` relation fields to the existing `Commande` and
`CommandeTransition` models. Every state-changing raw update must also set `modifie_le = now()` when
it does not go through Prisma's `@updatedAt` handling.

The migration must enforce all of these invariants in PostgreSQL, not only TypeScript:

- `produit_stocks.quantite >= 0`.
- `statut = 'en_stock'` exactly when `quantite > 0`.
- `statut in ('rupture', 'reapprovisionnement')` only when `quantite = 0`.
- A normal movement has non-zero variation; `initialisation` may record a zero baseline.
- `annule_mouvement_id` is unique and has a real self-referencing foreign key, so one reservation
  cannot be released twice. Service code enforces that it targets a `commande_confirmee` movement
  for the same product and order; PostgreSQL checks cannot express that cross-row type condition
  without an unnecessary trigger.

`produit_id` deliberately has no foreign key to `nowtech.produits`; a catalogue ingestion must never
delete the stock ledger. `commande_id` and order-transition references can be real FKs because they
live in the durable Prisma schema.

### API changes

The following are backend changes. `en_stock` remains read-only during the staggered rollout, derived
as `statut_stock === 'en_stock'`, so the existing storefront does not break before it consumes the
new status. It is removed from `CreerProduitDto`, `ModifierProduitDto`, and the admin form write
payload; no new code may treat it as a second source of truth.

```ts
type StatutStockApi = "en_stock" | "rupture" | "reapprovisionnement"

interface InventaireProduit {
  produit_id: number
  quantite_stock: number
  statut_stock: StatutStockApi
  modifie_le: string
}

interface MouvementStockApi {
  id: string
  type: "initialisation" | "reception" | "correction" | "commande_confirmee" | "commande_liberee"
  variation: number
  quantite_avant: number
  quantite_apres: number
  motif: string | null
  acteur: { type: "equipe" | "systeme", id: string | null, role: string | null }
  commande_reference: string | null
  cree_le: string
}
```

| Endpoint | Role | Request | Response and rules |
| :-- | :-- | :-- | :-- |
| `GET /catalogue/administration/produits` | `direction`, `comptoir` | query gains `stock=reapprovisionnement` | Each row has `quantite_stock` and `statut_stock`; legacy `en_stock` is derived while consumers migrate. |
| `GET /catalogue/administration/produits/:id` | `direction`, `comptoir` | none | Detail embeds `inventaire: InventaireProduit` and retains the legacy alias during rollout. |
| `POST /catalogue/administration/produits` | `direction` | `quantite_stock_initiale?: integer >= 0`, alongside existing product fields | Creates the durable inventory state and one `initialisation` movement in the same transaction as product creation. Zero starts as `rupture`. |
| `GET /catalogue/administration/produits/:id/inventaire` | `direction`, `comptoir` | `page`, `taille` | `{ inventaire, mouvements, page, taille, pages, total }`, newest movement first. |
| `POST /catalogue/administration/produits/:id/inventaire/mouvements` | `direction` | `{ type: "reception" | "correction", variation: non-zero integer, motif: trimmed 1..200 chars }` | Locks the product stock, rejects a resulting negative quantity, derives state, appends the movement, updates one aggregate snapshot, and returns the new inventory. |
| `PATCH /catalogue/administration/produits/:id/inventaire/statut` | `direction` | `{ statut: "rupture" | "reapprovisionnement" }` | Only permitted at quantity zero; `en_stock` is never manually writable. |

Remove `PATCH /catalogue/administration/produits/:id/stock` after its only known consumer,
`ProductsLocalInventoryPanel`, has moved to the audited endpoint. This is an internal authenticated
admin endpoint, not a public storefront contract.

The public catalogue product response gains `statutStock`; it retains derived `enStock` during the
consumer migration. It continues to return `description` and `ficheTechnique`, and does not reveal
`quantite_stock`. `CatalogueService.verifier()` adds `reapprovisionnement` to its refusal reasons
and checks a requested quantity against available quantity for its customer-visible precheck. The
transactional reservation remains the definitive check.

### Admin contracts (new or changed)

- Add `app/types/api/inventaire.ts` for `StatutStock`, `InventaireProduit`, paginated movement
  response, movement input, and initial stock input.
- Change `app/types/api/produits.ts` so list/detail responses require `statut_stock` and
  `quantite_stock`; detail embeds `inventaire`. Retain `en_stock` only as a deprecated read field
  until every component and external storefront consumer has moved.
- Add `fiche_technique: string | null` to `ProductDetail`. It is already returned by the backend.
- Split the current `ProduitInput` in `app/schemas/produit.ts` into explicit create and update
  payload types. Only the create type carries `quantite_stock_initiale`; both carry nullable
  `description` and `fiche_technique`.
- Add `fiche_technique` to the Zod schema as trimmed nullable text capped at 20,000 characters.
  Preserve `DESCRIPTION_MAX_LENGTH = 500` for the existing short description.
- Extend `apiQueryKeys.products` with an `inventory(id)` key. A successful stock mutation invalidates
  the product list, detail, inventory history, and overview statistics.

## States and transitions

| Event | Required starting condition | Quantity result | State result | Ledger result |
| :-- | :-- | :-- | :-- | :-- |
| Initial stock | New product or controlled cutover count | supplied non-negative baseline | `en_stock` if positive, otherwise `rupture` | `initialisation` |
| Reception | Any active inventory row | positive variation | `en_stock` | `reception` |
| Correction | Any active inventory row | signed variation that cannot produce negative stock | derived from new quantity; zero preserves/sets the selected zero-stock state | `correction` |
| Mark Restocking | quantity is zero | unchanged | `reapprovisionnement` | no quantity movement; journal the status decision |
| Clear Restocking | quantity is zero | unchanged | `rupture` | no quantity movement; journal the status decision |
| Confirm order | order is `soumise`; every aggregated product row has enough quantity and is `en_stock` | subtract each requested quantity | zero becomes `rupture` | one `commande_confirmee` movement per product, linked to the order transition |
| Reopen confirmed order | `confirmee -> soumise` | restore every active reservation | positive becomes `en_stock`; zero remains zero state | one `commande_liberee` movement reversing each reservation |
| Cancel confirmed order | reaches `annulee` after a reservation | restore every active reservation | positive becomes `en_stock`; zero remains zero state | one `commande_liberee` movement reversing each reservation |
| Refuse submitted order | `soumise -> refusee` | unchanged | unchanged | no movement, because no reservation exists |

`retire_le` remains a lifecycle state independent of availability. A withdrawn product is never
orderable even if it has positive stock. Restoring a withdrawn product does not invent availability:
it shows the durable stock state already held for that product.

## Async UI states

| Surface | Loading | Empty | Error | Read-only |
| :-- | :-- | :-- | :-- | :-- |
| Product list and badges | Existing list skeleton | Existing narrow `InlineStateNotice` | Existing narrow notice | n/a |
| Product inventory panel | Skeleton for inventory summary and history rows | `EmptyStateCard` for a saved product with no movements; status still remains visible | `ApiErrorCard` with retry; do not hide the last product detail | `comptoir` sees quantity, state, and history; every mutation control is absent |
| Adjustment dialog | Save button has `Spinner`, all its controls disabled | n/a | Inline `role="alert"`; preserve the entered variation and reason for retry | Not rendered |
| Restocking state action | State control disabled while pending | n/a | Inline alert and refreshed server state after retry | State visible, control absent |
| New product | Initial quantity starts at zero | n/a | Existing form validation/save error path | Direction-only product creation remains unchanged |
| Long description | Existing product-loading shell | Blank textarea is valid | Existing form invalid/save error path | Textarea disabled for `comptoir` |

## Phases

### Phase 1 — Establish durable inventory and migration safety (backend)

**What changes**: Create the inventory-state and append-only movement models, database constraints,
indexes, permissions, and service primitives. Refactor aggregate snapshots to use durable inventory
rather than the regenerated catalogue table.

**Where**:

- `NowTech-backend-/prisma/schema.prisma` — add `StatutStock`, `TypeMouvementStock`,
  `ProduitStock`, and `MouvementStock`; associate stock movements with `Commande` without linking
  to `nowtech.produits`.
- New `NowTech-backend-/prisma/migrations/<timestamp>_inventaire_produits/migration.sql` — create
  the tables, constraints, indexes, append-only privileges for `mouvements_stock`, and safe access
  for `nowtech_app`. Do not alter the generated `nowtech` schema from this migration.
- `NowTech-backend-/src/inventaire/inventaire.service.ts` — replace the current total/snapshot-only
  implementation with transaction-aware primitives to initialize stock, apply staff adjustments,
  change a zero-stock status, reserve an order's aggregated lines, and reverse a prior reservation.
  Lock products in ascending `produit_id` order, use guarded updates (`quantite >= requested`), and
  write movement plus state plus snapshot in one transaction.
- `NowTech-backend-/src/inventaire/inventaire.module.ts` — export any new service interface needed
  by catalogue and orders; preserve the module boundary rather than duplicating SQL in either
  service.
- `NowTech-backend-/src/inventaire/inventaire.service.spec.ts` — replace assertions tied to
  `nowtech.produits.quantite_stock` with durable-state behaviour.

**Done when**: a stock row with zero cannot become `en_stock`; an adjustment that would make stock
negative fails without either state or movement being written; a successful adjustment includes the
server-computed before/after values and actor; product ids remain valid after a catalogue schema
rebuild; `pnpm test`, `pnpm lint`, and `pnpm prisma:generer` pass in `NowTech-backend-`.

### Phase 2 — Project inventory and descriptions through catalogue APIs (backend)

**What changes**: Overlay durable stock data onto admin and public catalogue reads, retire the
legacy writable stock boolean/total fields, expose the new inventory endpoints, and surface the
existing long-description field in the admin response.

**Where**:

- `NowTech-backend-/src/catalogue/administration.dto.ts` — replace writable `en_stock` and generic
  update `quantite_stock` fields with create-only `quantite_stock_initiale`; add DTOs for signed
  adjustments and zero-stock state changes; extend `ListerProduitsDto.stock` with
  `reapprovisionnement`; leave description and `fiche_technique` validation as the two plain-text
  fields.
- `NowTech-backend-/src/catalogue/administration.controller.ts` — replace the local-only stock
  route with read history, append movement, and zero-stock state routes. Keep read routes for
  `direction` and `comptoir`; guard mutations with `direction` and derive the actor from the token.
- `NowTech-backend-/src/catalogue/administration.service.ts` — join `boutique.produit_stocks` in
  list/detail queries, filter by durable `statut_stock`, expose `fiche_technique`, initialize stock
  during product creation, and delegate all movement/state operations to `InventaireService`. Stop
  using the id-at-one-billion test as an inventory authorization boundary.
- `NowTech-backend-/src/catalogue/catalogue.service.ts` — return `statutStock` in public product
  projection, derive temporary `enStock`, and change `verifier()` to distinguish restocking from
  rupture and reject quantities greater than available. Do not return stock quantity publicly.
- `NowTech-backend-/src/catalogue/catalogue.module.ts` — retain the existing `InventaireModule`
  import; only adjust providers/exports if the refactor requires it.
- `NowTech-backend-/src/catalogue/administration.service.spec.ts` and new
  `NowTech-backend-/src/catalogue/catalogue.service.stock.spec.ts` — update fixture projections and
  add the inventory/description contract cases to the relevant catalogue specs.

**Done when**: list and detail always agree on quantity/state; admin saves no `en_stock` boolean;
a `comptoir` can read but receives 403 for stock mutation; a public restocking product shows its
state but is not commandable; existing `description` and `fiche_technique` round-trip as separate
short/long fields.

### Phase 3 — Make order reservation and release atomic (backend)

**What changes**: Move the definitive stock decision into order state transitions. Preserve the
current customer-facing precheck, but make every actual reservation or release transactional,
idempotent, and auditable.

**Where**:

- `NowTech-backend-/src/commandes/commandes.module.ts` — import `InventaireModule` directly or
  consume its export through `CatalogueModule`, choosing one injection path and avoiding a circular
  module dependency.
- `NowTech-backend-/src/commandes/commandes.service.ts` — in `confirmer()`, aggregate identical
  product ids, conditionally update the order from `soumise`, create the `CommandeTransition` and
  retain its id, then reserve via `InventaireService` using that id before committing frozen prices
  and the journal entry. A failed reservation rolls back the entire transaction and returns a
  conflict listing unavailable lines. In `poser()`, after its conditional state update has created
  the transition row, call the release primitive for `confirmee -> soumise` and for the transition
  that actually reaches `annulee`; do not release merely because cancellation was requested. Link
  each release to its original reservation so retries cannot create extra stock.
- `NowTech-backend-/src/commandes/commandes.service.spec.ts` — update confirmation and cancellation
  fixtures for the injected inventory service and assert the exact reserve/release boundary.
- `NowTech-backend-/src/commandes/machine-etats.spec.ts` — retain state-machine coverage and add a
  transition-to-inventory matrix assertion where it prevents a future transition from silently
  bypassing release logic.

**Done when**: two simultaneous confirmations competing for one unit produce exactly one confirmed
order and one reservation; re-sending or retrying a transition cannot double-reserve or
double-release; cancelling a confirmed order restores its original reservation once; refusing an
unconfirmed order creates no stock movement; the order's state, transitions, journal entry, stock
state, movement ledger, and aggregate snapshot commit or roll back together.

### Phase 4 — Add admin contracts, manual descriptions, and inventory workflows (Nuxt admin)

**What changes**: Replace the boolean stock switch and local-only card with audited inventory UI
for every saved product. Add the long-description field while retaining the existing short field.

**Where**:

- New `app/types/api/inventaire.ts` — client types matching the Phase 2 response/payloads, with a
  source citation to the backend files and lines after implementation.
- `app/types/api/produits.ts` — update list/detail fields, add `fiche_technique`, and retire
  component usage of writable `en_stock`.
- `app/schemas/produit.ts` — split create/update payload validation; add
  `quantite_stock_initiale` to create only and `fiche_technique` to both; preserve nullable trimmed
  short description semantics.
- `app/composables/useProductInventory.ts` — query inventory history for a saved product and expose
  direction-only mutations for adjustment and zero-stock state changes. Use `useApiFetch` for the
  read and `$csrfFetch` for writes; preserve returned API errors for display.
- `app/utils/api-query-keys.ts` — add `products.inventory(id)` and invalidate it, product detail,
  product list, and statistics after success.
- New `app/components/products/InventoryPanel.vue` — show current quantity/state, movement history,
  direction-only adjustment and restocking controls, and the specified wide async states.
- New `app/components/products/InventoryAdjustmentDialog.vue` — capture signed variation, movement
  type, and required reason. It must not optimistically calculate or render an authoritative final
  total; display the server-returned state after success.
- New `app/components/products/OverviewLongDescription.vue` — textarea, clear label, character
  counter, 20,000-character limit, and nullable empty value.
- `app/components/products/DetailForm.vue` — remove `isLocalProduct`, local stock handling,
  `values.en_stock`, and the legacy switch payload. Mount `ProductsInventoryPanel` for every saved
  product. Add create-mode initial quantity state and send it only to `useCreateProduit`; wire
  `fiche_technique` through derivation, dirty snapshots, validation error labels, and the create/
  update payload. Mount the long-description component below the short description.
- `app/components/products/OverviewDetails.vue` and
  `app/components/products/OverviewPricing.vue` — remove the `inStock` prop/emits and switch. Keep
  pricing focused solely on price fields.
- Delete `app/components/products/LocalInventoryPanel.vue` and remove `useSetLocalInventory()` from
  `app/composables/useProductCosts.ts` after no caller remains. Cost history stays unchanged.
- `app/utils/product-status.ts`, `app/components/products/{ListItem,HeroBanner,SummaryKpis}.vue`,
  and `app/components/taxonomy/CategoryProductCard.vue` — use `statut_stock` plus withdrawal
  precedence; add the restocking badge and tone without changing lifecycle semantics.
- `app/types/product-list.ts`, `app/components/products/{ListQuickFilters,ListPanel}.vue`,
  `app/stores/product-list.ts`, and `app/types/api/produits.ts` — add the Restocking quick filter
  and query value, keeping active filters restricted to non-withdrawn products.
- `i18n/locales/products/{fr,en}.json` — replace stock-local copy with inventory, movement,
  state, reason, restocking, and history messages; add concise short/long description labels and
  placeholders. Keep locale parity and remove only keys no longer referenced.

**Done when**: a direction user can receive or correct stock for an imported product, see the
resulting movement and state after reload, and mark a zero-quantity product Restocking; a comptoir
user sees the same information but no mutation control; a new product can start with a declared
baseline; the main product save no longer sends `en_stock`; short and long descriptions prefill,
trim, clear to `null`, save independently, and remain after reload.

### Phase 5 — Migrate consumers and cut over safely

**What changes**: Seed truthful opening quantities, deploy backend-first compatibility, update the
public storefront to show the new status and long description, then enforce durable stock for all
sellable products.

**Where**:

- New operational runbook `reports/2026-09-30-assessment-product-inventory-cutover.md` written
  during implementation, not this planning phase. It records the counted data source, the operator,
  reconciliation totals, the product ids intentionally excluded as withdrawn, deployment timestamps,
  and rollback conditions.
- `NowTech-backend-/prisma/migrations/<timestamp>_inventaire_produits/migration.sql` — schema only;
  it must not invent opening quantities from `en_stock = true`.
- A controlled deployment script or approved one-time SQL execution in `NowTech-backend-`, named
  before implementation, imports the signed opening stock count as `initialisation` movements. It
  must refuse duplicate baselines for the same product.
- The public storefront repository is not present in this workspace. Its owner must update the
  product-card, detail, cart, and checkout code to consume `statutStock`, render Restocking, block
  both zero-stock states, and render `ficheTechnique` as the long description. Record its exact
  paths and release commit in the implementation walkthrough before calling the feature complete.
- `server/api/v1/[...path].ts` — no change expected; manually verify the new JSON routes traverse
  the existing proxy with the current CSRF/session behavior.

**Done when**: every active sellable product has exactly one durable stock state and an opening
ledger record; no production checkout relies on the old boolean to admit an order; public cards and
detail pages display In stock, Out of stock, or Restocking correctly; a staged old storefront still
works on the derived `enStock` alias until its deployment is complete; a catalogue ingestion after
cutover leaves inventory rows and history intact.

### Phase 6 — Test and verify the complete behaviour

**What changes**: Add red tests before implementation, update fixtures that currently assume only a
boolean stock value, then run backend and admin gates against a backend containing the new API.

**Where**:

- `NowTech-backend-/src/inventaire/inventaire.service.spec.ts` — state invariant, signed adjustment,
  zero baseline, required reason, restocking state, immutable movement audit data, and actor tests.
- New `NowTech-backend-/test/inventaire-concurrence.spec.ts` — run against a disposable PostgreSQL
  database started by the existing `pnpm bd:demarrer` workflow. Confirming two orders for one unit
  must leave quantity zero with one reservation, not negative stock or two confirmed orders. Mocks
  cannot prove this database guarantee.
- `NowTech-backend-/src/commandes/commandes.service.spec.ts` — confirmation reserves once, price
  conflict reserves nothing, cancellation and confirmed-to-submitted release once, submitted refusal
  releases nothing, and a retry sees the existing transition/movement rather than writing another.
- `NowTech-backend-/src/catalogue/administration.service.spec.ts` and new
  `NowTech-backend-/src/catalogue/catalogue.service.stock.spec.ts` — admin/public projection,
  `reapprovisionnement` filter, public refusal reason, no quantity leak, long-description response,
  role enforcement, and post-ingestion durability fixtures.
- `test/unit/produit-schema.test.ts` — create accepts non-negative initial quantity; update rejects
  it; short and long descriptions accept null/omission and boundaries but reject oversize data.
- New `test/nuxt/product-inventory-panel.test.ts` — direction mutation paths, loading/empty/error
  states, restocking blocked above zero, server-error draft preservation, and read-only comptoir
  behaviour. Test semantics, not classes or snapshots.
- `test/nuxt/products-detail-form.test.ts` — remove obsolete stock-switch assertions; test create
  baseline payload only, no stock fields on patch, and short/long description round trips.
- `test/nuxt/products-list-panel.test.ts`, `test/nuxt/products-workspace.test.ts`,
  `test/nuxt/category-product-card.test.ts`, and taxonomy/product fixtures — add restocking status
  coverage and update typed product fixtures with the new stock contract.

**Done when**: the tester has first captured each relevant failure; `pnpm test` and `pnpm lint` pass
in `NowTech-backend-`; `bun run lint`, `bun run i18n:check`, `bun run typecheck`, `bunx vitest run`,
`bunx fallow`, and `bun run build` pass in this repository; manual QA verifies direction/comptoir
permissions, responsive inventory controls, customer checkout blocking, cancellation restoration,
and post-ingestion inventory persistence.

## Risks and controls

- **Opening quantities cannot be inferred from a boolean.** Treating every legacy `en_stock=true`
  product as quantity one would make inaccurate stock data authoritative. The cutover is blocked on
  a counted/imported opening balance for every active sellable product.
- **The current catalogue table is rebuilt.** A column migration or foreign key to `nowtech` would
  appear to work until the next ingestion erases it. The durable `boutique` model and post-ingestion
  test are mandatory safeguards.
- **Confirmation races are a financial and trust risk.** A preflight `SELECT` cannot reserve stock.
  Only guarded quantity updates in the same transaction as the state transition satisfy the rule.
- **Stock lock order can deadlock multi-line orders.** Aggregate repeated products and lock/update
  product ids in ascending numeric order. Retry only known transaction-serialization/deadlock errors
  with the existing request/transition idempotency protections, never a blind whole-request replay.
- **Reservation reversal can over-credit stock.** Store the original reservation reference and make
  the reversing reference unique. Never derive a release solely from the order's present status.
- **Inventory is not a substitute for returns inspection.** This release restores only confirmed
  reservations that are cancelled or reopened. A delivered customer return remains a manual,
  reasoned correction until a separate returns/quality workflow decides whether the item is sellable.
- **The public storefront is a separate deployment.** Derived `enStock` is a compatibility bridge,
  not the long-term contract. Remove it only after that repository has migrated and is released.
- **Long descriptions are public content.** Retain the existing plain-text rule; accepting HTML or
  adding rich text would create an XSS/sanitization product decision outside this scope.

## Open questions

1. **Opening-balance source and owner**: who supplies and signs off the initial count for every
   active sellable product? Recommendation: an operations-owned CSV or stocktake export reviewed by
   direction, imported once as `initialisation` movements, with reconciliation stored in the cutover
   report. This is a release blocker, not a UI detail.
2. **Partial fulfilment policy**: the schema has `quantite_remise` and line statuses, but no service
   currently mutates them. Recommendation: do not silently restock partial or returned lines in this
   feature. Before activating a line-level fulfilment flow, specify the exact transition that creates
   a release movement and whether returned goods pass inspection.
3. **Storefront implementation location**: which repository and team own the customer card/detail/
   cart/checkout consumers? Recommendation: identify it before Phase 5 and make its release part of
   the same rollout checklist; the backend compatibility field only prevents a deploy-order outage.

## Slug

`product-inventory-descriptions` — reused verbatim by the implementation walkthrough and review.
