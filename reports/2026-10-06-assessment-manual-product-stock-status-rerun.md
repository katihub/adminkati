# Manual product stock-status assessment — re-run after backend and storefront pulls

Supersedes the conclusions of `reports/2026-10-05-assessment-manual-product-stock-status.md` where they
differ. That report stays as the record of the first pass.

## Question

After pulling the latest backend and storefront, is the original assessment still right? Specifically:
can staff set a product's selling status independently of its counted quantity, what has changed, what
did the first pass get wrong, and does the storefront need to change?

## Method and scope limits

| Subject | Examined |
| :-- | :-- |
| Backend `NowTech-backend-` | `main` at `1f83abe` (2026-10-05). Diffed against the first audit's `3ff1e54` (33 commits). Read the stock-relevant source, both availability predicates, the inventory service, the admin service/DTO/controller, the cart verifier, and the inventory migration. |
| Storefront `now-tech--website` | Worktree `main` at `65cd4c7` (2026-10-05), read statically: every stock reference (13 lines in 8 files), the cart verification client, the revalidation route, the suggest route. The other two worktrees (`feat/enhancements` `28c01b4`, `chore/trunk-setup` `69e2278`) were only grep-counted: same 13 references each. `feat/enhancements` is not merged into `main`. |
| Admin frontend (this repo) | The indicator, action bar, mutation composable, status util, and the backend citations in `app/types/api/`. |
| Tests | Ran `npm test` on the backend for `src/inventaire`, `statut-stock`, `catalogue.service.stock`, `administration.inventaire`: **5 suites, 227 tests, all passing**. Not the full suite. |

**Not examined:** a live API or production database; the full backend suite; storefront build or runtime;
concurrent requests against real PostgreSQL; whether an external WooCommerce sync rewrites
`nowtech.produits.en_stock` (nothing in `src/` writes it, but scripts and jobs outside `src/` were not
traced); the cutover runbook. No source was changed in any repository.

## What changed upstream

Of the 33 backend commits, two matter here, plus one refactor.

**PR #12 and #13 (`8d0eff8`, `1df9928`): a product with no stock-registry row is no longer "out of
stock".** The registry `boutique.produit_stocks` was born empty on 2 October. Seven reads had written
`coalesce(s.statut, 'rupture')`, so the cart verifier refused every line and the admin showed 4 305
stockouts. The source comment records the measured data: **0 of 4 305 products have a quantity, while
3 962 are flagged available.** Now:

- One predicate, `statutStockSql()` (`src/catalogue/public/statut-stock.ts:23`), falls back to the legacy
  `nowtech.produits.en_stock` flag when no registry row exists. It serves the admin list, detail and
  `stock` filter (`administration/administration.service.ts:272, 305, 349`), the public filter
  (`public/filtre-produits.ts:74`), the cart verifier (`public/catalogue.service.ts:303`) and the
  `ruptures` count (`:415`).
- The storefront reads the same rule through `enStock()` (`public/vitrine-catalogue.sql.ts:40`).
- `verifier` only compares quantity for counted products (`catalogue.service.ts:364`, `auRegistre`).
  Reservation already ignored uncounted products (`inventaire.service.ts:432`).
- A guard spec scans the sources so no read falls back to `'rupture'` again.

**Refactor:** `administration.service.ts` and `vitrine-catalogue.service.ts` were split into
`administration/`, `public/`, `stock/` and `version/`. Every file:line citation in the first report is
stale.

**Unchanged and re-verified:** the DB check `(statut = 'en_stock') = (quantite > 0)`; the reservation and
release SQL (`inventaire.service.ts:431-470`, `473-518`, file untouched); `changerStatutZero`
(`:364-389`); `ChangerStatutStockDto` rejecting `en_stock` (`administration.dto.ts:232-236`); the product
PATCH allowlist excluding `en_stock` and `quantite_stock` (`:47-70`); the route, `direction` only
(`administration.controller.ts:286-287`).

## Findings

### 1. The first report's central claim stands, but its description of the gap was incomplete

Still true: there is no way to force a status independently of quantity on a **counted** product.

**Missed in the first pass:** `ajusterStock` and `changerStatutStock` both call
`initialiserSiAbsent` first (`administration.service.ts:726, 746`; present at `3ff1e54` too). For an
uncounted product, `PATCH .../inventaire/statut` therefore does not 409. It creates a zero registry row
(`rupture`, plus an `initialisation` movement) and then applies the status. A `reception` does the same
with a quantity.

So staff **can** take an uncounted product out of stock today, but only by converting it into a
counted-at-zero product, and that conversion is permanent: `DELETE` is revoked on `produit_stocks` and
the movement foreign keys are `RESTRICT` (`20260930100000_inventaire_produits/migration.sql:81, 96`).
Nothing can return a product to status-only. This is the strongest argument for a separately stored,
reversible override: without it, "untick manage stock" cannot exist.

### 2. The first report's risk "admin and storefront disagree for uncounted products" is resolved upstream

The admin projections now use `statutStockSql()`, so list, detail and filters agree with the storefront.
The proposed backfill from the legacy flag is **no longer needed** and is withdrawn. An override row is
only needed when staff actually change a status.

### 3. New defect, still open: the admin stock read contradicts the detail read for uncounted products

