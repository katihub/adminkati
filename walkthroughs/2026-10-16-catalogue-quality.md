# Walkthrough — produits vérifiés, attributs de catégorie, nouveaux champs, lignes refusées

Plan : `plans/2026-10-16-catalogue-quality.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Données | fait | `app/types/api/marketplace-catalogue-quality.ts`, `app/composables/useCatalogueQuality.ts`, `app/utils/api-query-keys.ts` (`verifiedOffers`, `refusedLines`) |
| 2. Écrans | fait | `VerifiedOffersWorkspace.vue`, `RefusedLinesWorkspace.vue` (onglets direction `verified-offers` et `refused-lines`), attributs dans `MarketplaceCategoriesWorkspace.vue`, nouveaux champs dans `MarketplaceCatalogueModerationWorkspace.vue`, types `marketplace-categories.ts` et `marketplace-moderation.ts`, traductions `operations.verifiedOffers.*`, `operations.refusedLines.*`, `operations.categories.*` et `operations.catalogue.*` |
| 3. Tests | fait | `catalogue-quality-workspaces.test.ts` (2 cas), `marketplace-categories-workspace.test.ts` (1 cas ajouté, 1 adapté), `marketplace-content-moderation.test.ts` (textes et PDF), `operations-page.test.ts` (deux onglets) |

## Écarts par rapport au plan

- Les attributs se saisissent dans un seul champ, séparés par des virgules. Le panel retire les espaces et les doublons sans tenir compte de la casse, comme le backend.
- Un payout déjà soumis à Fapshi ne se relance pas depuis l'écran : seul le bouton « Vérifier chez Fapshi » apparaît, pour éviter un double virement.
- Le bloc « action puis toast » était recopié dans chaque écran : fallow l'a signalé au troisième exemplaire. Il vit désormais dans `app/composables/useToastAction.ts`, repris par les frais de livraison et les catégories.
- Le gabarit de `app/pages/operations.vue` dépasse le seuil de complexité cognitive avec deux branches de plus. Il ne contient qu'une branche par onglet : l'alerte est neutralisée par `<!-- fallow-ignore-next-line complexity -->` au-dessus de la première liaison du gabarit, la ligne où fallow ancre son constat.

## Tests exécutés

```
bunx vitest run test/nuxt/catalogue-quality-workspaces.test.ts test/nuxt/marketplace-categories-workspace.test.ts test/nuxt/operations-page.test.ts test/nuxt/marketplace-content-moderation.test.ts
      Tests  45 passed (45)
bunx vitest run           → 2060 passed, 1 échec instable (proposal-workspace, passe seul)
bun run typecheck         → aucune erreur
bun run i18n:check        → ok
```

## Notes pour le relecteur

- Le badge vaut pour l'offre d'une boutique, jamais pour le produit chez toutes les boutiques. Retirer le badge efface aussi la note.
- Le montant dû d'une ligne refusée vient du backend : c'est la part d'acompte qui ne couvre plus aucun article. Quand la livraison encaisse simplement moins, il vaut 0 et la ligne n'apparaît pas dans « À rembourser ».
