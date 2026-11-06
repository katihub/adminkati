# Plan : familles à l'inscription, trois catégories par produit, prix publié sans validation

## Besoin

1. **Inscription vendeur** : ne proposer que les grandes familles de catégories, sans les sous-catégories. Le choix reste facultatif.
2. **Produit** :
   - jusqu'à **3 catégories en tout**. La première choisie est la principale et garde les règles : garantie minimale, variantes, paiement en plusieurs fois, installation. Les deux autres font apparaître le produit dans leurs rayons ;
   - les trois sont des catégories précises (sous-catégorie ou catégorie d'accessoires), comme la principale aujourd'hui ;
   - quand un vendeur change les catégories, c'est appliqué tout de suite, sans validation.
3. **Prix** : le prix et le prix barré d'une offre sont publiés tout de suite, sans validation. Le prix barré doit être supérieur au prix. Le panel ne garde pas de trace de ces changements.

## Étapes

1. **Backend** :
   - migration `20261106100000_categories_supplementaires_produit` : la colonne `categories_supplementaires`, avec 2 au plus et un index GIN ;
   - `resoudreCategoriesSupplementaires` et `verifierGarantieNouvelleCategorie` (dans le service des catégories) ;
   - création d'un produit (panel et vendeur) et correction depuis le panel : les catégories supplémentaires sont acceptées ;
   - catalogue public : un produit apparaît dans le rayon de sa principale et dans ceux des deux autres ;
   - `POST marketplace/boutiques/:id/produits/:produitId/categories` : changement direct, seulement pour un produit proposé par la boutique. Une nouvelle principale doit être tenue par les garanties des offres publiées ;
   - `POST marketplace/boutiques/:id/offres/:offreId/prix` : publication directe, qui reporte aussi le prix sur une révision encore en validation ;
   - inscription : une grande famille est acceptée.
2. **Site** :
   - inscription : seules les familles sont proposées ;
   - nouveau produit : deux « Autres catégories » facultatives ;
   - liste des produits : un bouton « Catégories » ouvre une fenêtre et publie tout de suite ;
   - modification en lot et fenêtre « Prix et minimum » : le prix part sur la nouvelle route, le minimum et le délai restent en validation.
3. **Panel** : la fiche produit (création et correction) propose deux « Autres catégories ».
