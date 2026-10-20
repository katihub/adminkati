# Review — Sous-catégories d’accessoires

## Verdict
La structure à trois niveaux, l’admin, le sélecteur vendeur et les suggestions sont présents. Je recommande toutefois de corriger les deux écarts de logique ci-dessous avant de considérer la fonctionnalité prête: l’héritage de garantie au troisième niveau n’est pas appliqué à la validation des offres, et la limite de huit offres est prise avant l’exclusion du stock épuisé.

- MAJOR: 0 · MEDIUM: 2 · MINOR: 0 · INT: 1
- Tests: backend Jest ciblé → 2 suites / 32 tests passés; admin Vitest ciblé → 1 fichier / 8 tests passés; website Node tests → 3 tests passés; website `pnpm.cmd exec tsc --noEmit` → passé.

## Plan fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| Création, sérialisation et limite stricte à trois niveaux | DONE | `BackendKati/src/marketplace/categories/categories.service.ts:80`, `:125` |
| Affichage, recherche et CRUD du niveau accessoire dans l’admin | DONE | `adminkati/app/components/operations/MarketplaceCategoriesWorkspace.vue:252`, `:294`; les 8 tests ciblés passent |
| Sélection facultative du niveau 3 par le vendeur | DONE | `websitekati/src/components/marketplace/vendeur/AdministrationProduits.tsx:154`, `:278` |
| Suggestions sur fiche produit et checkout, ajout explicite | DONE | `websitekati/src/components/marketplace/MarketplaceProductDetail.tsx:136`; `websitekati/src/components/marketplace/checkout/MarketplaceCheckout.tsx:226` |
| Recommandations actives, disponibles, excluant les articles du panier | PARTIAL | `BackendKati/src/marketplace/offres.service.ts:657`, `:667`; voir constat 2 |
| Héritage de garantie à travers les ancêtres | PARTIAL | L’arbre calcule le grand-parent, mais la validation d’offre ne le charge pas: `BackendKati/src/marketplace/categories/categories.service.ts:59` |

**Walkthrough accuracy:** Les éléments annoncés (niveau 3, recommandations bornées, ajout explicite, tests ciblés) sont globalement conformes. La garantie héritée et le fait que l’API puisse renvoyer moins de huit suggestions qu’il n’en existe ne sont pas mentionnés.

## Findings

### MAJOR

Aucun constat MAJOR.

### MEDIUM

**1. La validation d’une offre ignore la garantie du rayon lorsque la catégorie accessoire l’hérite indirectement**
- Where: `BackendKati/src/marketplace/categories/categories.service.ts:59`
- Axis: Logic and correctness
- Problem: `garantieEffective()` sait remonter au grand-parent, mais `garantieMinimaleProduit()` ne sélectionne que la catégorie et son parent immédiat. Pour une catégorie de niveau 3 sans garantie propre, dont le parent de niveau 2 n’en a pas non plus, le minimum du rayon (niveau 1) n’est pas chargé; la validation traite alors le minimum comme 0.
- Failure: rayon à 6 mois, sous-catégorie sans garantie, catégorie accessoire sans garantie → l’API publique d’arbre affiche 6 mois hérités, mais une offre avec une garantie de 0 mois peut passer `exigerGarantieMinimale()`.
- Fix: charger le parent et le grand-parent dans `garantieMinimaleProduit()` et ajouter un test couvrant une garantie héritée du niveau 1.

**2. Les huit premières offres sont tronquées avant de retirer celles sans stock**
- Where: `BackendKati/src/marketplace/offres.service.ts:657`, `:667`
- Axis: Logic and correctness
- Problem: La requête Prisma applique `take: 8`, puis le code filtre les offres avec `disponible === 0`. La limite est donc appliquée avant le filtre de disponibilité.
- Failure: si les huit offres publiées les plus récentes dans les catégories accessoires sont épuisées mais qu’une neuvième offre est disponible, l’endpoint retourne `[]`; les deux interfaces masquent alors entièrement la section malgré une offre achetable.
- Fix: filtrer le stock avant de limiter à huit (par exemple en filtrant côté requête selon le modèle de stock ou en récupérant un ensemble borné plus large puis en limitant après calcul), avec un test qui place une offre disponible après huit offres épuisées.

### MINOR

Aucun constat MINOR.

### INT

- Le choix d’utiliser tout enfant de niveau 3 comme branche d’accessoires, sans champ sémantique, est explicitement documenté dans le walkthrough. Cela correspond à l’interprétation fonctionnelle retenue; si d’autres types de sous-catégories niveau 3 sont introduits, prévoir une désignation explicite.
- La revue visuelle navigateur n’a pas été effectuée; les tests de composants et de logique ci-dessus ont été exécutés.

## Clean axes

Sécurité, performance hors limite d’offres, UI/UX (parcours et ajout explicite), et qualité du code n’ont pas produit de constat actionnable dans le périmètre inspecté. Tests ciblés exécutés ci-dessus; les tests n’exercent pas encore les deux cas limites relevés.

## Addendum — suivi des constats

Vérification du 2026-10-20 après correctifs:

- **MEDIUM 1 — FIXED.** `garantieMinimaleProduit()` charge maintenant jusqu’au grand-parent; un test couvre l’héritage du rayon pour une catégorie accessoire sans règle propre.
- **MEDIUM 2 — FIXED.** L’endpoint récupère jusqu’à 40 offres, filtre celles qui sont indisponibles, puis limite le résultat à 8; le test ciblé vérifie le sur-échantillonnage (`take: 40`).
- Tests backend relancés: `pnpm.cmd exec jest src/marketplace/categories/categories.service.spec.ts src/marketplace/offres.service.spec.ts --runInBand` → 2 suites passées, 33 tests passés.
