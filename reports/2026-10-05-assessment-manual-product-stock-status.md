# Manual product stock-status capability assessment

## Question

Does `NowTech-backend-` currently let staff directly toggle a product between **in stock** and **out of stock**, independently of its counted quantity? If not, how should that capability be added safely?

## Method and scope limits

Read the backend checkout at `/Users/michaelnji/Projects/nvc/NowTech-backend-`, branch `feat/ai-integration`, commit `3ff1e5467fbc97019584ca06768d159c86ee00f5`. Inspected the inventory migration, Prisma schema, admin DTO/controller/service, inventory and order-reservation services, storefront availability queries, and their focused unit specifications. Also inspected the corresponding admin API types, mutation composable, UI controls, and translations.

**Not examined:** a live API or production database, deployed storefront behaviour outside this repository, migration execution, or concurrent requests against a real PostgreSQL instance. No source code or tests were changed, and no test suite was run for this read-only assessment.

## Findings

### The requested direct toggle is not supported today

There is one related endpoint:

```http
PATCH /v1/catalogue/administration/produits/:id/inventaire/statut
{ "statut": "rupture" | "reapprovisionnement" }
```

It is restricted to `direction` and is deliberately a **zero-quantity-only** decision:

- `ChangerStatutStockDto` accepts only `rupture` and `reapprovisionnement`; it rejects `en_stock` (`src/catalogue/administration.dto.ts:232-236`, `administration.inventaire.spec.ts:136-143`).
- The controller documents and exposes that endpoint as a zero-stock operation (`src/catalogue/administration.controller.ts:319-330`).
- `InventaireService.changerStatutZero()` locks the inventory row and returns HTTP 409 when quantity is not zero (`src/inventaire/inventaire.service.ts:364-388`). Its specification verifies that a positive-quantity product cannot be marked out of stock (`inventaire.service.spec.ts:392-401`).

Consequently, staff can distinguish **out of stock** from **restocking** at quantity zero, but cannot:

1. mark a product out of stock while retaining a positive physical quantity;
2. mark a zero-quantity product in stock; or
3. toggle either status without the quantity rule being involved.

### This restriction is enforced in the database and throughout stock writes

The durable inventory row has a database constraint: `en_stock` is true exactly when `quantite > 0`; both `rupture` and `reapprovisionnement` are valid only at zero (`prisma/migrations/20260930100000_inventaire_produits/migration.sql:16-27`). The Prisma model represents that same single `quantite` + `statut` state (`prisma/schema.prisma:138-169`).

The application also derives the status whenever a quantity changes:

- creation maps a positive opening count to `en_stock` and zero to `rupture` (`inventaire.service.ts:175-202`);
- adjustments map every positive resulting count to `en_stock`; reaching zero from a positive count maps to `rupture` (`inventaire.service.ts:327-361`);
- confirmed orders require `statut = 'en_stock'` and enough quantity, then set `rupture` when the count reaches zero (`inventaire.service.ts:431-470`);
- releasing a reservation restores `en_stock` (`inventaire.service.ts:491-517`).

The ordinary product PATCH cannot be used as a bypass: `en_stock` and `quantite_stock` are excluded from the writable-column allowlist and rejected by validation (`src/catalogue/administration.dto.ts:47-70`, `administration.inventaire.spec.ts:41-55`). The legacy `nowtech.produits.en_stock` field is only a fallback for products with no durable inventory row; once a row exists, storefront visibility follows `boutique.produit_stocks` (`src/catalogue/vitrine-catalogue.sql.ts:31-40,54-57`). It is not a safe or supported manual-availability control.

### Availability is coupled to several customer-facing decisions

The status is not merely a badge:

- storefront listing, search, counts, and product visibility share `produitVisible()`, which tests effective `enStock()` (`vitrine-catalogue.sql.ts:38-65`);
- cart validation rejects `rupture` and `reapprovisionnement`, then compares requested units to the physical count (`catalogue.service.ts:272-352`);
- final order confirmation performs the guarded inventory update shown above, rather than trusting the cart pre-check (`inventaire.service.ts:431-470`).

Changing only the admin response or only a display switch would therefore create an inconsistent system: a product could look available but be rejected at confirmation, or look unavailable while remaining purchasable.

