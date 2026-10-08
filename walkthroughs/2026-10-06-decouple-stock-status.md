## What I built

Work on `plans/2026-10-06-decouple-stock-status.md`, in phases, on `feat/ai-integration` in both repositories.
(The backend commits were first made on a branch I created from `main`, `fix/etat-stock-inventaire-non-compte`;
that was not what the user meant by "the same branch of the backend". It was fast-forwarded into the backend's
`feat/ai-integration` and deleted; the commit hashes below are unchanged.) **All phases are done and committed,
nothing is pushed, and no pull request is open.** Phase 0 is the backend; Phases 1 to 3 are the admin (Phase 4
turned out to need no change).

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Phase 0: `lireEtatStock` agrees with the detail read for uncounted products | Done, separate walkthrough `2026-10-06-fix-uncounted-inventory-read.md` | backend `0ee3747` |
| Phase 0: table `boutique.produit_disponibilites`, additive migration, no foreign key, grants without `DELETE` | Done | `prisma/migrations/20261006120000_disponibilite_produits/migration.sql`, `prisma/schema.prisma` |
| Phase 0: `PATCH .../produits/:id/disponibilite`, direction only, journalled, no movement, never creates a stock row | Done | `administration.controller.ts` (`changerDisponibilite`), `administration.service.ts`, `inventaire.service.ts` (`changerDisponibilite`) |
| Phase 0: both availability predicates put the decision first | Done | `public/statut-stock.ts` (`statutStockSql`, `disponibiliteForceeSql`), `public/vitrine-catalogue.sql.ts` (`enStock`) |
| Phase 0: cart check ignores the quantity for a product forced in stock | Done | `public/catalogue.service.ts` (`verifier`) |
| Phase 0: reservation skips a forced-in-stock product and refuses a forced-out one | Done | `inventaire.service.ts` (`reserverCommande`) |
| Phase 0: creation counts a product only when a quantity is given; optional initial status | Done | `administration.service.ts` (`creerProduit`), `administration.dto.ts` (`CreerProduitDto`) |
| Phase 0: `inventaire.disponibilite_forcee` in the detail, `GET .../inventaire` and the `PATCH` response | Done | `administration.service.ts` (`lireProduit`, `lireEtatStock`) |
| Phase 1: type the decision (`disponibilite_forcee`) and `availabilityConflict` | Done | `app/types/api/inventaire.ts`, `app/utils/stock-availability.ts` (admin `b16eb50`) |
| Phase 2: mutation `useSetProductAvailability` | Done, in the same commit as Phase 3 | `app/composables/useProductInventory.ts` (admin `5d72da5`) |
| Phase 3: Track quantity switch, live status switch, conflict dialog, restocking guard | Done | `app/components/products/OverviewStockIndicator.vue`, `StockConflictDialog/StockConflictDialog.vue`, `app/utils/inventory-movement.ts` (`5d72da5`) |
| Phase 3: create form, quantity empty by default, initial status | Done | `OverviewInitialStock.vue`, `DetailForm.vue` (`createStockFields`), `app/schemas/produit.ts` (`5d72da5`) |
| Phase 3: English and French strings | Done | `i18n/locales/products/{en,fr}.json` (`5d72da5`) |
| Phase 4: the four `deriveProductStatus` call sites and the form signature | Not needed (see Deviations 1) | none |

Backend commits: `0ee3747` and `0624f94`. Nothing is pushed.

## Deviations

1. **No `disponibilite` field, no admin call-site swaps.** The plan added an effective `disponibilite` beside the
   physical `statut_stock`. Building it showed that the list, the detail, the filter, the counters and the
   Stock tab all read through `statutStockSql()`, so putting the decision there makes `statut_stock` itself the
   selling status. Only `inventaire.disponibilite_forcee` is added. This removes the four admin call-site
   changes and the form-signature change from the plan (Phase 4 is now "verify").
2. **The reservation reads the decisions in the transaction instead of checking inside the guarded `update`.**
   Reasoning is in the plan (item 3 of "Behaviour that must change"): a concurrent toggle just serialises
   after the confirmation. No test exercises the race, and none could against mocks.
3. **No actor column on the table.** The plan listed `modifie_le, acteur`; the journal already records the
   actor with the before and after, so the table keeps only `modifie_le`.
4. **A shared helper, `disponibiliteForceeSql`,** reads the decision for `statutStockSql`, `enStock`, the
   cart check and the admin reads, instead of four copies of the subselect. Not in the plan.
