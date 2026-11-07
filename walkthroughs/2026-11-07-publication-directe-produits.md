# Compte rendu : un produit soumis est publié tout de suite, l'équipe contrôle après

Plan : `plans/2026-11-07-publication-directe-produits.md`.

## Résultat

- **Publication directe** : une boutique dont le vendeur est **actif** met en ligne tout de suite :
  - le produit complet, avec ses prix et ses variantes ;
  - un prix ajouté à un produit qui n'en avait pas ;
  - une modification de prix, d'état ou de garantie ;
  - une modification des textes ou des photos.

  L'approbation est enregistrée sans membre de l'équipe (`decidePar` nul).
- **Vendeur sous surveillance** : rien ne change pour lui, tout passe encore par la validation.
- **L'équipe est prévenue** :
  - la notification « Nouveau produit en ligne », « Nouveau prix en ligne », « Produit modifié » ou « Fiche produit modifiée » est envoyée à la direction et au point focal de la boutique ;
  - elle ouvre l'onglet **Produits à contrôler**.
- **Panel, onglet « Produits à contrôler »** (direction et point focal) :
  - la liste montre ce qui a été publié ou modifié et que l'équipe n'a pas encore vu, du plus récent au plus ancien, avec :
    - la photo, la boutique, la catégorie et le prix le plus bas (ou « Sans prix ») ;
    - un badge « Nouveau » ou « Modifié » ;
  - les actions possibles :
    - **Vu** ;
    - **Masquer**, avec un motif. Cela se rétablit, et seule l'équipe peut le faire ;
    - **Rétablir** ;
    - **Demander une correction**, avec un motif : le produit reste en ligne ;
    - **Supprimer**, avec un motif et pour la direction seule : le produit et ses offres sont archivés, rien n'est effacé ;
    - **Modifier la fiche** (direction) : ouvre la fiche existante du catalogue.

  Le vendeur reçoit une notification à chaque action, avec le motif.
- **Espace vendeur** :
  - l'onglet **Offres** a disparu. Les variantes, le prix et le minimum se gèrent dans la fiche produit ;
  - un produit en ligne sans prix affiche, sur sa ligne, « Sans prix : ajoutez un prix », avec un champ et le bouton « Mettre en vente ». L'offre reprend :
    - les modes et villes de livraison de la boutique ;
    - la garantie minimale de la catégorie ;
    - un délai de 2 jours ;
  - les boutons et messages disent « Mettre en ligne » et « Produit en ligne ». Pour un vendeur sous surveillance, l'espace garde « Soumettre à la validation » ;
  - un produit masqué affiche « Masqué par KatiMarket » et le motif ;
  - pour les photos, une indication discrète apparaît : « Format carré conseillé : 1 000 × 1 000 px (800 px minimum) · produit centré sur fond blanc ou clair · JPEG, PNG ou WebP, 5 Mo max. » Chaque photo choisie est mesurée : sous 800 px de côté, ou plus allongée que 1,5 pour 1, un avertissement s'affiche, sans bloquer l'envoi.
- **Reprise** : le script `BackendKati/scripts/publication-directe-reprise.mjs` publie ce qui attendait une validation chez les boutiques actives. Il notifie aussi les boutiques qui ont des produits sans prix.

## Ce qui change ailleurs (accepté le 7 novembre)

1. Un produit interdit ou trompeur reste visible tant que l'équipe ne l'a pas masqué.
2. Les modifications de textes et de photos ne repassent plus en validation.
3. L'onglet Offres disparaît. Le badge « Vérifié par KatiMarket » et le minimum ne s'y lisent donc plus côté vendeur : le minimum reste visible dans la fiche produit.
4. Seule l'équipe rétablit un produit masqué.
5. Le badge « Vérifié par KatiMarket » reste facultatif.

## Fichiers

- **BackendKati** :
  - la règle `src/marketplace/publication-directe.ts` ;
  - les services `offres.service.ts` et `produits/contenu-produit.service.ts` ;
  - le nouveau service `controle-produits.service.ts` et son contrôleur ;
  - la migration `20261107120000_publication_directe` (colonne `a_controler_depuis`) ;
  - le script de reprise.
- **adminkati** :
  - `components/operations/ProductsToCheckWorkspace.vue` ;
  - `composables/useProductChecks.ts` ;
  - `utils/product-check.ts` ;
  - les traductions `operations.productChecks` ;
  - l'onglet et l'entrée de menu.
- **websitekati** :
  - `lib/publication-produit.ts` ;
  - `AdministrationProduits.tsx`, `EditeurFicheProduit.tsx`, `VenteDuProduit.tsx` et `SellerWorkspace.tsx`.

## Tests

- **BackendKati** :
  - `publication-directe.spec.ts` (6 tests), `controle-produits.spec.ts` (9 tests), les cas actif et sous surveillance de `contenu-produit.service.spec.ts` ;
  - les anciens tests de validation tournent désormais sous un vendeur sous surveillance ;
  - le script de reprise : `node --test scripts/publication-directe-reprise.test.mjs` (3 tests).
- **adminkati** :
  - `test/unit/product-check.test.ts` et `test/nuxt/products-to-check-workspace.test.ts` ;
  - la navigation et les onglets du point focal sont mis à jour.
- **websitekati** :
  - `qa/publication-produit.test.mjs` (4 tests) ;
  - e2e : produit sans prix, variante depuis la fiche, vendeur sous surveillance, conseil photos, et les messages « en ligne ».
- **Échecs qui existaient déjà, sans lien avec ce lot** :
  - e2e copilote ;
  - ancien formulaire de proposition et suivi de stock (`catalogue-stock-moq`) ;
  - panel : bannières, palette, avis signalés (« KatiHub » devenu « KatiMarket ») ;
  - backend : SQL, PDF et devis.

## Mise en ligne

1. Pousser les trois dépôts, puis redéployer. La migration s'applique au déploiement du backend.
2. Lancer `node --env-file=.env.prod scripts/publication-directe-reprise.mjs` (audit), puis `--apply` sur accord.
