## What I built
The admin half of the product delivery interval (plan Phases 2, 3 and 4): types, Zod schemas, a pure label/sort/duplicate util, the query and mutation composables, and the UI. A new picker (`OverviewDelivery.vue`) sits under the price/stock block of the product overview, with a create/edit dialog and a manage dialog for edit, archive and restore. `DetailForm.vue` carries `delai_livraison_id` through values, dirty tracking and the save payload (picking the default sends `null`). Backend (Phase 1) was not touched. This walkthrough covers the admin phases only.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Types with backend citations | Done (citations filled from the coordinator's backend report, not re-read by me line by line) | `app/types/api/delais-livraison.ts`, `app/types/api/produits.ts` |
| Zod schema (unit enum, min>0, max>=min, ints, cap 999) | Done | `app/schemas/delai-livraison.ts` |
| Label formatter (i18n key + params), sort, duplicate check | Done | `app/utils/delivery-interval.ts` |
| `produitSchema.delai_livraison_id` | Done | `app/schemas/produit.ts` |
| `apiQueryKeys.deliveryIntervals` | Done | `app/utils/api-query-keys.ts` |
| List query composable | Done | `app/composables/useDeliveryIntervals.ts` |
| Mutations (create, update, archive, restore) | Done | `app/composables/useDeliveryIntervalMutations.ts` |
| Picker with Default badge, "+ Add option" footer, icon-only manage trigger | Done | `app/components/products/OverviewDelivery.vue` |
| Create/edit dialog, value fields locked with a hint when `utilise_par > 0` | Done | `app/components/products/DeliveryIntervalDialog.vue` |
| Manage dialog (edit/archive/restore, default not archivable) | Done | `DeliveryIntervalManageDialog.vue`, `DeliveryIntervalRow.vue` |
| Mount in `OverviewDetails.vue` | Done | `app/components/products/OverviewDetails.vue` |
| `DetailForm.vue` wiring | Done | `app/components/products/DetailForm.vue` |
| i18n en/fr incl. plural forms | Done | `i18n/locales/products/{en,fr}.json` (`products.delivery.*`) |
| `InlineStateNotice` on fetch failure; add/manage hidden and picker disabled when `!canWrite` | Done | `OverviewDelivery.vue` |

## Deviations
- **Mutation and query tests live in `test/nuxt/`, not `test/unit/`.** They need the Nuxt app for `$csrfFetch` and the query client. `test/nuxt/delivery-interval-mutations.test.ts`, `delivery-interval-query.test.ts`.
- **Mounted after the price block, not inside the stock row.** The stock switch lives in `OverviewPricing.vue`, not `OverviewDetails.vue`. `OverviewDelivery` is mounted in `OverviewDetails.vue` directly after `OverviewPricing`, i.e. immediately below the stock row.
- **Label normalisation added after the coordinator's message.** The backend stores the default as 30..4320 minutes (one unit per option). `deliveryIntervalLabel` folds a minutes bound into hours when it is >= 60 and divisible by 60, per bound, so the default reads "30 min – 72 h". A mixed range uses key `products.delivery.label.range.minutes_heures`. My original spec (single-unit labels only) was superseded; tests were updated.
- **Sort spec correction.** My spec claimed 10 jours ouvres sorts before 2 semaines. With the 7/5 weight they are equal (20160 minutes), so the tie-break (smaller `min_valeur`, then id) puts 2 semaines first. I corrected that test's expectation myself (`test/unit/delivery-interval.test.ts`). The backend uses the same weights.
- **Client-side sort kept.** The coordinator said to keep server order unless the plan util needs it. The plan mandates `sortDeliveryIntervals`; the picker and manage list use it. It matches the backend weights, so the order should agree; if the backend ever orders differently, drop the call in `OverviewDelivery.vue` and `DeliveryIntervalManageDialog.vue`.
- **The 999 cap is form-only.** The dialog preview and the "nothing changed, just close" path do not go through the schema, so an existing option above 999 (the default's 4320 minutes) still previews and can be opened/closed in the edit dialog.
- **`ProductDetail.delai_livraison_id` / `delai_livraison` are optional**, not required as the plan implied, so payloads from a backend without the feature still type-check and existing fixtures keep working.
- **Aria-label key.** `products.delivery.manageLabel` (string) is separate from the `products.delivery.manage` group to avoid an i18n key clash.
- **`deriveDeliveryValues`** is its own function in `DetailForm.vue` rather than a line in `deriveScalarValues`, to stay under fallow's CRAP threshold.
- **`DeliveryIntervalRow.vue`** (not in the plan) was extracted from the manage dialog for fallow's cognitive-complexity limit and the lean-component rule.
- **Comment style.** New code comments are English, per the repo rule.

## Tests
Tests were authored by the tester subagent first (red), then I implemented. Commands and output actually watched:

- Final full run: `bunx vitest run` -> `Test Files  5 failed | 166 passed (171)`, `Tests  6 failed | 1159 passed (1165)`. All 6 failures are image/IPX tests in files this change does not touch: `banner-artwork-preview`, `banner-card`, `banner-panel-artwork`, `products-image-rendering` (x2), `products-local-preview` ("expected ... to contain '/_ipx/'"). An earlier full run also showed `operations-page.test.ts` timing out at 5000 ms once; it passed on the next run. I did not run these against a clean baseline, so "pre-existing" is my inference, not something I verified.
- Delivery specs (all green in the final run): `test/unit/delivery-interval.test.ts`, `delai-livraison-schema.test.ts`, `produit-schema.test.ts`, `api-query-keys.test.ts`, `test/nuxt/delivery-interval-mutations.test.ts`, `delivery-interval-query.test.ts`, `products-delivery-picker.test.ts`, `products-delivery-dialog.test.ts`, `products-delivery-manage.test.ts`, `products-detail-form.test.ts` (delivery block). The tester reported 107 tests passing across five of those files before my final refactors; the final full run above includes them.
- `bun run lint` exit 0. `bun run typecheck` exit 0. `bun run i18n:check` exit 0. `bun run fallow` exit 0 ("No issues in 162 changed files"). `bunx fallow` (the unfiltered scan) reports pre-existing repo-wide health targets that this change does not add; only the changed-files gate `bun run fallow` is clean.
- Not covered: label markup and class names, the BFF pass-through (existing `api-proxy` tests), real backend behaviour (Phase 5 manual pass not done).

## Not done
- **Phase 5** (manual end-to-end against a deployed backend) was not run.
- No commit was made, per instructions.
- The picker does not offer a "make default" action (plan Open question 1: not in this phase).

## Notes for the reviewer
- **Unexplained deletions in the working tree.** `git status` shows about 170 tracked files deleted under `plans/`, `reviews/` and `walkthroughs/` (older dated artifacts). The initial status at session start showed only the untracked plan, so something removed them during the session. It was not this change (I only ran eslint, vitest, typecheck and fallow, and edited the files listed above). I did not restore them. Check before committing: `git checkout -- plans reviews walkthroughs` restores them if the deletion was not intended.
- Plan file `plans/2026-09-30-product-delivery-interval.md` is untracked and untouched.
- The duplicate check treats archived options as duplicates (matching the backend 409) and tells the operator to restore instead of creating.
- Editing an in-use option shows the locked hint and disables save; the only useful action on it is archive from the manage list.
- Existing detail-form tests do not stub the delivery GET; the picker just sits in its error state there. They pass, but it is a possible flake source.
- The `sortDeliveryIntervals` client sort and the backend's own ordering must stay in agreement (same weights today).

---

## Backend (Phase 1) — `NowTech-backend-`, branch `feat/product-delivery`, uncommitted

Implemented by a separate implementer run; results below are that run's reported output, with the
citations re-checked against the code by the orchestrating session.

**Built:** Prisma models and migration `20260930090000_delais_livraison` (options table, assignment
table keyed by `produit_id` with no FK to `nowtech.produits`, six seeded options, partial unique
index on `est_defaut`, unique index on `(min, COALESCE(max, 0), unite)`, bounds checks, grants to
`nowtech_app`); `src/delais-livraison/` module; `GET/POST/PATCH catalogue/administration/delais-livraison`
(`administration.controller.ts:79,90,103`); `delai_livraison_id` on `ModifierProduitDto`
(`administration.dto.ts:141`); admin product read/write returns `delai_livraison_id` and resolved
`delai_livraison` (`administration.service.ts:77-78`); public `lireProduit(slug)` returns the
resolved option. Writes are `direction`-only, list is `direction` + `comptoir`, all writes are
journaled (`delai_livraison.cree|modifie|affecte`).

**Watched results:** three new suites, 74 tests, all pass. Full `pnpm test`: 11 failed / 286 passed,
identical failing names to the pre-change baseline (10 in `administration.service.spec.ts`, plus
`main.spec.ts` worker crash). `npx tsc --noEmit` clean; `prisma validate` and `prisma generate` pass.
The migration SQL was run inside `BEGIN … ROLLBACK` against the local Postgres container: seed,
single-default index, duplicate index and `max < min` check all behaved as intended.

**Deviations from the plan**
1. Default seed is `{30, 4320, "minutes"}`: an option has one unit, so "30 min – 72 h" cannot be
   stored otherwise. The admin formatter normalizes it for display; the 999 cap is form-input only.
2. Seed has no explicit ids; the default is the lowest id.
3. `creerProduit` / `modifierProduit` gained an optional trailing `appelant` argument so the journal
   can record the token's member id.
4. `AdministrationCatalogueService` takes `DelaisLivraisonService` as an `@Optional()` fourth
   constructor argument to keep existing spec constructions compiling.
5. `resoudre` issues one extra count query so the detail carries `utilise_par`.

**Not done / limits**
- `pnpm lint` cannot run in the backend (`eslint: command not found`, not in devDependencies): pre-existing.
- Migration not applied by Prisma (`migrate deploy` not run); only exercised in a rolled-back transaction.
- Product write and assignment are not one atomic unit (the existing product update is not
  transactional); a bad option id is rejected before any product write.
- The "in use" immutability check is not locked against concurrent requests.
- `prisma migrate dev` may report the two hand-written indexes as drift.
- Product-id stability across ingestion is unconfirmed (same accepted risk as `product_costs`).

## Phase 5 status
Not done: no manual end-to-end pass against a running backend + admin yet.