5. **Existing tests changed beyond adding new ones.** Three assertions hard-coded how the old predicate
   begins (`coalesce((select ps.statut…`, `coalesce(s.statut::text, case…`), one test extracted the search
   filter with a regex tied to that shape, and the creation test "initialises to zero when no quantity is
   given" asserted the behaviour this work removes. Each now names the shared predicate or checks behaviour,
   and the creation test says why it changed.
6. **A documentation paragraph** was added to the backend's deploy guide (`documents/travailler-et-deployer.md`,
   section 7). Not in the plan.

Admin phases:

7. **Phases 2 and 3 were committed together.** The repo's pre-commit `fallow audit` rejects a new export with no
   consumer, so the mutation and `ChangerDisponibiliteInput` could not land before the UI that uses them. The
   first attempt at Phase 1 was refused for exactly that (the input type) and the type moved to the later commit.
8. **"Track quantity" is derived, not stored.** On means "counted and no decision" (`modifie_le !== null` and
   `disponibilite_forcee === null`). Turning it off writes today's status as an explicit decision; turning it
   on hands the decision back. For an uncounted product the switch is disabled and the status switch always
   writes an explicit decision, never `null`, because clearing it would fall back to the legacy flag.
9. **Existing tests that asserted the old behaviour were rewritten**, not just extended:
   `never writes when the %s switch is clicked` (the status switch was read-only), `creates a product with an
   initial stock of 0 when the operator leaves it untouched`, and one assertion inside `renders the overview
   inputs empty in add mode` (the initial quantity was `"0"`, now empty).
10. **The confirm button is a plain `Button`, not `AlertDialogAction`,** following `points-of-sale/DeleteDialog.vue`:
    an auto-closing action could clear the pending change before the handler reads it. Dialog copy uses three
    explicit `t("...")` calls because `scripts/check-translation-keys.mjs` cannot verify keys built with a template
    string.
11. **The mark-as-restocking action is also hidden while a decision is in force** (it hides the physical state).
    This was in the plan as the forced-override condition; it is one extra clause in `toggledRestockingStatus`.

## Tests

Test first, per step, and each red run watched before the change:

- Predicates: 4 new cases failed (`donne la priorité à la décision…`, the alias case, the guard), then passed.
- Cart check: 1 new case failed (a forced-in-stock product refused for quantity), then passed.
- Inventory service: the suite did not compile (no `changerDisponibilite`), then 83 tests passed.
- Admin service, DTOs, controller, creation, detail: 23 failures before, all expected, then the suite passed.

Backend, after all changes:

```
npm test
Test Suites: 103 passed, 103 total
Tests:       2064 passed, 2064 total
npx tsc --noEmit -p tsconfig.json   (no errors)
```

The six database-backed suites ran this time because the local database is up. They create and drop their own
throwaway databases; the dev database counts were checked before and after (4 275 products, 2 002 stock rows,
4 048 movements) and are unchanged. `eslint` is not installed in the backend checkout, so it was not run.

**Live check on the local backend** (a locally signed dev token, the migration applied to the local database,
every change reverted afterwards):

| Step | Observed |
| :-- | :-- |
| Uncounted product, force `rupture` | `statut_stock: rupture`, `modifie_le: null`, **no stock row created**; public list 4 157 to 4 156; cart check `commandable: false, motif: rupture` |
| Clear the decision | back to `en_stock`, 4 157, `commandable: true` |
| Counted product (quantity 7), force `rupture` | hidden (4 156), cart check refused as `rupture`, count and its date unchanged |
| Same product, force `en_stock`, request 27 | `commandable: true`; cleared, the same request is `stock_insuffisant` again |
| `reapprovisionnement`, `{}` | HTTP 400 both |
| Journal | five `stock.disponibilite_modifiee` rows with the correct `de` and `vers`; `mouvements_stock` still 4 048 |

Not checked live against the running local backend: an order confirmation and the storefront
(`now-tech--website`). The reservation was first covered by unit tests against mocks only; it is now also
exercised end to end against a real throwaway PostgreSQL (see the follow-up below).

### Admin

Red first, each watched before the implementation:

- 11 failures on the four specs (`stock-availability` needed its module, then the indicator, create-form,
  restocking and schema cases), of which 9 were new and 2 were the pre-existing failures below.
- After the implementation: `bunx vitest run test/unit/produit-schema.test.ts test/unit/inventory-movement.test.ts
  test/unit/stock-availability.test.ts test/nuxt/products-overview-stock-indicator.test.ts
  test/nuxt/products-detail-form.test.ts test/nuxt/products-initial-stock-error.test.ts` gave `Tests 2 failed | 111
  passed (113)`, the two being the pre-existing ones.

Whole admin suite, `bunx vitest run --coverage.enabled=false`:

