# Plan — l'équipe décide de la disponibilité des produits

## Demande (30 octobre)

L'admin doit pouvoir dire, pour un produit, s'il est **en stock**, **en rupture** ou **en réapprovisionnement**. En bref, décider s'il est disponible ou non.

## Constat

- Une offre marketplace était disponible **seulement d'après sa quantité** :
  - le stock suivi par la boutique, moins les réservations ;
  - ou toujours disponible si la boutique ne suit pas son stock.
- Le statut `en_stock / rupture / reapprovisionnement` n'existait que pour l'ancien catalogue NowTech (`ProduitStock`).
- Le panel ne pouvait pas modifier la quantité d'une offre : seul le vendeur le pouvait.

## Décisions

| Sujet | Décision |
|---|---|
| Où vit la disponibilité | Sur l'offre (`offres.statut_stock`), avec l'énumération existante `statut_stock`. Par défaut `en_stock` : rien ne change pour l'existant |
| Effet | `rupture` et `reapprovisionnement` retirent l'offre de la vente, quelle que soit sa quantité. `en_stock` laisse la quantité décider, comme avant |
| Où s'applique la règle | Un seul calcul, `disponibleOffre()` : catalogue, accueil, boutique, panier, accessoires et fiche produit. Création de commande, devis et paiement en plusieurs fois refusent aussi l'offre |
| Quantité | Pour une boutique qui suit son stock, l'équipe peut corriger la quantité en même temps (mouvement de stock `correction`, auteur `equipe`). Jamais sous les pièces réservées |
| Remise en vente | Refusée pour une offre suivie sans pièce disponible : elle resterait invendable alors que l'équipe la croirait en vente |
| Produit entier | Une action règle toutes les offres non archivées d'un produit. Les offres suivies restées sans pièce sont signalées |
| Droits | Direction, comme les autres corrections d'offres. Motif obligatoire, inscrit au journal |
| Site | La fiche produit affiche « Rupture de stock » ou « En réapprovisionnement » au lieu de « Indisponible » |

## Fichiers

- **BackendKati** :
  - migration `20261030150000_disponibilite_offre` ;
  - `offres.service.ts` (`disponibleOffre`) ;
  - `corrections-offres-administration.service.ts` ;
  - `produits-administration.*` ;
  - `catalogue-administration.service.ts` (filtre « rupture ») ;
  - création de commande, devis, paiement en plusieurs fois.
- **adminkati** :
  - `catalogue/AvailabilityBadge`, `catalogue/AvailabilityDialog` ;
  - `OfferPanel`, `ProductOffers`, `ProductRow`, `MarketplaceOffersWorkspace` ;
  - traductions `catalogue`.
- **websitekati** : fiche produit.
