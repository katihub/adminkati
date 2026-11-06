# Compte rendu, partie 2 : créer un produit complet en une fois

Plan : `plans/2026-11-06-produit-propre-a-sa-boutique.md` (partie 2).

## Résultat

- **Le formulaire « Nouveau produit » de l'espace vendeur** a deux sections de plus :
  - **4. Prix et variantes** : un tableau, avec une ligne par variante (nom, référence, prix, prix barré, minimum commandable, statut du stock).
    - On peut ajouter jusqu'à 20 lignes avec « Ajouter une variante », et retirer une ligne.
    - Un produit sans variante garde une seule ligne, sans nom.
    - Dès qu'il y a deux lignes, chacune doit avoir un nom.
  - **5. Vente** : état (neuf, reconditionné, occasion), garantie et délai de préparation.
    - La garantie part du minimum de la catégorie et ne peut pas descendre en dessous.
    - La livraison reprend les modes et les villes de la boutique.
- **Une seule validation.** Le produit, ses prix et ses variantes partent ensemble. Quand l'équipe approuve le produit, ses offres sont publiées avec lui, sans seconde validation de l'offre.
- **L'aperçu client** montre le prix de la première variante (et le nombre de variantes), au lieu de « Prix ajouté après validation ».
- La note de l'aperçu indique : « Fiche, photos, prix et variantes sont vérifiés ensemble par KatiMarket : tout est publié dès la validation. »
- **Sur mobile**, le tableau des variantes défile dans son cadre, sans élargir la page.
- **Au passage** : le formulaire plantait quand une sous-catégorie arrivait sans liste d'accessoires. Il le tolère désormais.

## Modifications

- **BackendKati** :
  - route `POST marketplace/boutiques/:id/produits-complets` (`CreerProduitCompletDto` : produit, vente, variantes) ;
  - `creerOffreDans`, `proposerDans` et `publierRevision`, extraits pour être réutilisés ;
  - `publierOffresDuProduit`, appelé quand un produit est approuvé ;
  - tests `produit-complet.spec.ts` ; la simulation de `moderation-point-focal.spec.ts` est complétée.
- **websitekati** :
  - `vendeur/PrixEtVariantes.tsx` et sa feuille de style ;
  - `AdministrationProduits.tsx` (formulaire et aperçu) ;
  - tests de bout en bout `catalogue-vendeur`.

## Vérification

- **Backend** : 5 nouveaux tests :
  - deux variantes créées avec leur prix, leur statut et leur révision ;
  - noms en double, nom manquant et garantie trop basse refusés ;
  - au moins un prix exigé ;
  - offres publiées à l'approbation du produit ;
  - rien publié si le produit est refusé.
  - Les suites marketplace, vendeurs et assistant passent, hors échecs déjà connus.
- **Site** :
  - 24 tests de bout en bout passent, dont le nouveau « produit complet » (deux variantes, nom exigé, garantie), sur ordinateur et sur mobile ;
  - le test « classe son produit dans une catégorie », qui échouait déjà avant, passe aussi ;
  - reste le test du copilote, qui échouait déjà.

## Reste pour la partie 3

La fiche de **modification** complète : un seul écran, avec les sections Général, Médias, Prix et variantes, Vente et livraison, Référencement.
