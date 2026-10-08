# Backend product status translations — re-audit after `origin/main` merge

## Question

Merge `origin/main` into the backend's current branch (`feat/ai-integration`) again, then re-run the product-status translation audit from [`2026-10-02-audit-backend-product-status-translations.md`](2026-10-02-audit-backend-product-status-translations.md).

## Method

Fetched `origin` in `/Users/michaelnji/Projects/nvc/NowTech-backend-`, compared refs, ran `git merge origin/main`. Re-ran the scripted exact-path check over all 67 product-flow status keys in EN and FR against the current admin worktree, `origin/main`, and `origin/development`; re-ran `bun run i18n:check`; re-read the backend status enums in the merged tree.

**Not examined:** same limits as the first report — the storefront repository, rendered screens, and database contents.

## Findings

- **The merge was a no-op: nothing new on `origin/main`.** It is still `3ff1e54` (verified against the remote with `git ls-remote`, not just the local tracking ref), identical to `feat/ai-integration`; `git merge origin/main` printed "Already up to date". No conflicts, no working-tree changes.
- **The audit result is unchanged: no product status lacks a translation.** 67/67 exact key paths are present in EN and FR on the current worktree, `origin/main`, and `origin/development`; `bun run i18n:check` passes.
- **The backend vocabulary is identical to the first audit** (same commit): `StatutStock` (`en_stock`, `rupture`, `reapprovisionnement`), `TypeMouvementStock` (5 values), `StatutStockPublic` (3), `MotifRefus` (7), `CODES_ERREUR_LIGNE` (10).
- **The one standing representation gap still stands:** uncounted products are sellable and storefront-visible through the fallback (`vitrine-catalogue.sql.ts:39`, `inventaire.service.ts:399-419`) but badge as `rupture` in the admin (`administration.service.ts:375,419`). No commit has addressed it.
- The admin remote branches were also unchanged today (`origin/main` `78f9250`, `origin/development` `addf36c`), and the stale `main/` and `feat-product-delivery/` admin worktrees still lack `reapprovisionnement`.

## Recommendation

Unchanged from the first report. No translation work is required for product statuses; decide how never-counted products should be displayed in the admin (effective-availability fallback in the projection, or a distinct "not counted" label).
