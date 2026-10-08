## What I built
Behaviour-preserving extractions that clear the 11 "introduced" complexity findings behind the `bunx fallow audit` pre-commit gate. Each piece moved into a small pure function in `app/utils/` (or the composable) with a direct unit test; call sites are thin wrappers. No suppressions, no config changes.

## Plan coverage
Before metrics come from the live audit at the start of the task; "after" means the function no longer appears in `bunx fallow audit --format json` (only 6 inherited findings remain, none in touched code). I did not re-measure exact post-extraction cyclomatic numbers; the targets below are from reading the code.

| # | Finding (before) | Status | Where (after) |
| :-- | :-- | :-- | :-- |
| 1 | `StockImportDialog.vue` `<template>` cog 16 / cc 11 | Done | `stage` computed in `app/composables/useStockImportRun.ts`; derivation in `app/utils/stock-import-stage.ts` (table lookup, cc 3); dialog v-if chain flat on `runner.stage.value` |
| 2 | `stock-import-files.test.ts` `parse` cog 16 / cc 12 | Done | regex + `matchAll` tokenizer plus `unquote` helper, `test/unit/stock-import-files.test.ts:27` |
| 3a | `InventoryActorPill.vue` `name` cc 6, CRAP 42 | Done | `resolveActor` in `app/utils/inventory-actor.ts` |
| 3b | `InventoryActorPill.vue` `email` cc 6, CRAP 42 | Done | same util |
| 4 | `useHistoryValueFormatter.ts` arrow cc 5, CRAP 30 | Done | `isEmptyValue` in `app/utils/empty-value.ts` |
| 5 | `OverviewDelivery.vue` `selected` cc 5, CRAP 30 | Done | `resolveSelectedInterval` appended to `app/utils/delivery-interval.ts` |
| 6 | `InventoryActionBar.vue` `nextRestockingStatus` cc 5, CRAP 30 | Done | `toggledRestockingStatus` in `app/utils/inventory-movement.ts` (lookup table; computed kept as wrapper) |
| 7 | `DetailForm.vue` `deriveDescriptionValues` cc 5, CRAP 30 | Done | all seven `derive*Values` (+ `versDateDeChamp`) moved to `app/utils/product-form-values.ts` |
| 8 | `DeliveryIntervalDialog.vue` watch arrow cc 9, CRAP 90 | Done | `initialDraft` in `app/utils/delivery-draft.ts` |
| 9 | `DeliveryIntervalDialog.vue` `validate` cc 7, CRAP 56 | Done | `checkDeliveryDraft` (+ `duplicateErrorKey`) in `app/utils/delivery-draft.ts`; `validate` now writes the message from the returned i18n key |
| 10 | `delivery-fixture.ts` `fillDialog` cc 5, CRAP 30 | Done | table-driven loop, `test/nuxt/delivery-fixture.ts` |

New files: `app/utils/{stock-import-stage,inventory-actor,empty-value,delivery-draft,product-form-values}.ts`; tests `test/unit/{stock-import-stage,inventory-actor,empty-value,inventory-movement,delivery-draft,product-form-values}.test.ts`; `delivery-interval.test.ts` extended.

## Deviations
- I did not delegate test writing to the tester subagent: these are pure refactors of already-covered behaviour, and the unit tests were written alongside the extractions. The existing nuxt specs remain the behavioural oracle.
- `delivery-draft.ts` imports its schema and `findDuplicateInterval` by relative path: the `test/unit` (node) project has no `@` alias, so an `@/` runtime import cannot be loaded there.
- `deriveCategoryValues`, `deriveListValues`, `derivePromoValues` moved too (not flagged) to keep the group in one file. Their narrowed `Pick<ProductDetail, ...>` parameter types are the only signature change.
- Dialog template uses `runner.preview.value!` / `result.value!` / `failure.value!`: `stage` guarantees presence but TypeScript cannot see that.
- `toggledRestockingStatus` and `resolveActor` restructure the conditionals to lower cyclomatic complexity. Equivalence relies on `TeamMember.courriel` being a non-null string and on `session.nom` being a string.

## Tests
- `bunx fallow audit`: exit 0, "No issues in 722 changed files", 6 inherited findings excluded (AddressList, CustomerInfo, productImageUrl, DatasheetUploadDialog `choisir`, `perimetre`, ImageGallery `removeImage`). Plain run, no coverage flag.
- `bunx vitest run --coverage.enabled=false test/unit/stock-import test/unit/inventory test/unit/empty-value test/unit/delivery test/unit/product-form-values test/unit/delai`: 11 files, 158 tests passed.
- `bunx vitest run --coverage.enabled=false test/nuxt/stock-import test/nuxt/product-inventory test/nuxt/products-delivery test/nuxt/products-detail-form test/nuxt/products-history-entry test/nuxt/products-overview test/nuxt/products-initial-stock-error`: 17 files passed, 2 failed (286 passed, 2 failed). Both failures assert `product-delivery-default-badge` inside the trigger (`products-delivery-picker.test.ts:54`, `products-detail-form.test.ts:986`). That badge was removed by the user's uncommitted edit to `OverviewDelivery.vue`, which I preserved; those two specs now need updating to match. I did not edit them.
- `bun run typecheck` exit 0; `bun run lint` exit 0 (2 existing warnings, neither in touched files); `bun run i18n:check` exit 0; `bunx oxfmt --check` on all touched files clean; `git diff --check` clean.
- Not covered: `fillDialog` and the `parse` helper are test code with no tests of their own (exercised by the specs that use them). The full suite was not run.

## Not done
- The two stale badge assertions above, left for the owner of the `OverviewDelivery.vue` edit.
- The 6 inherited findings, as instructed.

## Notes for the reviewer
- `DetailForm.vue` and other files were reformatted only where oxfmt touched them; diffs are small. `OverviewDetails.vue` untouched.
- Please check the `parse` tokenizer: an empty string input differs from the old loop (this returns one empty row); no caller passes one.
