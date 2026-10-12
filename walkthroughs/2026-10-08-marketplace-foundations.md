## What I built

Deux premières tranches backend des fondations marketplace : modèles vendeur/boutique/document, bootstrap de NowTech, identité vendeur séparée de l'équipe KatiHub, puis catalogue canonique, offres par boutique, stock durable et workflow de modération. Les migrations sont additives et ne transforment aucune commande historique.

La première brique de l'objectif financier est également présente : calculs purs en FCFA entiers pour l'acompte, la commission et la ventilation multi-vendeurs, sans `number` flottant dans les opérations proportionnelles.

La troisième tranche backend ajoute la commande marketplace sur la commande historique, sans réécriture de celle-ci : sous-commandes par boutique, instantanés tarifaires, réservations atomiques, clé d'idempotence du checkout, acompte confirmé de façon idempotente et registre financier à double entrée. Une contrainte PostgreSQL différée refuse à la validation toute transaction comptable ayant moins de deux écritures ou un total débit différent du total crédit.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Étendre les rôles et le contexte d'accès | Partial | `BackendKati/src/commun/garde/appelant.ts`, `BackendKati/src/commun/garde/garde-appelant.ts` |
| Ajouter les contrats vendeur/boutique | Partial | `BackendKati/src/vendeurs/`, `BackendKati/prisma/schema.prisma` |
| Transformer NowTech en boutique initiale | Done for bootstrap schema | `BackendKati/prisma/migrations/20261008120000_marketplace_vendeurs_boutiques/migration.sql` |
| Catalogue Produit/Offre | Backend foundation done | `BackendKati/src/marketplace/`, `BackendKati/prisma/schema.prisma` |
| Modération des offres | Backend workflow done | Submission, review ownership, atomic decision and public filtering |
| Administration vendeurs | Not started | Backend contracts landed first |
| Livraison, retours et avis | Not started | Later phases of the plan |
| Commandes multi-vendeurs et finance | Backend foundation in progress | `BackendKati/src/marketplace/commandes/`, `BackendKati/src/marketplace/finance/`, migration `20261009090000_marketplace_commandes_finance` |

## Deviations

- The plan anticipated UI and backend slices together. The first implementation deliberately stops at the backend boundary so the access model and migration can be verified before an admin UI depends on them.
- A vendor identity is resolved only on routes marked `@Vendeur()`. This is more precise than always giving vendor identity priority because the same Supabase user may buy as a customer and manage one or more shops.
- No owner membership was seeded for NowTech because no authoritative owner email/user identifier was provided. The vendor and shop are seeded; ownership will be attached through an explicit, auditable action.
- The role playbook asks for a separate Tester agent. No sub-agent was used because the active session instructions disallow delegation unless explicitly requested; the failing guard test was still written and observed before implementation.

## Tests

- `npm.cmd test -- --runInBand src/commun/garde/garde-appelant.spec.ts`
  - Red first: failed because `VENDEUR` did not exist.
  - Green after implementation: 10 tests passed.
- `npm.cmd test -- --runInBand src/vendeurs/vendeurs.dto.spec.ts src/vendeurs/vendeurs.service.spec.ts src/commun/garde/garde-appelant.spec.ts`
  - 3 suites passed, 17 tests passed.
- `npx.cmd prisma validate`
  - Schema valid.
- `npm.cmd run build`
  - Nest build passed after explicitly excluding vendor callers from legacy team-order reads.
- `npm.cmd test -- --runInBand src/marketplace/offres.service.spec.ts src/vendeurs/vendeurs.dto.spec.ts src/vendeurs/vendeurs.service.spec.ts src/commun/garde/garde-appelant.spec.ts`
  - 4 suites passed, 24 tests passed after the Product/Offer slice.
- Final `npm.cmd run build`
  - Nest build passed with the marketplace module and generated Prisma client.
- `npm.cmd test -- --runInBand src/marketplace/finance/calculs.spec.ts src/marketplace/offres.service.spec.ts`
  - 2 suites passed, 22 tests passed. This includes edge cases around the 1,000 FCFA deposit floor, ceiling, commission rounding and exact largest-remainder allocation.
- Regression marketplace ciblée du 9 octobre 2026 : 8 suites et 50 tests réussis.
  - couvre identité vendeur, isolation boutique, modération, lecture publique, calculs FCFA, planification multi-vendeurs, checkout idempotent, réservation de stock, acompte et double entrée ;
  - `npx.cmd prisma validate` réussi ;
  - `npm.cmd run build` réussi.
- Full suite: 95 suites passed, 6 skipped, 4 failed; 1,754 tests passed, 323 skipped, 6 failed.
  - Failures are outside the marketplace change: assertions in `sql/recherche-publique.spec.ts`, a shell text assertion in `scripts/repeter-sql.spec.ts`, Windows path separators in `src/catalogue/public/statut-stock.spec.ts`, and Windows storage paths in `src/stockage/stockage.service.spec.ts`.

## Not done

- The migration was validated structurally but not applied to a database because the migration target was not proven to be a disposable local database.
- Seller status transitions, KYC document upload, invitations, seller proposals for brand-new canonical products, expiration/libération des réservations, raccordement PSP de l'acompte, remboursements, soldes vendeurs, shipments and admin UI remain.
- The final legal document matrix and tax/invoicing model remain external validation gates.

## Notes for the reviewer

- Review whether seller memberships should remain route-selected identities or evolve into a multi-facet caller object when seller and customer functionality converge.
- Review the bootstrap commission of 1,000 basis points; it follows the current working hypothesis and remains configurable.
- `adminkati/package-lock.json` was already untracked before this implementation and was not modified intentionally. The repository declares Bun as its only package manager, but Bun is not installed on the workstation.