```
Tests  12 failed | 1971 passed (1983)
Test Files  6 failed | 226 passed (232)
```

All 12 are in six files that `reports/2026-10-05-assessment-vitest-failures.md` already lists
(`ai-product-copy-{api,client,schema,service}`, `overview-date-field`, `products-detail-form`). The two in
`products-detail-form.test.ts` (`renders the overview inputs empty/populated`) fail on
`products-detail-overview-source-url-input`, which no component renders; I did not touch that.

`bun run typecheck`: one error, `test/unit/ai-product-copy-service.test.ts(26,3)`, the known one
(`reports/2026-10-05-assessment-typecheck-failure.md`). `bun run i18n:check`, `bunx oxlint`, `oxfmt` and
`bunx fallow audit` are clean, and the commit hook passed.

**Live check in the real panel**, against the local backend, with a headless browser signed in as the dev
`direction` account:

| Step | Observed |
| :-- | :-- |
| Uncounted product (id 60252): the stock row | Track quantity off and disabled, In stock on, quantity `0` muted with "Not counted" |
| Click In stock | row badge turns red "Out of stock"; database `rupture`; **no stock row**; public total 4 157 to 4 156 |
| Click again | database `en_stock` (an explicit decision, not `NULL`); public total back to 4 157 |
| Counted product (id 1101, quantity 7) | Track quantity on, status follows the count |
| Track off | decision `en_stock`, no dialog |
| Click In stock off | warning "Hide a product that has stock?" quoting the count of 7; nothing written while it is open |
| Cancel | decision still `en_stock` |
| Click again, Confirm | decision `rupture`; public total 4 156 |
| Click In stock on (agrees with the count) | decision `en_stock`, no dialog |
| Track on (changes nothing) | decision `NULL`, no dialog |
| Create form | quantity empty with the "leave empty to sell without counting" hint; Status select defaulting to In stock |

Not checked live: submitting the create form (a created product cannot be deleted from the local data),
and the French strings in the browser. The create-form payloads are covered by the new specs.

## Not done

- Nothing is pushed and no pull request is open.
- No local product was found counted at quantity zero, so "force in stock at zero" was exercised as "force in
  stock above the count" instead (backend), and by a spec (admin dialog).
- Not built, as agreed: a quick status toggle on the product list rows, and a bulk status change.

## Notes for the reviewer

- **Local decision rows.** The local database holds rows for products 1101 and 60252 with a `NULL` decision
  (restored after the live checks) and one for **60172 ("NAS Ugreen DXP4800Plus") with an explicit `en_stock`**.
  The journal shows two writes on it three seconds apart, `NULL` to `rupture` then `rupture` to `en_stock`, at a
  time when the dev servers were also open in the user's own browser. I did not make that change deliberately
  and cannot tell whether a stray click of mine or the user's own testing caused it. Its effective state is
  unchanged (in stock), so I left it. Rows cannot be deleted by the application role by design.
- **The new migration was applied to the local development database** (`prisma migrate deploy`), and the Prisma
  client was regenerated, as part of working on the backend.
- **Reading cost:** the visibility predicate now evaluates one more correlated subselect per product on every
  public query (a primary-key lookup on a tiny table). Not measured.
- **Not examined:** whether anything outside `src/` (scripts, jobs) reads `produit_stocks` for availability. The
  backend source search showed none.

## Follow-up: forced Out of stock does not block orders already placed (backend `f5ecf66`)

A side agent's note pointed out that marking a product Out of stock could stop staff confirming orders customers
had already placed. The user chose option B: a forced Out of stock hides the product and refuses new carts, but an
order already placed stays confirmable.

- **My first estimate was wrong.** I called B "one branch removed from `reserverCommande`". `confirmer` also
  re-runs the cart check (`verifier`) before it reserves, and that check refused a forced-out product with the same
  409 (`Des références ne sont plus disponibles`), so removing the reservation refusal alone would not have
  delivered B. `verifier` gained `commandeDejaPassee`, passed by `confirmer`. The note also quoted "Stock
  insuffisant", but the message is that one, with each line marked `stock_insuffisant`.
- **What still refuses a placed order:** a `rupture` the direction did not decide (the count at zero, the catalogue
  flag), and a counted product whose quantity cannot cover the order. New carts, quotes and the public cart check
  keep refusing a forced-out product.
- **Changed in the backend:** `catalogue.service.ts` (`verifier`), `commandes.service.ts` (`confirmer`),
  `inventaire.service.ts` (`reserverCommande` reads only `en_stock` decisions), and the deploy-guide paragraph.
