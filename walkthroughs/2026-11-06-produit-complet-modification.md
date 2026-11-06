# Compte rendu, partie 3 : la fiche de modification complète

Plan : `plans/2026-11-06-produit-propre-a-sa-boutique.md` (partie 3).

## Résultat

Dans l'espace vendeur, le bouton « Fiche et photos » devient **« Modifier la fiche »**. Il ouvre un seul écran, avec un badge sur chaque section pour dire ce qui se publie tout de suite et ce qui passe par la validation :

- **Général** (validé par KatiMarket) : nom, marque, description. Seuls les champs modifiés partent avec la demande de validation.
- **Catégories** (publiées tout de suite) : la principale et deux autres au plus.
- **Prix et variantes** (publiés tout de suite) : une ligne par variante (prix, prix barré, minimum commandable, statut du stock), chacune avec son bouton « Enregistrer ». « Ajouter une variante » reste disponible.
- **Vente et livraison** :
  - le délai de préparation est publié tout de suite, pour toutes les variantes ;
  - l'état et la garantie partent à la validation.
- **Photos et référencement** : inchangés, ils partent à la validation avec la section Général (« Soumettre le contenu à validation »).
- **Panel, modération du contenu** : le nom, la marque et la description proposés apparaissent à côté des valeurs actuelles.

## Modifications

- **BackendKati** :
  - `revisions_contenu_produit` reçoit les colonnes `nom`, `marque` et `description` (migration `20261106160000_fiche_produit_complete`, avec son rollback) ; l'approbation ne les applique que s'ils ont été proposés ;
  - la route `POST boutiques/:id/offres/:offreId/conditions` publie tout de suite le minimum, le délai et la livraison.
- **websitekati** : `vendeur/VenteDuProduit.tsx` (nouveau), `EditeurFicheProduit.tsx` (section Général, emplacement pour la vente) et `AdministrationProduits.tsx`.
- **adminkati** : `MarketplaceCatalogueModerationWorkspace.vue`, `types/marketplace-moderation.ts` et les traductions de la modération.

## Vérification

- **Backend** : tests des conditions (publiées et reportées sur la révision en attente ; livraison hors du périmètre de la boutique refusée ; demande vide refusée) et du nom et de la marque appliqués à l'approbation.
- **Site** : nouveau test de bout en bout « fiche complète » :
  - prix et prix barré publiés, délai publié ;
  - seul le nouveau nom part à la validation ;
  - la page ne s'élargit pas sur mobile.
  
  Il passe sur ordinateur et sur mobile. Les tests de la fiche existants passent avec le nouveau libellé du bouton. Restent les échecs déjà connus (catalogue-stock-moq ×3, le copilote).
- **Panel** : vérification des types et des traductions OK.
