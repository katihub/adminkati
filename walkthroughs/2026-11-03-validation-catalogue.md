# Walkthrough : validation des produits, photos visibles et approbation en bloc

Plan : [plans/2026-11-03-validation-catalogue.md](../plans/2026-11-03-validation-catalogue.md)

## Résultat

Dans **Opérations → Modération du catalogue** :
- **Produits** :
  - Le détail d'un produit montre les **photos envoyées par la boutique**, avec la mention « Proposée » ou « Publiée ».
  - « Approuver » se fait en un clic : il rend le produit actif et **publie ses photos**.
- **Offres** : le détail montre les **photos du produit** à côté du prix et des conditions. « Approuver » se fait en un clic et publie l'offre.
- **« Tout approuver (n) »** sous la liste, dans les files Produits et Offres :
  - après confirmation, toute la file affichée est approuvée, recherche et filtres compris, dans la limite de 100 éléments ;
  - un message indique combien d'éléments sont approuvés et combien sont refusés, avec le premier motif.

## Pour qu'un produit soit visible sur la page de la boutique

1. L'admin approuve le produit. Ses photos sont publiées avec lui.
2. La boutique crée son **offre** (prix, stock, livraison) depuis son espace. C'est possible dès que le produit est actif.
3. L'admin approuve l'offre.
4. Le stock doit être supérieur à 0 si la boutique suit son stock, et l'offre doit être « en stock ».

## Modifications

- **BackendKati** :
  - `src/marketplace/moderation-groupee.service.ts` : service et routes `…/produits/approbation` et `…/offres/approbation` ;
  - `offres.service.ts` : photos ajoutées aux listes de validation ;
  - `marketplace.module.ts` ;
  - `moderation-groupee.spec.ts` : 4 tests.
- **adminkati** :
  - `ModerationImages` et `ModerationBulkApprove` ;
  - `MarketplaceCatalogueModerationWorkspace.vue` ;
  - `useMarketplaceModeration.ts` ;
  - types ;
  - traductions ;
  - `test/nuxt/marketplace-catalogue-approval.test.ts` : 3 tests.

## Vérifications

- **Backend** : 88 tests de modération au vert (approbation groupée, point focal, offres, contenus produits). `tsc` et `eslint` sans erreur.
- **Panel** : les tests d'approbation et de modération des contenus passent. `vue-tsc` et les contrôles de traduction sont sans erreur.

## À savoir

- Déployer le backend avant le panel, sinon « Approuver » répond « introuvable ».
- La file « Contenus » sert toujours aux mises à jour des photos et du référencement d'un produit déjà actif.
