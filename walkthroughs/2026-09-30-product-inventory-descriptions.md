## What I built
Phase 1 only (backend, `/Users/michaelnji/Projects/nvc/NowTech-backend-`): durable per-product stock and an append-only movement ledger in the Prisma-owned `boutique` schema, a migration with database-level invariants and privileges, and a transaction-aware `InventaireService`. Phases 2 to 6 are not started. This walkthrough will be extended as later phases land.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Prisma `StatutStock`, `TypeMouvementStock`, `ProduitStock`, `MouvementStock`, relation fields on `Commande` and `CommandeTransition` | Done | `prisma/schema.prisma` (enums and models before `EtatIdempotence`; one relation line each in `Commande` and `CommandeTransition`) |
| Migration with CHECK constraints, self-FK, indexes, no FK to `nowtech.produits` | Done | `prisma/migrations/20260930100000_inventaire_produits/migration.sql` |
| Append-only privileges on `mouvements_stock`, grants for `nowtech_app` | Done | same file, last block |
| Initialize stock | Done | `InventaireService.initialiserStock` |
| Staff signed adjustment (reception/correction, motif required, row lock, server-computed before/after, reject negative) | Done | `appliquerAjustement`, `verrouiller` |
| Zero-stock status change, decision journaled | Done | `changerStatutZero` (journal action `stock.statut_modifie`) |
| Reserve aggregated lines, ascending id order, guarded updates | Done | `reserverCommande` |
| Reverse a prior reservation exactly once, no-op if none | Done | `libererCommande` |
| Totals from durable inventory; snapshot only after a successful stock transaction | Done | `total`, `ajuster` |
| `inventaire.module.ts` export changes | Not needed | The module already exports `InventaireService`; `JournalService` is provided by the app-level module, so the module file is unchanged |
| Spec replaced with durable-state behaviour | Done | `src/inventaire/inventaire.service.spec.ts` (40 cases, authored by the tester subagent) |

## Deviations
- **Branch**: the task said to work on `feat/prod-stock-mgt`, but no such branch exists in the backend. It has `development`, `feat/product-delivery`, `main` and remote branches. I did not switch or create branches, so all changes are uncommitted on `development`. The owner needs to create or choose the branch before committing.
- **Extra CHECK constraints** beyond the plan's list, all in the migration: `quantite_apres = quantite_avant + variation`; sign per type (reception and release positive, confirmation negative, initialisation non-negative from a zero baseline); order movements require both `commande_id` and `transition_commande_id`; `annule_mouvement_id` is set exactly for `commande_liberee`; reception/correction require a non-blank `motif`. They harden the ledger at the database, not only in TypeScript.
- **Reserve uses no separate `SELECT ... FOR UPDATE`**: each product is a single guarded `UPDATE ... WHERE quantite >= n AND statut = 'en_stock' RETURNING`, which takes the row lock itself. Ascending-id ordering is kept to avoid deadlocks. `appliquerAjustement` and `changerStatutZero` do use an explicit `FOR UPDATE`.
- **Snapshot placement**: primitives do not snapshot; the transactional wrapper `ajuster()` does, and callers of the order primitives (Phase 3) must call `enregistrerSnapshotDansTransaction` once per order. There is no wrapper for `changerStatutZero` because it does not change totals.
- PostgreSQL enum type names are `statut_stock` and `type_mouvement_stock`, following the `delai_unite` precedent.
- **Process breach (TDD)**: I wrote schema, migration and service while the tester was still writing the spec, so the tester never observed a red run against an empty implementation. I reconstructed the red step afterwards: the final spec was copied into a clean `git worktree` at `HEAD` and failed to compile (`Expected 1 arguments, but got 2`, `Property 'initialiserStock' does not exist on type 'InventaireService'`, 0 tests run). The spec was written from the specification, not from my code, but the honest order was not followed.
- `prisma format` was run and then reverted, because it re-aligned the whole file; the final schema diff is 67 added lines only.

