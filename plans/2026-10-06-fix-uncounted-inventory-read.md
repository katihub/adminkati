# Make the admin inventory read agree with the product read for uncounted products

Slug: `fix-uncounted-inventory-read`. This is **Release 0** of `plans/2026-10-06-decouple-stock-status.md`
(Phase 0, item 5), split out so the main plan stays open. **Backend work**, in `../NowTech-backend-` on branch
`fix/etat-stock-inventaire-non-compte`. The backend is now in scope (user, 2026-10-06; `AGENTS.md:491`
corrected). Evidence: `reports/2026-10-06-assessment-manual-product-stock-status-rerun.md`, finding 3.

## The defect

For a product with no stock-registry row, two admin reads disagree:

| Read | Code | Says (product flagged available) |
| :-- | :-- | :-- |
| `GET .../produits/:id` and the list | `statutStockSql()` (`administration.service.ts:305, 349`) | `en_stock`, quantity 0, `modifie_le: null` |
| `GET .../produits/:id/inventaire` | `lireEtatStock` (`administration.service.ts:768-776`): `ligne?.statut ?? 'rupture'` | **`rupture`**, quantity 0, `modifie_le: null` |

PRs #12 and #13 fixed seven reads and a guard test (`public/statut-stock.spec.ts`) to stop the fallback to
`'rupture'` coming back. This one slipped through because the guard's pattern only matches
`coalesce(x.statut::text, 'rupture')`, not the `?? 'rupture'` form.

The panel's Stock tab reads the second endpoint, so every uncounted product shows `rupture` there.

## Change

| | |
| :-- | :-- |
| **What** | `lireEtatStock` reads through one raw query that joins `nowtech.produits` to `boutique.produit_stocks` and takes the status from `statutStockSql()`, like the detail projection. Throws `NotFoundException` if the product is gone. `lireEtatStock` is also what `ajusterStock` and `changerStatutStock` return after writing; a row exists then, so the result is unchanged for them. |
| **Where** | `src/catalogue/administration/administration.service.ts:768-776` |
| **Done when** | the new unit test passes and the widened guard passes. |

The guard's pattern is widened to also reject `?? 'rupture'`
(`src/catalogue/public/statut-stock.spec.ts`), so the next copy of this mistake fails a test.

## Tests (written first, both must fail before the change)

1. **Guard, `statut-stock.spec.ts`:** no catalogue source may fall back to `'rupture'` with `??`. It fails today
   on `administration/administration.service.ts`.
2. **`administration.inventaire.spec.ts`:** `lireInventaire` for a never-counted product flagged available
   reports `en_stock`, quantity 0 and `modifie_le: null`; flagged unavailable reports `rupture`; a counted
   product still reports its own row. One describe, following the file's `lireProduit` tests.

Not tested: the SQL against a real database. The spec file mocks `$queryRawUnsafe`, so these assert the
mapping and that the query joins the registry and reads the catalogue flag. The guard test is the structural
regression barrier.

## Deploy and risk

Backend only, no migration, no new route, response shape unchanged. Merging to `main` deploys (Coolify, about
two minutes); a failing build keeps the previous image serving. Risk is low: one read, one consumer.

**Does not fix the product list.** The list already uses `statutStockSql()`. The user's report that the list
shows 4 000+ products out of stock is not explained by this change; see the walkthrough's notes.