The admin reflects the intended constraint. Its overview switch is disabled and only mirrors whether the inventory status is `en_stock` (`app/components/products/OverviewStockIndicator.vue:17-50`); its only status mutation alternates `rupture` and `reapprovisionnement` when quantity is exactly zero (`app/utils/inventory-movement.ts:16-25`, `app/components/products/InventoryActionBar.vue:15-46`).

## Recommendation

**Do not weaken or repurpose `ProduitStock.statut` for this feature.** It is the physical-inventory state that protects the append-only movement ledger and order-reservation rules. Dropping its constraint or allowing `en_stock` at zero would make a product appear purchasable while the guarded reservation still fails. Allowing `rupture` at a positive quantity without changing subsequent adjustment and release logic would also make a manual decision disappear on the next quantity movement.

Instead, introduce an explicit and separately persisted **selling-availability mode**. The recommended semantic model is:

| Mode | Availability source | Quantity / ledger behaviour |
|---|---|---|
| `suivi` (default) | Current durable inventory status | Existing count, movements, and reservations remain authoritative. |
| `manuel` | Direct staff choice: `en_stock` or `rupture` | Quantity is retained as physical information but does not decide sale availability. A manual in-stock product must not be quantity-reserved. |

This satisfies a truly amount-independent toggle without corrupting counted inventory. `reapprovisionnement` remains a tracked-inventory, zero-count state; it is not needed in manual mode.

### Proposed implementation shape

1. **Make the business policy explicit first.** Confirm that manual `en_stock` means “sell without quantity reservation.” If instead it only means “show the product as available,” the backend must still reject a zero-count checkout and the UI must say so; that would not be a full in-stock toggle.
2. **Add a durable availability projection outside the regenerated catalogue schema.** Add a `boutique` table keyed by `produit_id` (for example `produit_disponibilites`) with `mode` (`suivi` / `manuel`), an optional manual `statut`, timestamps, and optionally the last actor/reason. No row should mean the safe default, `suivi`. Keeping this separate leaves `ProduitStock` and its quantity/status check unchanged.
3. **Add a direction-only, audited mutation.** A dedicated endpoint such as `PATCH /v1/catalogue/administration/produits/:id/disponibilite` should validate the mode and manual status, derive the actor from the authenticated token, transactionally upsert the availability row, write a `stock.disponibilite_modifie` journal entry, revalidate the product, and refresh storefront state. It must not write a stock movement because it does not change physical units.
4. **Create one effective-availability resolver and use it everywhere.** Update the shared SQL helper used by storefront visibility (`enStock()` / `produitVisible()`), admin list/detail projections, public product responses, cart validation, and final reservation. In manual mode: manual `rupture` always blocks visibility and checkout; manual `en_stock` bypasses a physical reservation. In tracked mode: preserve the current quantity-backed rules exactly.
5. **Expose separate concepts to the admin.** Keep `quantite_stock` and physical `statut_stock` for inventory staff; add `mode_disponibilite` and effective `disponibilite` for the selling toggle. Do not relabel a positive-count-but-manually-hidden product as physically in rupture. Replace the disabled overview indicator with a direction-only availability control and show the selected mode clearly.
6. **Test the two boundaries, not only the endpoint.** Cover DTO/role validation, the migration’s default, mode transitions, public visibility, cart verification, final reservation under both modes, and simultaneous manual-out / order-confirmation requests. The final reservation check must be authoritative under the same transaction/lock strategy as the availability change.

### Smaller alternative if the real need is only “hide despite stock”

If staff never need a zero-count item to be orderable, a simpler one-way `force_out_of_stock` override can sit beside tracked inventory. It blocks visibility and ordering while preserving the count; clearing it returns to count-derived availability. This is less work, but it does **not** implement a direct, amount-independent “in stock” state and should not be described as one.

## Conclusion

The backend supports a narrow zero-count **out-of-stock/restocking** toggle, not a general in-stock/out-of-stock override. The requested capability is feasible, but needs a new availability domain and coordinated changes to storefront visibility, cart validation, and order reservation. The recommended `suivi` / `manuel` model preserves the current inventory guarantees while allowing a genuine direct toggle.
