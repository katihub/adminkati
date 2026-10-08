## What I built

`lireEtatStock` in the backend (`GET .../produits/:id/inventaire`, and the state returned after a stock
adjustment or status change) now reads the status through `statutStockSql()`, the same fallback the product
list and detail already use. A product nobody has counted, which the catalogue flags available, is reported
`en_stock` instead of `rupture`. The backend's guard test is widened so the `?? 'rupture'` form of this
mistake can no longer pass. Done inline as one test-first loop (no sub-agents), in `../NowTech-backend-` on
branch `fix/etat-stock-inventaire-non-compte`, committed locally and not pushed.

## Plan coverage

Plan: `plans/2026-10-06-fix-uncounted-inventory-read.md`.

| Plan item | Status | Where |
| :-- | :-- | :-- |
| `lireEtatStock` reads through `statutStockSql()` and 404s if the product is gone | Done | `src/catalogue/administration/administration.service.ts:768-791` |
| Widen the guard to reject `?? 'rupture'` | Done | `src/catalogue/public/statut-stock.spec.ts:54-59` |
| Test: a never-counted product flagged available reads `en_stock`, quantity 0, no date, via the fallback SQL | Done, by rewriting an existing test (see Deviations) | `src/catalogue/administration/administration.inventaire.spec.ts:705-716` |
| Test: a counted product still reports its own row | Done by an existing test | `administration.inventaire.spec.ts:~651` (`maps the stock row...`) |
| `AGENTS.md` no longer says the backend is read-only | Done (extra, requested) | `AGENTS.md:490-491` in this repo |

## Deviations

1. **I did not add a new `describe`; I changed five existing tests.** The plan said "one describe, following the
   `lireProduit` tests". The inventory harness (`construireInventaire`) mocked the old Prisma call
   (`produitStock.findUnique`), so five existing tests failed once the service stopped using it (the full
   catalogue run showed 5 failures). I moved the harness to a raw-query fake and updated each:
   `reads the ledger newest first...`, `throws not found without reading stock...`, `adjusts on behalf of the
   caller...` (call-order assertion), and the `changerStatutStock` and `lireInventaire` mapping tests, which only
   needed the harness.
2. **One of those tests asserted the bug.** `reports a product with no stock row as out of stock with zero
   quantity` required `rupture`. It now requires `en_stock` through the fallback, with a comment saying why,
   which is what PR #12 did for the three tests it corrected. I removed my own earlier separate block, which
   duplicated two existing tests.
3. **The red run was only half right.** The widened guard failed for the right reason (it named
   `administration/administration.service.ts`). My two unit tests failed with
   `TypeError: Cannot read properties of undefined (reading 'findUnique')`, because the old code used a
   different Prisma API than the harness mocked, so that run does not prove they detect the bug. The guard
   is the real regression barrier.
4. **I ran `npx prisma generate`** in the backend (local, untracked) because the pulled `schema.prisma` added
   `Client.sansCompte` and the generated client was stale.

## Tests

Red, before the change (`npm test -- src/catalogue/public/statut-stock src/catalogue/administration/administration.inventaire`):

```
● les lectures du registre › ne retombent jamais directement sur « rupture »
    +   "administration/administration.service.ts",
● ...lireInventaire — the status of a product nobody has counted › ... TypeError: Cannot read properties of undefined (reading 'findUnique')
Tests: 3 failed, 128 passed, 131 total
```

Green, after the change and the test updates (`npm test -- src/catalogue src/inventaire`):

```
Test Suites: 31 passed, 31 total
Tests:       805 passed, 805 total
```

Full backend suite. Before regenerating the client it showed `7 failed` suites, every one a ts-jest compile
error `Property 'sansCompte' does not exist` in `commandes`, `paiements` and `profil` code I did not touch.
After `npx prisma generate`:

```
Test Suites: 6 skipped, 97 passed, 97 of 103 total
Tests:       317 skipped, 1716 passed, 2033 total
```

`npx tsc --noEmit -p tsconfig.json`: no errors after regenerating (it printed 12 `sansCompte`/`profil` errors
before, none in files I touched).

**Not run: `eslint`.** It is not installed in this checkout (`node_modules/.bin/eslint` is absent), so I could
not lint. The backend's PR checks (`.github/workflows/verifications.yml`) will.

Covered: the status mapping and the SQL going through the fallback for an uncounted product, and the guard
against the `??` form. Not covered: the SQL against a real database. The spec mocks `$queryRawUnsafe`, and the
6 skipped suites are the ones that need a database (none here).

## Not done

- **Not pushed, no pull request, not deployed.** The backend's rules are a branch and a PR, never a direct
  push to `main`; merging deploys to production. The pull request is opened once, at the end of the whole
  change.
- **The product list.** This change does **not** explain or fix the report that the list shows 4 000+ products
  out of stock. The list, detail and filters already used `statutStockSql()`; see the notes below.

## Notes for the reviewer

- **Behaviour change beyond the Stock tab:** `lireEtatStock` also returns the state after `ajusterStock` and
  `changerStatutStock`. A row exists by then, so the values are unchanged, but it now also throws a 404 if the
  product vanished mid-request (previously it returned zeros).
- **The list symptom is unexplained.** Probed read-only on 2026-10-06 against the public production API:
  `/sante` 200, public list total 3 962, cart check `commandable: true` on an uncounted in-stock product, so
  PRs #12 and #13 are live. This panel's `.env` points at `http://localhost:3001`, which was not running.
  Which backend the deployed panel calls is not recorded in this repo. A decisive check is the browser's
  network tab: the host of `/catalogue/administration/produits` and the `statut_stock` of its first rows.
- **The Prisma `produitStock` model is no longer read by the admin service.** Not removed: other services use it.
- `AGENTS.md` change was the only line in this repo's rules that called the backend read-only; the
  surrounding paragraph (French error details preserved) still holds until the backend supplies stable codes.

## Follow-up (2026-10-06, later the same day)

- **Terminology.** This plan and this walkthrough call the slice "Release 0". The user rejected
  release-by-release delivery: the work is one pass, in phases, on the current branch of each repository. It is
  simply Phase 0 item 5 of `plans/2026-10-06-decouple-stock-status.md`.
- **The product-list symptom is closed.** The user clarified that "all products out of stock" was the
  behaviour from before PRs #12 and #13 (products with no stock row read as `rupture`), that it has since been
  fixed externally, and that everything now shows in stock. The "unexplained" notes above are superseded.
- **Verified on the local stack after the user started both dev servers** (backend `:3001`, panel `:3000`; local
  database of 4 275 products, 2 002 with a stock row): `GET .../produits/60252` and `GET .../produits/60252/inventaire`
  both report `en_stock`, quantity 0, `modifie_le: null` (this is the Release 0 fix, observed live; the "before"
  was not run live); the status filters return 4 157 and 118, matching the database; in the panel the list shows
  "All 4 275" with In-stock badges, and the Stock tab of that product shows no "Mark as restocking" button.
  Read-only database queries and a locally signed dev token (`pnpm dev:jeton`) were used; nothing was written.

## Follow-up (2026-10-06): branch

The commit above (`0ee3747`) was made on a branch I created from `main`, `fix/etat-stock-inventaire-non-compte`.
The user wanted every backend change on the backend's `feat/ai-integration`, so the branch was fast-forwarded into
it (a pure fast-forward: `feat/ai-integration` was an ancestor) and the extra branch was deleted. The commit hash is
unchanged and `feat/ai-integration` now contains it.
