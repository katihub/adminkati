# Hide "mark restocking" on products that were never counted

Slug: `hide-restocking-uncounted`. Split out of `plans/2026-10-06-decouple-stock-status.md`
(Open question 1, answered by the user on 2026-10-06: proceed with the recommendation). Evidence:
`reports/2026-10-06-assessment-manual-product-stock-status-rerun.md`, findings 1 and 3.

## Why, and why separately

A product with no stock-registry row has no counted quantity. The admin API reports `modifie_le: null` for it.
Two backend facts make the "Mark as restocking" action dangerous on such a product:

- `PATCH .../inventaire/statut` first creates a zero registry row for it (`initialiserSiAbsent`,
  `administration.service.ts:746`), then applies the status. Registry rows can never be deleted, so the
  product becomes a counted-at-zero product for good and leaves the storefront.
- `GET .../inventaire` reports such a product as `rupture` with quantity 0 even when the catalogue (and the
  storefront) treat it as `en_stock` (`administration.service.ts:768-776`). The action bar reads that
  endpoint, so it offers "mark restocking" on a selling product.

Restocking is a tracked-inventory, zero-count state. An uncounted product has no inventory to restock, and
its status will come from the override planned in the main plan. Hiding the action needs **no backend
change**, so it ships now rather than waiting for that contract.

## Change

| | |
| :-- | :-- |
| **What** | `toggledRestockingStatus` returns `null` when `inventory.modifie_le === null`. The action bar already renders nothing when it returns `null`. |
| **Where** | `app/utils/inventory-movement.ts` (logic), `test/unit/inventory-movement.test.ts` (test, written first) |
| **Done when** | the new unit case passes, the existing cases still pass, and `bunx vitest run` on the unit file and `test/nuxt/product-inventory-action-bar.test.ts` is green. |

No component or i18n change. The count dialog (the pencil) stays, since counting is how a product starts
being tracked.

## Tests

One new case in the existing unit spec: an uncounted product offers nothing, for both `rupture` and
`reapprovisionnement`, at quantity 0. The spec's `inventory()` helper currently defaults `modifie_le` to
`null`, which models an *uncounted* product; it moves to a counted default so the existing cases keep their
meaning. The action-bar component spec already uses counted fixtures (`makeInventory` sets `modifie_le`) and
needs no change.

Not tested: the action bar rendering for the uncounted case. It renders nothing for a `null`, which the
existing "while stock remains" component case already proves.

## Risks and assumptions

- **Assumption:** `modifie_le === null` is exactly "no registry row". Verified in the backend:
  `lireEtatStock` returns `modifie_le: ligne ? ... : null` and the detail projection nulls it when the
  stock timestamp is missing. Not exercised against a running API.
- **Behaviour removed:** staff can no longer mark an uncounted `rupture` product as restocking from the
  Stock tab. Confirmed acceptable by the user. They can still count it.
- **Not fixed here:** the Stock tab still *displays* `rupture` for an uncounted selling product (backend
  defect, main plan Phase 0 item 5).
