# Catalogue : produits vérifiés, attributs de catégorie, nouveaux champs et lignes refusées

## Objectif

Lot 1 du plan maître `../plans/2026-10-16-commande-simplifiee-et-catalogue.md`, côté panel. La direction doit pouvoir :

- poser ou retirer le badge « Vérifié par KatiHub » sur l'offre d'une boutique (KatiHub a reçu et testé l'article) ;
- définir les attributs de variante d'une catégorie ;
- voir en modération la description courte, la fiche technique (texte et PDF) et le minimum de commande (MOQ) ;
- rembourser l'acompte des lignes refusées par une boutique sans suivi de stock.

## Contrat backend

- `GET /v1/marketplace/moderation/offres-publiees?recherche=&filtre=toutes|verifiees` : les offres publiées, les vérifiées d'abord (50 au plus).
- `POST /v1/marketplace/moderation/offres-publiees/:offreId/verification` avec `{ verifiee, note? }` (note de 3 à 300 caractères). Le badge ne se pose que sur une offre publiée (409 sinon).
- `PATCH /v1/marketplace/categories/:id` et `POST /v1/marketplace/categories` acceptent `attributsVariante` (6 au plus, 40 caractères chacun). Une sous-catégorie sans attributs reprend ceux de sa catégorie.
- Les files de modération exposent `descriptionCourte`, `ficheTechnique` et `ficheTechniquePdfUrl` (produits, contenus), ainsi que `quantiteMinimale` (révisions d'offre).
- `GET /v1/marketplace/refus-lignes?filtre=a_rembourser|tous`, `POST …/:id/remboursement` (`{ telephone? }`) et `POST …/:id/rapprochement`. Le payout Fapshi et son rappel sont ceux des retours.

## Phases

1. **Données** : `app/types/api/marketplace-catalogue-quality.ts`, `app/composables/useCatalogueQuality.ts`, clés `verifiedOffers` et `refusedLines` dans `app/utils/api-query-keys.ts`.
2. **Écrans** :
   - les onglets direction « Produits vérifiés » (`VerifiedOffersWorkspace.vue`) et « Lignes refusées » (`RefusedLinesWorkspace.vue`) dans `app/pages/operations.vue` ;
   - le champ « Attributs de variante » de `MarketplaceCategoriesWorkspace.vue` ;
   - les nouveaux champs dans `MarketplaceCatalogueModerationWorkspace.vue` ;
   - les traductions fr et en.
3. **Tests** :
   - `test/nuxt/catalogue-quality-workspaces.test.ts` ;
   - `test/nuxt/marketplace-categories-workspace.test.ts` ;
   - `test/nuxt/marketplace-content-moderation.test.ts` ;
   - `test/nuxt/operations-page.test.ts`.