## Tests
- `pnpm test -- src/inventaire`: 1 suite, 41 passed. (The tester reported 40 cases; the spec was possibly amended after its report. The 41 is my own run's output.)
- Same spec against the original `HEAD` service in a clean worktree: suite fails to compile, 0 tests run (red).
- `pnpm test` (full): 2 suites failed, 27 passed; 11 tests failed, 327 passed. **The identical 11 failures occur on a clean `HEAD` worktree** (`src/catalogue/administration.service.spec.ts`, 11 tests, and `src/main.spec.ts`, `app.set is not a function`), so they are pre-existing and unrelated.
- `pnpm prisma:generer`: succeeded. `prisma validate`: schema valid.
- `pnpm lint`: **cannot run**: `sh: eslint: command not found` (eslint is not a dependency and there is no config in the backend). Pre-existing. `./node_modules/.bin/tsc --noEmit` is clean (exit 0) as a substitute.
- Migration verified on a throwaway database `scratch_inv` (created in the running dev container and dropped afterwards, dev DB untouched): all 14 migrations applied via `prisma migrate deploy`; inserts violating the status/quantity, negative-quantity and zero-variation/motif rules were rejected; `nowtech_app` has only SELECT and INSERT on `mouvements_stock`, and no UPDATE or TRUNCATE. `prisma migrate diff` against the schema shows only a pre-existing unrelated `DROP TABLE "sales_goals"`.
- Not covered: the concurrency guarantee (two confirmations for one unit) needs a real database; that is `test/inventaire-concurrence.spec.ts` in Phase 6. The service tests use mocks and cannot prove row-locking.

## Not done
- Phases 2 to 6 (catalogue projections, order integration, admin UI, cutover, concurrency test).
- The consumers of the old `nowtech.produits.quantite_stock` (`AdministrationCatalogueService.modifierQuantiteLocale`, list/detail queries) are untouched and still read and write the transient column; `total()` now reads durable stock, which is empty until an opening count is imported, so the dashboard total will read 0 until Phase 5 seeds it.

## Notes for the reviewer
- `total()` reading an empty durable table changes the reported stock metric to 0 on any environment where this migration runs before the cutover import. Confirm that ordering is acceptable, or gate the metric until Phase 5.
- `reserverCommande` sets `statut = 'rupture'` when quantity reaches zero via a raw `CASE`; `libererCommande` always sets `en_stock` because a released quantity is positive. Both rely on the `produit_stocks_statut_check` as a backstop.
- A concurrent second release of the same reservation fails on the unique `annule_mouvement_id` and aborts that transaction (intended: exactly once).
- `initialiserStock` maps Prisma `P2002` to a conflict; `appliquerAjustement` motif is trimmed before storing.
- Untracked `pnpm-workspace.yaml` appeared in the admin worktree root from a stray tester `pnpm test` run there; it should be deleted by the user (a delete was denied to the tester and I did not retry).
- Existing lint noise: the shell prints a harmless `_zshz_realpath` error on every command.

---

# Phase 2 — Project inventory and descriptions through catalogue APIs (backend)

## What I built
The admin and public catalogue now read stock from the durable `boutique.produit_stocks` (left join, missing row reads as 0 / `rupture`), expose `quantite_stock`, `statut_stock`, an embedded `inventaire` and the derived legacy `en_stock`, and delegate every stock write to `InventaireService`. The old total-overwrite route is gone, replaced by an audited history read, a signed-movement route and a zero-stock status route. Branch verified as `feat/prod-stock-mgt` (Phase 1 note about a missing branch no longer applies); nothing committed. Work in `/Users/michaelnji/Projects/nvc/NowTech-backend-`.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Remove writable `en_stock` and generic `quantite_stock` from create/update DTOs and `COLONNES_MODIFIABLES` | Done | `src/catalogue/administration.dto.ts` |
| Create-only `quantite_stock_initiale` | Done | `CreerProduitDto` |
| `AjusterStockDto` (type, non-zero int variation, trimmed motif 1..200), `ChangerStatutStockDto`, `ListerMouvementsDto` | Done | `administration.dto.ts` |
| `ListerProduitsDto.stock` accepts `reapprovisionnement` | Done | same |
| Remove `PATCH produits/:id/stock` | Done | `administration.controller.ts` |
| `GET produits/:id/inventaire` (direction, comptoir), `POST .../inventaire/mouvements`, `PATCH .../inventaire/statut` (direction); actor from `@AppelantCourant` | Done | `administration.controller.ts` |
| Join stock in list/detail, filter on durable status, `fiche_technique`, embedded `inventaire`, derived `en_stock` | Done | `administration.service.ts` (`listerProduits`, `lireProduit`) |
| Initialise stock in the product-creation transaction | Done | `creerProduit` |
| Delegate movements/status to `InventaireService`; drop the one-billion boundary for inventory | Done | `lireInventaire`, `ajusterStock`, `changerStatutStock`; `modifierQuantiteLocale` deleted (`BASE_ID_PANEL` remains only for id allocation) |
| Public `statutStock`, derived `enStock`, no quantity leak; `verifier()` reapprovisionnement vs rupture and quantity vs available | Done | `src/catalogue/catalogue.service.ts` |
| `catalogue.module.ts` | Not needed | unchanged |
| Specs | Done | `administration.inventaire.spec.ts` (new), `catalogue.service.stock.spec.ts` (new), `administration.delai-livraison.spec.ts` and `administration.propositions.spec.ts` updated |

## Deviations
- **Test placement**: inventory admin cases went to a new `administration.inventaire.spec.ts` instead of `administration.service.spec.ts` (whose fixture is unwieldy and already has 11 failures). `administration.service.spec.ts` is untouched.
- **New public refusal reason `stock_insuffisant`** (requested quantity above available), distinct from the existing `quantite` (invalid quantity). Repeated lines for one slug are summed for the precheck.
- **Proposals no longer write stock**: `quantite_stock` and `en_stock` were removed from `COLONNES_MODIFIABLES`, so accepting a modification proposal ignores them, and the accept path no longer records an inventory snapshot. A modification proposal whose only fields are those two now answers 400 "aucun champ applicable". The creation-proposal insert still writes the transient projection columns (unchanged).
- **Product creation no longer writes `en_stock`/`quantite_stock`** into `nowtech.produits` (column defaults apply); the durable row is the truth.
- **`ProduitDetaille`/list `modifie_le` is nullable** (`string | null`): a product with no stock row has no timestamp. The Phase 4 admin type must allow null.
- **Two tester assertions were narrowed by me after the red step**: the list-filter tests inspected the whole SQL text, which always contains the projection `coalesce(s.statut::text, 'rupture')`, so they now inspect only the part from `from nowtech.produits p`, and the "no quantity leak" test now checks the query text instead of a hand-injected mock field. Both changes keep the guarantee, they only stop asserting on the projection.
- `statistiques`/`etat()` `ruptures` count also moved to the durable status (not in the plan; it would otherwise read the stale column).
- Process: red suite authored by the tester first (115 failures of 177 in `src/catalogue`), I implemented only after its report.

## Tests
- Red (tester, before implementation): `pnpm test -- src/catalogue` -> 115 failed, 62 passed of 177.
- After implementation, `pnpm test` (full): 2 suites failed, 29 passed; 11 failed, 459 passed (470). The 11 failures are exactly the pre-existing ones: `administration.service.spec.ts` (6 relations, 2 marques, 3 image tests) and `main.spec.ts` suite. My changes did not alter them (same count, same names).
- `./node_modules/.bin/tsc --noEmit`: clean. `pnpm prisma:generer`: succeeds. `pnpm lint` still cannot run (no eslint in the backend, Phase 1 note).
- Not covered: real-database behaviour (join SQL, lock behaviour, post-ingestion durability) is only mock-tested; the 3 pre-existing image tests would have covered "row without `statut_stock` must not throw" but fail for unrelated reasons.

## Not done
- Phase 3 order reservation/release, Phase 4 admin app, Phase 5 cutover, Phase 6 concurrency test.
- No lazy stock-row creation: `ajusterStock`/`changerStatutStock` on a product without a stock row answer 404 from `InventaireService` until the opening count is imported (Phase 5). Creation of a product through a synchronisation proposal likewise creates no stock row.

## Notes for the reviewer
- Until Phase 5, every synced product reads `rupture`/0 and is non-orderable through `verifier()`: deploying Phase 2 before the opening import blocks all online orders. Confirm the rollout order.
- `ajusterStock` snapshots through `InventaireService.ajuster`, so the dashboard metric stays consistent; `changerStatutStock` does not snapshot (totals unchanged) and the status decision is journaled by `changerStatutZero`.
- `creerProduit` inserts the product and initial stock in one transaction, but images, categories, delivery interval and trace remain separate writes (pre-existing behaviour); a failure there leaves a product with its stock initialised.
- The actor role for a mixed-role team member is `direction` when present, else the first role.
- Non-`equipe` callers get 403 from the service as defence in depth; the role guard already blocks them.

---

# Phase 3 — Make order reservation and release atomic (backend)

## What I built
`confirmer()` now reserves stock inside its transaction and `poser()` releases it on the transitions that give stock back. Both go through `InventaireService` with the id of the `CommandeTransition` row they just wrote, so releases link to their original reservation. A new `effetStock(de, vers)` in the state machine classifies every transition as reservation, release or none. Backend branch verified as `feat/prod-stock-mgt`; nothing committed. Work in `/Users/michaelnji/Projects/nvc/NowTech-backend-`.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| One injection path for `InventaireModule`, no cycle | Done (imported directly in `CommandesModule`; `CatalogueModule` untouched) | `src/commandes/commandes.module.ts` |
| `confirmer()`: conditional update from `soumise`, create transition and keep its id, reserve with that id, then freeze prices, journal, one snapshot | Done | `commandes.service.ts` `confirmer`, `reserverLignes` |
| Aggregate identical product ids | Done by `InventaireService.reserverCommande` (already aggregates, ascending id order); `confirmer` passes every line | `inventaire.service.ts` (Phase 1) |
| Failed reservation rolls back everything and returns a conflict listing unavailable lines | Done: `lignes_indisponibles` product ids are mapped to `{slug, motif: 'stock_insuffisant'}` and rethrown, so the transaction rolls back | `reserverLignes` |
| `poser()` releases for `confirmee -> soumise` and for the transition reaching `annulee`, not on `annulation_demandee` | Done, driven by `effetStock` | `poser`, `machine-etats.ts` |
| Release links to the original reservation, retries cannot double-credit | Done by `libererCommande` (skips reservations that already have a release, unique `annule_mouvement_id`) | `inventaire.service.ts` (Phase 1) |
| `refusee` from `soumise` is a no-op | Done: `effetStock` is `aucun` | `machine-etats.ts` |
| Snapshot once per order | Done: one in `confirmer`; in `poser` only when something was released | `commandes.service.ts` |
| Specs and transition-to-inventory matrix | Done | `commandes.service.spec.ts`, `machine-etats.spec.ts` |

## Deviations
- **Catalogue precheck kept as an early exit.** `confirmer()` still calls `catalogue.verifier()`, because prices cannot be frozen without it and it also refuses unknown, withdrawn and zero-priced lines. Its stock refusals (`rupture`, `reapprovisionnement`, `stock_insuffisant`) therefore still short-circuit before the transaction. It is no longer the guard: the race between two confirmations is closed by the guarded reservation. A line that passes the precheck but loses the race gets the same conflict shape from the reservation.
- **Constructor signature changed**: `CommandesService(prisma, catalogue, journal, inventaire, couts?, pdf?)`. `inventaire` is required and sits before the two optional arguments, so existing specs were updated (the tester added a `creerService` helper).
- **Release runs on every transition reaching `annulee`, including `soumise -> annulee`.** With no active reservation the primitive returns `[]`, so no movement and no snapshot occur.
- **Client callers** (a client may post `soumise`) are recorded as stock actor `{type: 'systeme', id: userId, role: null}`, since the ledger only knows `equipe` and `systeme`.
- **No deadlock/serialization retry was added.** Lock order is ascending product id (Phase 1), which prevents the multi-line deadlock. A blind whole-request retry was not added; the plan says to retry only known errors, and none is observed yet.
- Process: red suite written by the tester first (30 failures across the two files), implemented only afterwards.

## Tests
- Red (tester, before implementation): `pnpm test -- src/commandes` -> 30 failed, 40 passed of 70.
- After implementation: `pnpm test -- src/commandes` -> 5 suites passed, 70 tests passed.
- Full `pnpm test`: 2 suites failed, 29 passed; 11 failed, 499 passed (510). The 11 failures are the pre-existing ones (`administration.service.spec.ts` and the `main.spec.ts` suite); my changes did not alter them.
- `./node_modules/.bin/tsc --noEmit`: clean. `pnpm prisma:generer`: succeeds. `pnpm lint` unavailable (no eslint).
- Database check on a throwaway database `scratch_p3` in the dev container (created by `prisma migrate deploy`, dropped afterwards; dev database untouched): one `en_stock` row of quantity 1, two concurrent transactions each running the exact guarded `update ... where quantite >= $2 and statut = 'en_stock' returning quantite` from `reserverCommande`. The first got the row (quantity 0, `rupture`); the second blocked on the row lock and then updated zero rows. Final state: quantity 0, `rupture`. This proves the guard SQL, not the full service path; the end-to-end `test/inventaire-concurrence.spec.ts` (two real confirmations, ledger and order state) remains for Phase 6.
- Not covered: rollback of order state, transitions and journal together on a real database (mocks only).

## Not done
- Phases 4 to 6 (admin UI, cutover, end-to-end concurrency spec).

## Notes for the reviewer
- `poser` calls the release inside `traduireContraintes`; a `ConflictException` from it passes through unchanged. A concurrent second release of the same reservation fails on the unique `annule_mouvement_id` and aborts that transaction (intended).
- A release restores `commande_confirmee` movements found for the order without a release, regardless of which transition made them, so `confirmee -> soumise -> confirmee -> annulee` releases only the second reservation.
- Delivered or closed orders (`en_remise`, `close`, `retour_ouvert`) never release; returns stay a manual correction, per the plan.
- `psql` is not on the host PATH; the database check used `docker exec nowtech-bd psql`. Note `prisma migrate deploy` creates a missing database, so a failed `create database` step still leaves one behind; I confirmed `scratch_p3` is dropped.

---

# Phase 4 — Nuxt admin contracts, manual descriptions, inventory workflows

## What I built
The admin now reads and writes audited inventory for every saved product. A new `InventoryPanel` shows quantity, state and movement history, and direction alone gets an adjustment dialog and the restocking control. `fiche_technique` is editable as a long description next to the existing short one. Create sends a `quantite_stock_initiale` baseline, and no product save sends `en_stock`. Status badges, the quick filters and the Restocking pill all derive from `statut_stock` with withdrawal taking precedence.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| `types/api/inventaire.ts` with backend file:line citations | Done | `app/types/api/inventaire.ts` (cites `administration.service.ts:86-91, 443-476, 460-472, 520-522`, `administration.dto.ts:203-218`, `administration.controller.ts:172, 183, 197`) |
| `produits.ts`: `statut_stock`, `quantite_stock` required; `inventaire`, `fiche_technique`; `en_stock` deprecated optional; `stock` filter value | Done | `app/types/api/produits.ts` |
| Schemas split create/update, `quantite_stock_initiale` create-only, `fiche_technique` 20000 | Done | `app/schemas/produit.ts` (`produitCreateSchema`, `produitUpdateSchema`, both strict); `app/schemas/inventaire.ts` for the adjustment form |
| `useProductInventory` (read via `useApiFetch`, writes via `$csrfFetch`, invalidation) | Done | `app/composables/useProductInventory.ts`, key `apiQueryKeys.products.inventory` in `app/utils/api-query-keys.ts` |
| `InventoryPanel`, `InventoryAdjustmentDialog`, `OverviewLongDescription` | Done | `app/components/products/`, plus `InventorySummary`, `InventoryHistory`, `InventoryMovementRow` split out to keep each lean |
| `DetailForm` rewiring, initial quantity in create mode | Done | `app/components/products/DetailForm.vue`; `OverviewInitialStock.vue` via an `initial-stock` slot of `OverviewDetails` |
| Remove `inStock` from OverviewDetails/OverviewPricing | Done | those two files |
| Delete `LocalInventoryPanel` and `useSetLocalInventory` | Done | files removed; `useProductCosts.ts` trimmed |
| `product-status` util, badges with withdrawal precedence, restocking tone | Done | `app/utils/product-status.ts` (`PRODUCT_STATUS_TONE`, semantic tokens); `ListItem`, `HeroBanner`, `SummaryKpis`, `CategoryProductCard` |
| Restocking quick filter | Done | `types/product-list.ts`, `ListQuickFilters.vue`, `ListPanel.vue` (`stock=reapprovisionnement`, `etat=actifs`) |
| i18n fr+en parity, drop unreferenced keys | Done | `i18n/locales/products/{en,fr}.json`; removed `detailForm.enStock` and the old local-stock `inventory.*` keys |
| `stores/product-list.ts` | Not needed | its `stock` type comes from `ProductListQuery`, so the new value flows through unchanged |

## Deviations
- Writes use `useApiWrite()` (the repo's existing wrapper around `$csrfFetch`) rather than calling `$csrfFetch` directly.
- Roles: no shared helper exists, so the panel uses the repo's existing pattern, `useCachedSession().roles.includes("direction")`.
- The invalidation is `products.all` (covers list, detail and inventory) plus the statistics overview, instead of four separate keys. The restocking mutation invalidates on `onSettled`, so a refused change reloads server state.
- `overview.descriptionTitle` was reworded to "Short description" / "Description courte" to sit beside the new long field.
- `products-workspace.test.ts`: the tester's KPI assertions expected `SummaryKpis` on the page. It is not mounted by `pages/products.vue` (`SummaryKpis` and `HeroBanner` are currently unused there), so I rewrote them to mount `SummaryKpis` directly. I also removed a duplicate `fiche_technique` key from the tester's detail-form fixture.
- `MOTIF_MAX_LENGTH` and `PRODUCT_PATH` are not exported, because fallow flagged them as unused.

## Tests
Tests were authored first by the tester subagent and confirmed red before implementation (the panel spec failed at import). After implementation:
- `bun run lint`: clean (`lint:fix` run, no remaining errors).
- `bun run i18n:check`: passes.
- `bun run typecheck`: clean.
- `bunx vitest run`: 1239 passed, 6 failed, 168 of 173 files passing. All 6 failures are IPX/image-domain assertions in `banner-artwork-preview`, `banner-card`, `banner-panel-artwork`, `products-image-rendering` (2) and `products-local-preview`. They depend on the image-origin env config (`.env`, `.env.test`), not on anything Phase 4 touched, but I did not run them on a clean baseline, so treat "pre-existing" as unconfirmed.
- `bun run fallow` (the changed-files audit gate): "No issues in 210 changed files". Bare `bunx fallow` reports repo-wide advisory health targets, which are inherited.
- `bun run build`: succeeds.

Not covered: real backend round-trips, and layout (no browser tests by repo policy).

## Not done
- Movement history is limited to the first 20 rows with a "showing latest N of M" note; there is no pagination control.
- Phase 5 (cutover) and the storefront are out of scope.

## Notes for the reviewer
- `SummaryKpis` and `HeroBanner` are dead on the products page. I updated them as the plan requires but did not remount them.
- The movement type select is a native `<select>`. Reception is validated client-side as positive, and the server remains authoritative on sign and negative totals.
- Manual QA needed: direction versus comptoir on a real backend (comptoir must see no adjust or restocking control, and a forced write must 403); the responsive layout of the panel and the dialog on narrow widths; creating a product with a baseline; a restocking toggle round trip.
- `useApiFetch` uses `requestFetch` for the read, as the other composables do; the read is not prefetched on SSR.

---

# Phase 6 — Test and verify the complete behaviour

## What I built
A real-database concurrency and durability suite for the backend (`test/inventaire-concurrence.spec.ts`, 8 cases, no Prisma mocks, throwaway database created and dropped by the suite), one extra admin component test for invalid create baselines, and a baseline investigation of the 6 failing admin specs. Backend branch verified as `feat/prod-stock-mgt` before starting. Nothing committed.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Two concurrent confirmations for one unit: one confirmed order, one `commande_confirmee`, quantity 0, `rupture`, loser `soumise` with no movement and a conflict | Done (5 rounds, both orders forced past the precheck by a barrier so only the guarded update decides) | backend `test/inventaire-concurrence.spec.ts`, "gives one unit to exactly one..." |
| Confirm then cancel/reopen releases once; retry does not double-credit; unique `annule_mouvement_id` | Done (reopen, refused retry, direct second release returns `[]`, raw duplicate insert rejected with 23505 on `annule_mouvement_id`, two concurrent cancellations, second reservation released once) | same file, two cases |
| Refuse from `soumise` writes no movement | Done | same file |
| Repeated product ids reserve the aggregate; opposite line order does not deadlock | Done (lines 2+1+3 -> one movement of -5; 8 concurrent orders, 4 AB and 4 BA, 3 rounds) | same file |
| Rollback atomicity of order state, transition, journal, snapshot, earlier reservations | Done (a second buyer takes line 2's last unit after the precheck) | same file |
| Post-ingestion durability | Done by simulating the switch of `scripts/ingerer-catalogue.mjs` (replacement schema, rename aside, rename over `nowtech`, drop old); `boutique.produit_stocks` and `mouvements_stock` compared as full `to_jsonb` snapshots before and after; also asserts no foreign key points into `nowtech` and that the rebuilt catalogue still joins the surviving stock and accepts a new confirmation | same file |
| Suite must not need Docker for `pnpm test` | Done (see "How it runs") | same file, header comment |
| Backend unit/service specs (inventaire, commandes, catalogue stock) | Already existed from Phases 1-3 | unchanged |
| Admin `produit-schema` create/update, detail-form create baseline / no stock fields on patch / description round trips, inventory panel (direction vs comptoir, loading/empty/error, draft preservation, restocking blocked above zero), list-panel/workspace/category-card restocking | Audited: all already present | `test/unit/produit-schema.test.ts`, `test/nuxt/product-inventory-panel.test.ts`, `products-detail-form.test.ts`, `products-list-panel.test.ts`, `products-workspace.test.ts`, `category-product-card.test.ts` |
| Missing admin test | Added one: an invalid initial stock (`-3`, `2.5`) posts nothing and shows the not-saved message | `test/nuxt/products-detail-form.test.ts`, "sends nothing and shows the not-saved message when the initial stock is %s" |

## Deviations
- **The admin test was green on first run**, not red: it pins existing validation behaviour (the create schema's non-negative-integer rule) rather than new behaviour. I confirmed it can fail by temporarily removing `.int()` and `.min(0)` from `produitCreateSchema.quantite_stock_initiale`: both cases failed, and I restored the file (`git status` shows only the test file modified).
- **The backend suite was written by me, not the tester.** It is an integration harness whose expectations came straight from the plan's list, but the "tester first" rule was not followed for it. Instead I ran two mutations of `InventaireService.reserverCommande` and restored the file afterwards: removing the ascending-id sort made the deadlock case fail; removing the quantity and status guards made the one-unit race and the rollback case fail. Removing only the `quantite >= n` guard is NOT detected, because the `statut = 'en_stock'` guard already blocks the race; the two guards are redundant for this scenario.
- The catalogue in the throwaway database is a minimal `nowtech` schema (only the columns `verifier` reads) with a stub `prix_effectif`, not the real ingested catalogue, because migrations do not create `nowtech`.

## How it runs
Backend, from `/Users/michaelnji/Projects/nvc/NowTech-backend-`:

```bash
pnpm bd:demarrer                                   # starts docker container nowtech-bd (skip if already up)
pnpm test -- test/inventaire-concurrence           # this suite only
pnpm test                                          # everything; this suite is included
TEST_BD_SKIP=1 pnpm test                           # force-skip it
```

- The suite probes the server with a synchronous TCP connect. If it is unreachable (or `TEST_BD_SKIP=1`), all 8 cases are skipped and a `console.warn` says how to run them, so `pnpm test` needs no Docker.
- Defaults target the dev container: `TEST_BD_ADMIN_URL=postgresql://nowtech:nowtech@localhost:5433/postgres` and `TEST_BD_APP_PASSWORD=dev_local` (the dev `nowtech_app` password). Override those variables for any other server.
- It creates `test_inventaire_<pid>_<timestamp>`, runs `prisma migrate deploy` against it, runs the service as `nowtech_app` (so the append-only ledger privileges are exercised), and drops the database with `drop database ... with (force)` in `afterAll` even if setup failed. It never connects to the `nowtech` database. A `kill -9` can leave a scratch database behind; list with `docker exec nowtech-bd psql -U nowtech -d postgres -c '\l'`.
- The whole suite takes about 5 s.

## Tests
Backend (`/Users/michaelnji/Projects/nvc/NowTech-backend-`):
- `pnpm test -- test/inventaire-concurrence`: 1 suite, 8 passed (about 5.4 s). With `TEST_BD_ADMIN_URL` pointing at a closed port: 8 skipped, warning printed.
- Full `pnpm test`: 2 suites failed, 30 passed; 11 tests failed, 507 passed (518). The 11 failures are the known pre-existing ones (`src/catalogue/administration.service.spec.ts` and `src/main.spec.ts`).
- `./node_modules/.bin/tsc --noEmit`: exit 0. No eslint in the backend.
- After every run `pg_database` lists only `postgres`, `template0`, `template1`, `nowtech`: no scratch database remains.

Admin (`/Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt`, bun only):
- `bun run lint`: exit 0. `bun run typecheck`: exit 0. `bun run i18n:check`: passes. `bun run build`: "Build complete".
- `bun run fallow` (the changed-files gate): "No issues in 210 changed files". Bare `bunx fallow` exits non-zero on "health (7 above threshold)" (`app/pages/orders.vue` first); those are inherited repository-wide complexity targets, not findings on this feature's files.
- `bunx vitest run` with a clean environment (see below): 173 files, 1247 tests, all passed.
- `bunx vitest run` as-is in the agent shell: 6 failed files, 7 failed tests (the 6 known IPX/host tests plus `operations-page.test.ts` "opens Cash Registers as the default workspace", which passed in the clean-environment run; I did not investigate it further, treat it as flaky or environment-sensitive).

### Baseline finding for the 6 admin failures: pre-existing, and not a code regression
I created a worktree of `2c673d5` outside the repo, copied `.env` and `.env.test`, ran `bun install`, and ran the 5 spec files: the same 6 tests fail there. Cause: the agent shell exports `SUPABASE_URL`, `NUXT_PUBLIC_CATALOGUE_IMAGE_ORIGIN` (`https://nowtechcenter.com`), `NUXT_SUPABASE_URL`, `NUXT_API_BASE_URL`, `BACKEND_URL`, `CATALOGUE_IMAGE_ORIGIN` and others, and process environment wins over `.env.test`, so `nuxt.config.ts` computes `image.domains` and the catalogue origin from the shell instead of from the test file. Running the same specs with those variables unset (`env -u ...`) makes all 25 tests pass on the baseline, and the full current suite passes 1247/1247 the same way. Removing `.env` alone did not help. The worktree was removed with `git worktree remove --force` and pruned. I did not change anything.
Command for a clean run: `env -u BACKEND_URL -u CATALOGUE_IMAGE_ORIGIN -u NUXT_API_BASE_URL -u NUXT_PUBLIC_CATALOGUE_IMAGE_ORIGIN -u NUXT_SUPABASE_ANON_KEY -u NUXT_SUPABASE_URL -u STOCKAGE_PUBLIC_ORIGIN -u SUPABASE_ANON_KEY -u SUPABASE_AUDIENCE -u SUPABASE_JWKS_URL -u SUPABASE_JWT_SECRET -u SUPABASE_URL bunx vitest run`.

## Not done
- Manual QA and browser checks (I have no browser and no running app). Still open:
  1. Direction versus comptoir on a real backend: comptoir sees quantity, status and history but no adjust or restocking control, and a forced write returns 403.
  2. Responsive layout of the inventory panel, movement list and adjustment dialog on narrow widths.
  3. Creating a product with an initial quantity, and with the default zero.
  4. Restocking toggle round trip, including refusal above zero.
  5. Customer checkout blocking for `rupture` / `reapprovisionnement` / `stock_insuffisant`, end to end through the storefront.
  6. Cancelling a confirmed order restores stock, seen in the panel history and the dashboard total.
  7. Post-ingestion persistence with the real `scripts/ingerer-catalogue.mjs` and the real seed (my test simulates the schema switch only).
  8. Rollout order from earlier phases: opening-balance import (Phase 5) must precede exposure, otherwise every synced product reads `rupture`.
- Plan gate "`pnpm lint` passes in `NowTech-backend-`": impossible, the backend has no eslint.

## Notes for the reviewer
- **Possible pre-existing issue, not fixed and not confirmed against the real script**: `scripts/ingerer-catalogue.mjs` builds `nowtech_prep` with `creerTables`, whose `produits` has no `promo_debut`/`promo_fin`, and nothing in it replays `sql/promotions.sql` (which defines `nowtech.prix_effectif`, dropped with the old schema). `CatalogueService.verifier` calls `nowtech.prix_effectif` and reads those columns. Unless the operator replays `sql/promotions.sql` after ingestion, checkout verification would fail right after a real ingestion. My durability test rebuilds the schema with those objects present, so it does not exercise this.
- The concurrency suite depends on the dev container's `nowtech`/`nowtech_app` credentials and on a role with `CREATEDB`; that is why the connection details are overridable.
- The barrier in the concurrency cases relies on `CatalogueService.verifier` being called once per confirmation; if `confirmer` ever calls it twice, the barrier would hang until the 60 s test timeout.
- The price-conflict path of `confirmer()` records a `soumise -> soumise` transition through `poser()` before the reservation transaction opens; unchanged from Phase 3 and not covered by this suite.

---

# Phase 5 — Opening-stock import and cutover runbook

## What I built
`scripts/importer-stock-initial.mjs` in the backend (branch `feat/prod-stock-mgt`, verified before starting, nothing committed), run as `pnpm stock:importer -- --source=<csv> --operateur=<name> [--essai] [--ignorer-existants] [--autoriser-manquants] [--rapport=<path>]`. It imports an operations-signed `produit_id,quantite` CSV as `initialisation` movements plus `produit_stocks` rows and one `inventory_snapshots` row, in a single transaction, with the same invariants as `InventaireService.initialiserStock`. It is covered by a 69-case real-database spec written first by the tester, and the cutover runbook is `reports/2026-09-30-assessment-product-inventory-cutover.md`.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Controlled script that imports the signed count as `initialisation` movements and refuses duplicate baselines | Done | backend `scripts/importer-stock-initial.mjs` |
| Strict file validation: header, integer >= 0, no duplicates, no silent blank lines, whole file refused, every problem listed with `ligne N` | Done | same, `lireCsv` |
| Refuse existing stock row or any movement; `--ignorer-existants` skips and lists | Done | same, `rapprocher` + refusal block |
| Unknown ids refused; missing active sellable products refused unless `--autoriser-manquants`; withdrawn ids in the file excluded and listed | Done | same |
| `--essai` dry run with the same validation and summary, zero writes | Done | same |
| Single transaction, then one snapshot with the whole-table total; reconciliation block; optional `--rapport` markdown | Done | same |
| Actor `systeme`, required `--operateur` recorded in actor id, motif and snapshot actor | Done (`import-stock:<name>`, max 50 chars) | same |
| npm script | Done | backend `package.json` `stock:importer` |
| Tests: real throwaway DB, skip-when-unreachable | Done | backend `test/importer-stock-initial.spec.ts` (69 cases) |
| Runbook with order, commands, pre-flight, rollback per step, PENDING fields, open items | Done | `reports/2026-09-30-assessment-product-inventory-cutover.md` |
| Storefront update and release | Not done, owner unknown | runbook O1 |
| Running the import for real | Not done, by instruction | runbook step 2 |

## Deviations
- **SQL reimplemented, not `InventaireService` reused.** The service is TypeScript behind Nest DI and the repo convention for operations scripts is a plain `.mjs` (`ingerer-catalogue.mjs`). The DB CHECK constraints enforce the invariants, and the spec has a parity test that imports a quantity of 0 and of 5 through the script and through `InventaireService.initialiserStock` and compares the row shapes.
- **"Sellable" is `retire_le is null and prix > 0`.** A zero-price product cannot be ordered (`CatalogueService.verifier`), so it is never reported as missing.
- **Withdrawn products in the CSV are excluded, not refused.** They are not baselined, and their ids are listed in the reconciliation.
- **`@prisma/client` is imported dynamically** so that Prisma's automatic `.env` loading cannot supply `DATABASE_URL_MIGRATION` behind the required-variable check. The first implementation used a static import and the tester's "missing database url" case caught it: a local `.env` silently targeted the dev database. The script also prints `base : host:port/db` at start. `ingerer-catalogue.mjs` has the same static-import behaviour; not changed.
- **Duplicate detection also fires when the first occurrence has a bad quantity**, so the duplicate is listed separately from the bad value.
- The script runs under the owner connection (`DATABASE_URL_MIGRATION`), like the ingestion, not the application role.

## Tests
Backend, from `/Users/michaelnji/Projects/nvc/NowTech-backend-`:
- Red first: the tester reported 69 failed, 69 total, all with `Script absent ... (ENOENT)`. I did not re-run the red state myself.
- Green: `pnpm test -- test/importer-stock-initial` printed "Tests: 69 passed, 69 total" (about 9 s). First implementation run: 66 passed, 3 failed (duplicate after an invalid first occurrence, an example text mentioning `DATABASE_URL_MIGRATION`, and the `.env` autoload above), all fixed.
- Full `pnpm test`: "Test Suites: 2 failed, 31 passed; Tests: 11 failed, 576 passed, 587 total". The 11 failures are the known ones in `src/catalogue/administration.service.spec.ts` and `src/main.spec.ts`.
- `./node_modules/.bin/tsc --noEmit`: exit 0. The `.mjs` script is not covered by tsc.
- `pg_database` after the runs lists only `postgres`, `template0`, `template1`, `nowtech`: no `test_*` database remains.
- Not run: the script against the dev database (not even `--essai`), and never against a real environment.
- Not covered: a CSV of thousands of rows (the writes are three set-based statements, but no size test exists), and concurrent runs against a live backend.

## Not done
- The real opening import and everything in the runbook after step 0. Every count, operator, timestamp and total in the runbook is a PENDING placeholder.
- Storefront owner and repository still unknown (plan open question 3).
- The `scripts/ingerer-catalogue.mjs` promotion concern is recorded as runbook item O2 and pre-flight check 4; it is unconfirmed and untouched.

## Notes for the reviewer
- `sql/inventaire.sql` adds a legacy `nowtech.produits.quantite_stock` column; the runbook says nothing may read it after cutover. Nothing in this change reads or writes it.
- The spec uses `session_replication_role = replica` (owner is a superuser in the dev container) to seed a movement without a stock row for the "any movement" refusal case.
- The import assumes `nowtech.produits` from the real ingestion has `prix` and `retire_le` (it does per `creerTables`); the spec's test table has the same columns.
- Whether the production host has the repo checkout, `node_modules` and `sql/` needed to run the script is unknown (runbook O4).
- The runbook's rollback SQL (dropping or truncating the stock tables) and the `deployer.sh`/`sauvegarder.sh` steps are written from reading the code, not rehearsed.

## Review fixes

Response to `reviews/2026-09-30-product-inventory-descriptions.md`. Admin repo and runbook only; the
backend was read, never written. Finding 7 (promotions replay in ingestion) is deliberately not fixed:
the runbook still flags it as a blocker for Step 6 (Step 6 first bullet, and open item O2).

### What changed
| Finding | Fix | Where |
| :-- | :-- | :-- |
| 4 (in-flight orders) | Runbook: defined the opening quantity (`opening = counted - committed`, per status table), a confirmation-freeze pre-flight step stated honestly from the code (no backend flag exists; two confirming routes; operational freeze, optional proxy freeze, draining ruled out), read-only queries Q1a/Q1b for in-flight confirmed lines, delta check before the real import, reconciliation formula, CSV guidance, and a Step 3b rule for pre-cutover orders cancelled or reopened later. | `reports/2026-09-30-assessment-product-inventory-cutover.md` (Why the order matters, Step 0 items 5, 7-9, "Opening quantity", Step 2b-pre, 2c, Step 3b, O8, O9) |
| 8 (runbook, minor) | Rollback SQL drops the two enum types and the `_prisma_migrations` row (checked against `migration.sql`, which creates exactly two tables and two types). Smoke check 1 now reads the quantity from the admin `/inventaire` endpoint, because the public response only has `statutStock` and `enStock`. Smoke check 3 confirms through the admin Confirm button (`/avancer`). Deploy-window note and decided ordering: backend first, admin immediately after. | same file, Step 1 rollback, Step 3 |
| 5 (form wiped) | `DetailForm` now watches `productFormSignature(product)`, the product without `inventaire`, `statut_stock`, `quantite_stock`, instead of the object. A refetch that only moved stock no longer re-derives the form or resets the tab; a changed saved field or another product still does. Invalidation is unchanged, so list badges and the detail summary still refresh. | `app/utils/product-form-source.ts`, `app/components/products/DetailForm.vue` (watcher) |
| 6 (history) | `useProductInventory` is an infinite query (`page`, `taille=20`, next page while `page < pages`). The panel flattens pages, drops repeated ids, and passes `hasMore` / loading / failure to `InventoryHistory`, which shows a "Load older movements" button, "Showing N of M", and an inline alert on a failed page that keeps the loaded rows and the button (retry). | `app/composables/useProductInventory.ts`, `InventoryPanel.vue`, `InventoryHistory.vue` |
| 2 (UI side) | Summary shows "Last updated <date>" or "No updates yet" when `modifie_le` is `null`; nothing else assumed it non-null. A product with no stock row already rendered 0 and Out of stock with Adjust and Restocking available; a test now pins that. A 404 (older backend) reaches `apiErrorText`, which shows the backend's own message, so no UI change was needed. | `InventorySummary.vue` |
| 10 (actors) | Row shows "You" for the signed-in member (from the session already in the cache, passed down as `currentMemberId`), otherwise the translated role label (`team.roles.*`, comma-separated role lists handled), never the raw UUID; the id stays in a `title` tooltip. `systeme` is unchanged. | `InventoryMovementRow.vue`, `InventoryPanel.vue` |

i18n (fr and en parity): `products.inventory.showing` replaces `showingLatest`; new `loadMore`,
`loadMoreError`, `updated`, `neverUpdated`, `actorYou`.

### Finding 10, what was not done
A client reopening an order is written as `systeme` by the backend, so the admin cannot tell it from a
real system action; fixing that needs a backend `acteur_type = 'client'` (or a label). Member names are
not resolved: that would need a new call per actor, which was out of scope.

### Tests (TDD)
Tester wrote the specs first; red run: 16 of 33 new tests failed for the right reasons (form edit
wiped, tab reset, no load-more control, no `updated` element, raw UUID and lowercase role), the other
17 were guards that already passed.
- `test/nuxt/products-detail-form-stock-refetch.test.ts` (6): edits and tab survive a stock-only prop change, re-sync when a saved field or the product changes, edit survives a real dialog POST followed by a stock-only prop change. The refetch itself is simulated with `setProps`, not driven through the page query.
- `test/nuxt/product-inventory-history-paging.test.ts` (17): load more append, last page, in-flight disable, duplicates, failure and retry, reload after write; never-touched stock (0 / rupture, adjust and restocking, `null` date); actor display.

Green run, with the full env-unset list (`env -u SUPABASE_URL -u NUXT_PUBLIC_CATALOGUE_IMAGE_ORIGIN -u NUXT_SUPABASE_URL -u NUXT_API_BASE_URL -u BACKEND_URL bunx vitest run --coverage.enabled=false`):
`Test Files 175 passed (175)`, `Tests 1270 passed (1270)`.

Other gates, all run at the end: `bun run lint` clean; `bun run i18n:check` exit 0; `bun run typecheck` exit 0;
`bun run fallow` (the commit gate, `fallow audit`) "No issues in 216 changed files"; `bun run build` "Build complete!".
Bare `bunx fallow` also reports "7 above threshold" in health for files this change does not own
(`app/pages/orders.vue` first, `app/utils/api-query-keys.ts`, `useQuotes.ts`); the audit excludes them as
inherited. Dead code and duplication are 0.

Runbook SQL: Q1a, Q1b and the Step 3b query were executed against a scratch database created in the
`nowtech-bd` container with stand-in tables carrying the real names and columns (Q1 in a read-only
transaction), then the scratch database was dropped (`pg_database` again lists `postgres`, `template0`,
`template1`, `nowtech`). The dev `nowtech` database was not written. The queries were never run
against production data.

### Deviations from the request
- The tester put specs B, C and D in one new file (`product-inventory-history-paging.test.ts`) rather than extending `product-inventory-panel.test.ts`; the filename covers more than paging.
- The failed-next-page notice is a small `text-destructive` alert line inside the history block, not `InlineStateNotice` (its `py-10` block is sized for an empty list, not a footer notice). The panel-level error and empty states are unchanged.
- Runbook smoke check 3 presumes the backend `/avancer` fix that is in flight; it says to stop and roll back if the movement is missing.

### Open issues and notes for the reviewer
- Finding 5 is verified by simulating the refetch with `setProps`; nothing was run in a browser.
- The freeze in the runbook is not enforceable from the repository; the proxy option is unexamined (O8). The status-by-status "goods on premises" table is a proposal for Operations (O9).
- Runbook Step 3b: pre-cutover confirmed orders later cancelled or reopened need a manual signed `reception`; there is no automatic path. This follows from reserve-at-confirmation and cannot be fixed in the admin.
- Infinite-query invalidation refetches every loaded page after a write, so a product with many loaded pages costs several requests per write.
- A role that is not in `team.roles` is shown as its raw value.

### Backend review fixes (to be filled by coordinator)
Fixes for review findings 1, 2, 3, 9, 11 and 12, all in `NowTech-backend-` (`feat/prod-stock-mgt`).

- **Finding 1 (MAJOR).** `poser()` now takes the order lines. When `effetStock(de, vers) === 'reservation'` it calls the same `reserverLignes` as `confirmer()`, then records one snapshot, inside the transition transaction. The guarded UPDATE and the 409 shape (`lignes: [{slug, motif: 'stock_insuffisant'}]`) are identical, so the generic `/avancer` route can no longer confirm an order without taking its stock. No other route reaches `confirmee`: the transition table has only `soumise -> confirmee`, and only `confirmer` and `avancer` (via `poser`) can perform it. `confirmer()` does its own `updateMany` and never calls `poser` for the confirmation, so nothing reserves twice.
- **Price freeze not unified (decision).** `avancer -> confirmee` still skips the price freeze and drift check that `confirmer()` performs. This predates the feature, the freeze needs the drift threshold only `/confirmer` supplies, and unifying would change what the transition dialog does. Open: point the admin `TransitionDialog` at `/confirmer` for `soumise -> confirmee`.
- **Finding 2.** New `InventaireService.initialiserSiAbsent` uses `INSERT ... ON CONFLICT (produit_id) DO NOTHING RETURNING`, so two racing first calls write one zero-variation `initialisation` movement and no PK error. `ajusterStock` and `changerStatutStock` run it, then the operation, in one transaction. A refused first adjustment rolls back the initialisation too. Unknown products still 404.
- **Finding 3.** `scripts/arbitrer-catalogue.mjs` no longer emits `en_stock` or `quantite_stock`. Accepting a legacy proposal ignores stock keys; a stock-only one returns an explicit 400 pointing to the product inventory. The script has no spec and was checked only with `node --check`.
- **Findings 9, 11, 12.** `AjusterStockDto.variation` is capped at +/-1,000,000 and a result above int4 returns 409. Real-database cases with stock 2 and stock 3 and two concurrent orders of quantity 2 (through `confirmer` and `avancer`) give exactly one 409 and one ledger movement; the stock-3 case fails without the `quantite >= n` guard. The duplicate `exigerInventaire()` call in `creerProduit` is gone.
- **Verification.** `pnpm test -- src/inventaire src/commandes src/catalogue test/inventaire-concurrence test/importer-stock-initial`: 13 suites passed, 1 failed, 394 of 405 tests passed; the 11 failures are the known ones in `administration.service.spec.ts`. `tsc --noEmit` clean, no `test_*` database left. Red runs were confirmed first by the tester.
- **Open.** Orders confirmed through the UI still get no frozen prices. Auto-creation in `arbitrer-catalogue.mjs` (about lines 323-343) still writes the legacy columns of `nowtech.produits`, which nothing reads. `libererCommande` has no int4 ceiling check on restoration.

### Ingestion promotions replay (review finding 7)

`scripts/ingerer-catalogue.mjs` now replays `sql/promotions.sql`, `sql/description-fiche.sql` and `sql/droits.sql` inside the same transaction as the schema swap, after the rename. Before this, every ingestion left `nowtech` without `promo_debut`/`promo_fin`, `promotion_active`, `prix_effectif`, the two promotion constraints, its index and the description index, which `CatalogueService.verifier` and the admin list/detail need. The replay files are reused instead of duplicating their content in `creerTables`, so bootstrap and ingestion cannot drift. `droits.sql` moved into the swap transaction too, closing a window with no grants. `sql/inventaire.sql` is not replayed: `creerTables` already creates `quantite_stock`, nothing reads it, and its `do $$` block would be cut by the script's `;` splitter.

- **Tests.** New `test/ingestion-catalogue.spec.ts` runs the real script as a child process against a throwaway database (20 tests; 13 red before the change): `prix_effectif` values, `verifier` as `nowtech_app`, grants, stock and ledger surviving a re-ingestion, `--essai` writing nothing, and rollback on a failing replay. The stand-in schema in `test/inventaire-concurrence.spec.ts` now replays the real `promotions.sql` instead of hand-made objects, so it no longer hides the problem.
- **Gates.** 14 of 15 suites and 414 of 425 tests pass; the 11 failures are the known baseline in `administration.service.spec.ts`. `tsc --noEmit` clean, `node --check` passes, no scratch database left, the dev database was not written.
- **New failure mode.** A vitrine row whose `remise_pct` contradicts its `prix_reference` now fails the whole ingestion (loud on purpose).
- **Open.** Not run against the real vitrine `catalog.json`; the swap lock is slightly longer (about 4,275 row updates and an index build inside the transaction); after a failed transaction `nowtech_prep` is left behind until the next run drops it.

### Admin Confirm uses `/confirmer` (review finding 1, admin side)

The admin Confirm action (`soumise -> confirmee`) now calls the backend `/commandes/:ref/confirmer` endpoint instead of `/avancer`, so confirming reserves stock and also freezes prices with the drift check. All other transitions still use `/avancer`. `/confirmer` takes no body, so the dialog's optional note is not sent on Confirm.

- **Conflicts.** `parseConfirmConflict` (`app/utils/order-confirm-conflict.ts`) parses two 409 shapes and `OrdersConfirmConflict` (`ConfirmConflict.vue`) renders them: unavailable lines (`lignes: [{slug, motif}]`, motives translated, unknown ones fall back to "Unavailable") and price drift (`totalPrecedent`, `totalPropose`; the backend records a `soumise -> soumise` transition and the customer must accept again). The dialog stays open with no optimistic change. Other errors keep the generic `apiErrorText` path.
- **Invalidation.** Success invalidates orders (all, detail, caisse) and `products.all`; a 409 invalidates the order so drift shows fresh totals. Safe with the earlier form fix because the product form re-derives only when saved fields change.
- **Other paths.** `TransitionDialog` was the only caller of `advance` with `vers: confirmee`; no bulk or queue confirm path exists.
- **Tests and gates.** 6 of 9 dialog tests and the whole unit spec were red first. Lint, `i18n:check`, typecheck, full vitest with the environment unset (176 files, 1287 tests), `bun run fallow` (no issues in 224 changed files) and `bun run build` pass. Bare `bunx fallow` still lists 8 existing health targets, none introduced here.
- **Open.** A 409 with `statutReel` is a generic error, not a dedicated message; stock conflicts show slugs because the backend sends no product names.

### UI refinements after first review (Stock tab, Overview, history)

Follow-up changes made with the user while they reviewed the admin in a browser. None touches the backend.

- **Stock tab.** The product detail tabs are Overview | Stock | History. The inventory panel lives in the Stock tab and mounts on first open (create mode has no Stock tab). A direction-only `InventoryActionBar` sits in a `DetailHeader` `bar` slot and holds Adjust and the restocking toggle; comptoir gets no bar. The card shows only the movements table (vuzeno `Table` inside `TaxonomyFlatTableState`), with pagination kept. `InventorySummary` was removed; current quantity and state show on the Overview only.
- **Movements table cells.** Type is a semantic `Badge` (mapping in `app/utils/inventory-movement.ts`), balance uses a Phosphor arrow icon with an sr-only "from X to Y" reading (saved as a user rule: icons, never text arrows), reason is `text-xs` clamped to 3 lines with a `title`, and the actor is a pill. `InventoryActorPill` resolves the member by id from the roster and renders the shared `EditorPill`; system actions show a muted gear pill.
- **Overview.** A read-only In stock switch (always disabled; on only for `en_stock`) sits beside the localized quantity, with a ghost icon-only pencil that opens the adjustment dialog (direction only) and an info tip. Stock and delivery time share one wrapping row. Departments and Categories are single-choice pill dropdowns (`OverviewPillPicker`, searchable list, `bg-muted` trigger); the features list is its own card under the brand card.
- **Header.** Save reads just "Save" and is hidden when nothing changed (like Cancel). Withdraw is a plain secondary button.
- **History.** Product-change history shows translated field names (`products.historyEntry.fields`, including `delai_livraison_id`), falling back to the raw key.
- **Not included.** An uncommitted user edit to `app/utils/dates.ts` (short month names) was left out of these commits; it breaks 5 existing tests in `test/unit/dates.test.ts` and `test/nuxt/banner-editor-pill.test.ts`.

