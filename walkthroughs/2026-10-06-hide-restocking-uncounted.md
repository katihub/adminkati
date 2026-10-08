## What I built

`toggledRestockingStatus` now returns `null` for a product that was never counted (`modifie_le === null`), so
the Stock tab's "Mark as restocking" button no longer appears on it. The action bar already renders nothing
for `null`, so no component or translation changed. Done inline as one test-first loop (no sub-agents).

## Plan coverage

Plan: `plans/2026-10-06-hide-restocking-uncounted.md`.

| Plan item | Status | Where |
| :-- | :-- | :-- |
| `toggledRestockingStatus` returns `null` when `modifie_le === null` | Done | `app/utils/inventory-movement.ts:26-27` |
| New unit case for the uncounted product, `rupture` and `reapprovisionnement` | Done | `test/unit/inventory-movement.test.ts:33-36` |
| Spec helper moves to a counted default so existing cases keep their meaning | Done | `test/unit/inventory-movement.test.ts:5-12` |
| No component, i18n or composable change | Done (none made) | n/a |

## Deviations

None from the plan. One addition: a doc comment on the function explaining *why* an uncounted product is
excluded (the backend creates a permanent zero stock row on the first change), per the repo's
"explain why" rule.

## Tests

Red first, before touching the util:

```
bunx vitest run test/unit/inventory-movement.test.ts --coverage.enabled=false
 FAIL  restocking toggle > offers nothing for a product that was never counted, whatever the reported status
 AssertionError: expected 'reapprovisionnement' to be null
 Tests  1 failed | 5 passed (6)
```

Green after the change:

```
bunx vitest run test/unit/inventory-movement.test.ts test/nuxt/product-inventory-action-bar.test.ts \
  test/nuxt/products-overview-stock-indicator.test.ts test/nuxt/products-detail-form-stock-tab.test.ts \
  --coverage.enabled=false
 Test Files  4 passed (4)
      Tests  51 passed (51)
```

Gates on the two changed files: `bunx oxlint` exit 0; `bunx oxfmt --check` "All matched files use the correct
format"; `bunx fallow audit` "No issues in 201 changed files" (the scope is the whole branch, not just this
change).

`bun run typecheck` **exits 2 with one error, in `test/unit/ai-product-copy-service.test.ts`**. That is the
failure already recorded in `reports/2026-10-05-assessment-typecheck-failure.md`; the output contains no
mention of `inventory-movement` or any file I touched. Not fixed here.

Covered: the new rule, and that the existing rules (stock on hand, already in stock, not loaded) are
unchanged. Deliberately not covered: the action bar's rendering for an uncounted product; it renders nothing
for `null`, which the existing component case "offers no restocking control while stock remains" already
proves, and the component specs all use counted fixtures (`makeInventory` sets `modifie_le`).

I did not run the full suite, only the four specs that exercise this util or the screens that mount it.

## Not done

- The Stock tab still **displays** `rupture` for an uncounted product the catalogue treats as `en_stock`.
  That is a backend defect (`lireEtatStock`, `administration.service.ts:768-776`), listed as Phase 0 item 5
  of `plans/2026-10-06-decouple-stock-status.md`.
- The override feature itself (that plan) is untouched and still blocked on the backend contract.
- Committed locally on `feat/ai-integration`; not pushed.

## Notes for the reviewer

- **Assumption to check:** `modifie_le === null` means "no registry row". True by reading the backend
  (`lireEtatStock` returns `null` when `ligne` is missing; the detail projection nulls a missing stock
  timestamp), but not exercised against a running API.
- **Behaviour removed:** staff can no longer mark an uncounted `rupture` product as restocking. The user
  approved this on 2026-10-06.
- **Adjacent, left alone:** the "Mark as restocking" button is shown to `direction` only, so the extra guard
  changes nothing for other roles. The product list's status badge also reads the catalogue status, which is
  correct for uncounted products; only the Stock tab's inventory read is wrong.
