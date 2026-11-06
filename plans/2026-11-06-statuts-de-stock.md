# Plan : le statut de stock remplace les quantités, et le minimum commandable partout

## Besoin

- Trois statuts de stock, à la place des quantités : **En stock**, **En réapprovisionnement**, **Hors stock**.
- Le **vendeur** choisit le statut depuis son espace. L'**équipe** garde la main depuis le panel.
- **Hors stock** : le produit reste visible avec son statut, mais ne s'achète pas.
- **En réapprovisionnement** : le produit se commande.
- L'option « je ne suis pas mon stock » est **retirée** (option B, choisie le 6 novembre).
- Le **minimum commandable** est affiché sur la fiche produit chez le vendeur, dans le panel et sur la page produit, même quand il vaut 1.

## Ce que ça change ailleurs (annoncé avant de modifier, accepté)

1. Plus de saisie de quantités : la colonne Stock en lot et le « Stock initial » disparaissent.
2. Plus de réservation de pièces à la commande. Si la boutique n'a plus l'article, elle refuse la ligne et le client est remboursé.
3. Le palier « produit réservé » du paiement en plusieurs fois ne met plus de pièces de côté.
4. Le message du devis « moins de N unités » disparaît.
5. Chaque offre reçoit un statut tiré de sa quantité actuelle. Les quantités restent en base.

## Étapes

1. **Backend** :
   - `estCommandable` (tout sauf Hors stock) et `disponibleOffre` décident d'après le statut seul ;
   - le catalogue, la fiche produit et la boutique montrent aussi Hors stock. L'accueil n'affiche toujours que ce qui s'achète, sans changement ;
   - commande, devis et paiement en plusieurs fois : Hors stock refusé, En réapprovisionnement accepté ;
   - `POST marketplace/boutiques/:id/offres/:offreId/statut-stock` ;
   - inscription et paramètres de la boutique : `suiviStock` passe à faux et est ignoré ;
   - migration `20261106120000_statut_stock_remplace_quantites`.
2. **Site** :
   - statut affiché sur la page produit et les cartes ;
   - « Minimum commandable : N » toujours visible sur la page produit ;
   - un choix du statut dans la liste des offres et dans la modification en lot ;
   - plus de stock initial (offre et variante) ;
   - question du suivi de stock retirée de l'inscription et des paramètres.
3. **Panel** : « Rupture de stock » devient « Hors stock », et « Quantité minimale (MOQ) » devient « Minimum commandable ». L'aide de la fenêtre Disponibilité est mise à jour.