`lireEtatStock` (`administration.service.ts:768-776`), which backs `GET .../produits/:id/inventaire`,
returns `statut_stock: ligne?.statut ?? 'rupture'` and `quantite_stock: ligne?.quantite ?? 0` for a
product with no row. The detail projection (`:349-372`) uses `statutStockSql()`. The guard spec's regex
only matches `coalesce(x.statut::text, 'rupture')`, so it misses the `?? 'rupture'` form.

For an uncounted product flagged available (about 3 962 today):

| Read | `statut_stock` | `modifie_le` |
| :-- | :-- | :-- |
| `GET .../produits/:id` (detail) | `en_stock` (flag fallback) | `null` |
| `GET .../produits/:id/inventaire` | **`rupture`** | `null` |

The admin reads these in different places: the overview indicator uses `product.inventaire`
(`OverviewStockIndicator.vue:22`), the Stock tab's action bar uses the inventory read
(`InventoryActionBar.vue:12`). By reading the code, the action bar then sees quantity 0 and `rupture`, so
`toggledRestockingStatus` (`inventory-movement.ts:22-25`) returns `reapprovisionnement` and the
**"mark restocking" button appears on a product that is selling**. One click runs the lazy-initialisation
path from finding 1 and permanently removes it from the storefront. Not reproduced against a running API.

### 4. The storefront needs no change for this feature

- It holds no stock logic. It consumes `enStock: boolean` on product cards (`src/types/catalogue.ts:42`)
  and, per cart line, `commandable` plus `motif` from `/catalogue/verifier` (`src/lib/verification.ts`).
- The backend already hides out-of-stock products from every public read (owner rule, quoted at
  `vitrine-catalogue.sql.ts:49-52`). A forced `rupture` product therefore disappears from the storefront
  and a forced `en_stock` product appears and is orderable. Both fall out of changing the two predicates.
- **Freshness:** admin writes call `revalidation.previenir([slug])` and `marquerVitrine()`
  (`administration.service.ts:736-737, 749-750`); the storefront's `/api/revalider` expires the fixed
  catalogue tags with `expire: 0`. A new availability endpoint must make the same two calls. The suggest
  route is `no-store`.
- **Adjacent defect, pre-existing, not caused by this feature:** the storefront's `MotifRefus` type
  (`src/lib/verification.ts:28`) omits `stock_insuffisant` and `reapprovisionnement`, which the backend
  returns (`catalogue.service.ts:359, 364`). `libelleMotif` falls back to a generic "indisponible"
  (`:68`), so nothing breaks but the customer gets a vague reason.

### 5. Availability now flows through exactly two predicates, which lowers the cost of the override

| Reader | Where |
| :-- | :-- |
| Storefront visibility, cards, search, `enStock` | `enStock()` / `produitVisible()` |
| Admin list, detail, filter; public filter; cart verifier; `ruptures` count | `statutStockSql()` |
| Order reservation | guarded `update` in `inventaire.service.ts:431-440`, plus the `connus` set (`:420-432`) |
| Stock export | reads quantity only, unaffected (`stock-export.service.ts:67`) |

The first report listed these as scattered sites. They are now two SQL functions, one SQL statement and
one verifier condition.

### 6. Stale citations in this repo

39 citations in `app/types/api/*.ts` name `administration.{service,dto,controller}.ts`. The files moved to
`src/catalogue/administration/` and the service lost about 690 lines, so the line numbers are wrong.
`app/types/api/README.md` requires them to be accurate. Not fixed here.

## Recommendation

Keep the nullable-override design from the first report, with these revisions:

1. **Store the override in the new table only.** Do not write `nowtech.produits.en_stock`: it is a
   WooCommerce copy, and whether anything external overwrites it was not examined.
2. **The override endpoint must not lazily create a registry row.** Lazy creation is what makes the
   current path irreversible.
3. **Effective status** becomes `coalesce(override, registry status, legacy flag)` in `statutStockSql()`
   and `enStock()`. Add the override to the guard spec's expectations.
4. **Reservation:** forced `rupture` refuses and forced `en_stock` skips the decrement and writes no
   movement, inside the same guarded statement. `verifier` skips the quantity check when forced
   (`p.auRegistre && !forcee`).
5. **Fix finding 3 in the same change:** route `lireEtatStock` through `statutStockSql()`, and widen the
   guard regex to `?? 'rupture'`. The new UI depends on both reads agreeing.
6. **Frontend:** the "Track quantity" switch is only offered for counted products
   (`inventaire.modifie_le !== null`). For an uncounted product, turning it on would revert to the stale
   legacy flag, so the way to start tracking is the existing count dialog.
7. **Optional, storefront:** add the two missing reasons to `MotifRefus` and `MOTIFS`.

Dropped from the first plan: the backfill, and the claim that the admin and storefront disagree.

## Conclusion

The backend fixed the uncounted-product inconsistency and, in doing so, made the override cheaper to build:
two predicates and one reservation statement. It did not add any way to set status independently of
quantity, and the first report's description of today's path missed that an uncounted product can be
marked `rupture` only by permanently becoming a counted one. One new defect (finding 3) makes the existing
Stock tab offer a destructive action on selling products, and should be fixed before or with this feature.
