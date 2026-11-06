# Compte rendu : le statut de stock remplace les quantités, et le minimum commandable partout

Plan : `plans/2026-11-06-statuts-de-stock.md`.

## Résultat

- **Les trois statuts** :
  - **En stock** et **En réapprovisionnement** se commandent ;
  - **Hors stock** reste visible sur le catalogue, la page produit et la page de la boutique, mais le bouton d'achat est désactivé ;
  - la page d'accueil, elle, n'affiche toujours que ce qui s'achète, comme avant.
- **Page produit** :
  - une pastille de couleur indique le statut : vert pour En stock, orange pour En réapprovisionnement, rouge pour Hors stock ;
  - le message sous le bouton d'achat :
    - « En stock chez ce vendeur » ;
    - « En réapprovisionnement chez ce vendeur : vous pouvez commander, la boutique confirme le délai » ;
    - « Hors stock chez ce vendeur : cette offre ne peut pas être commandée pour le moment » ;
  - « **Minimum commandable : N** » s'affiche toujours, même pour 1.
- **Cartes produit** : elles affichent le statut, avec une icône et une couleur.
- **Espace vendeur** :
  - la liste des offres montre le statut et « Minimum commandable : N » ;
  - un choix « Statut du stock », appliqué tout de suite, remplace la saisie du stock total ;
  - dans la modification en lot, la colonne « Statut du stock » remplace la colonne Stock ;
  - plus de « Stock initial » à la création d'une offre ou d'une variante.
- **Inscription et paramètres de la boutique** : la question « Suivez-vous votre stock ? » a disparu.
- **Panel** :
  - « Rupture de stock » s'appelle « Hors stock » ;
  - le minimum s'appelle « Minimum commandable », sur la fiche produit et dans les offres ;
  - la fenêtre « Disponibilité » ne demande plus de quantité, et son aide décrit la nouvelle règle.
- **Correction au passage** (travail du 5 novembre) : le groupe « Logistique » du menu ne s'allumait pas sur l'onglet Kati Express. Le test de navigation le signalait ; c'est corrigé dans un commit séparé.

## Données

La migration `20261106120000_statut_stock_remplace_quantites` :
- passe en **Hors stock** chaque offre d'une boutique qui suivait son stock et n'avait plus de pièce disponible ;
- passe toutes les boutiques à `suivi_stock = false`, avec ce défaut pour les nouvelles.

Les quantités restent en base, sans être utilisées.

## Vérification

- **Backend** :
  - 2 nouveaux tests : statut choisi par la boutique, et statut inconnu ou offre d'une autre boutique refusés ;
  - 10 tests qui décrivaient l'ancienne règle des quantités sont réécrits avec la nouvelle : rayons de l'accueil, facettes, panier, fiche, accessoires, catalogue du panel, paramètres de la boutique ;
  - 767 tests passent dans marketplace, vendeurs et assistant. Les 5 échecs restants (notifications marketplace, PDF du devis) existaient déjà.
- **Site** : 24 tests de bout en bout passent, dont le statut en lot et la variante sans stock initial. Les 10 échecs restants sont exactement ceux d'avant ce chantier.
- **Panel** :
  - catalogue, disponibilité et navigation : les tests passent ;
  - contrôles de traduction sans erreur ;
  - le test de palette de couleurs échouait déjà avant, sans lien avec ce chantier.