- **Changed in the admin:** the warning dialog said orders for a hidden product "will be refused"; it now says
  new orders are refused and orders already placed can still be confirmed (English and French).

Tests, red first for the unit cases (the cart-check spec did not compile without the option; the `confirmer`
assertion failed), then `npm test`: **103 suites, 2 073 tests pass**; `tsc` is clean.

**The reservation is now verified against a real database**, which closes the gap noted above. The throwaway
PostgreSQL suite (`test/inventaire-concurrence.spec.ts`, 34 tests) gained six cases: confirming an order placed
before the product was forced out (counted: reserves 2 of 5; never counted: no movement and no stock row), the count
that cannot cover the order still refusing, a product forced in stock at zero (cart accepts 5, confirmation
reserves nothing), the admin write reading back through the real status SQL with its journal rows, and the
decision surviving a catalogue schema rebuild. **Mutation check:** removing the option from `confirmer` makes the
two forced-out confirmation cases fail, so they do detect the regression. The suite's catalogue stand-in had to be
changed to forward all arguments to `verifier`, and the schema-swap steps were extracted into a helper shared with
the existing rebuild test.

Not checked: a confirmation through the running panel and local backend (it needs an order placed through the
storefront or the order API, which would leave permanent rows in the local data).

## Follow-up: Follow WooCommerce moves to the Stock tab, with a confirmation modal

A side agent's note pointed out that once staff set an uncounted product's status in the panel, nothing in the panel
could hand it back to WooCommerce. A reset on the Overview came first, then the user moved it: the button belongs on
the Stock tab, and clicking it must open a modal that explains the effect and asks for confirmation.

- **Where it shows.** `InventoryActionBar.vue` offers **Follow WooCommerce** beside Adjust stock, only for an uncounted
  product with a panel decision (`modifie_le === null` and `disponibilite_forcee !== null`). A counted product still
  hands the decision back through Track quantity (that path has its own warning), so it never shows the button.
- **The modal.** New `FollowCatalogueDialog` (an `AlertDialog`, plain `Button` confirm like `StockConflictDialog`). It
  names the status being given up ("set in the panel (Out of stock)"), says imports no longer change it, and says
  that following WooCommerce again uses WooCommerce's status now and after every import. Cancel sends nothing;
  Confirm closes the dialog and PATCHes `{ disponibilite_forcee: null }` through the existing
  `useSetProductAvailability`. A refusal shows in the bar's existing error line.
- **Overview.** The reset button, `canFollow`, `isPending` and the `follow` event are gone from `StockStatus` and
  `OverviewStockIndicator`. The source cue is now a badge on the Status header row (warning tone when the panel
  decides, outline otherwise), so staff read who is in control before the switch. At the user's request "Not
  counted" is a badge on the Quantity header row, mirroring it.
- **Fallow.** The bar's template went over the complexity threshold with the new button, so the restocking label and
  the two error lines became computeds; the two error `<p>` elements merged into the existing
  `product-inventory-status-error` one.
- **i18n.** `products.inventory.followCatalogue.{button,title,description,confirm}` in both locales; the unused
  `stockIndicator.followCatalogue` is removed.

Tests, red first (6 of the 8 new action-bar cases failed before the component existed; the two "not offered" cases
passed vacuously, which is expected for an absence check): the button is offered only for an uncounted product with a
decision; the modal names Out of stock and In stock; Cancel sends nothing and closes; Confirm sends
`{ disponibilite_forcee: null }` and closes; a refusal shows as an alert. The Overview spec dropped its reset
assertions and gained one for the Not counted badge. Final run of the stock specs plus `test/unit`: **1 156 pass,
9 fail**, all nine in the four `ai-product-copy-*` unit files already listed in
`reports/2026-10-05-assessment-vitest-failures.md`. `typecheck` shows only the known `ai-product-copy-service`
error, `bun run i18n:check` and `oxfmt --check` are clean, and `bunx fallow audit` reports no issues.

**Checked live** (headless browser, local backend):

| Product | State | Result |
| :-- | :-- | :-- |
| 60172 | uncounted, panel `en_stock` | button shown; modal text names "In stock"; Cancel left the row unchanged |
| 60252 | uncounted, no decision | no button; flipping Status wrote `rupture`; button appeared; modal named "Out of stock"; Confirm cleared the row to `NULL` and removed the button (row restored to its starting `NULL`) |
| 1101 | counted, tracking | "Follows the count" badge, status locked, no Follow button on the Stock tab |

Not checked: the French strings in the browser, the narrow-width layout of the two header badges, and the
`products-detail-form` cases that fail on the missing `source-url-input` (unchanged by this work).
