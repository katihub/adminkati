# Compte rendu — disponibilité des produits décidée par l'équipe

Plan : `plans/2026-10-30-disponibilite-produits.md`.

## Ce que l'admin peut faire

- **Une offre** : Produits > un produit > onglet « Offres vendeurs » > « Ouvrir », ou Opérations > Offres vendeurs > une offre.
  - Le badge montre la disponibilité.
  - « Changer la disponibilité » ouvre la fenêtre : En stock, Rupture de stock ou En réapprovisionnement.
  - Si la boutique suit son stock, on peut aussi saisir la quantité en stock.
  - Un motif est obligatoire.
- **Tout un produit** : onglet « Offres vendeurs » du produit > « Disponibilité de toutes les offres ». La même disponibilité s'applique à toutes ses offres non archivées.
- **Listes** :
  - Produits : un badge « N en rupture » ou « N en réappro. » apparaît sur la ligne.
  - Offres vendeurs : la colonne Stock affiche le badge.
  - Le filtre « Rupture » retrouve aussi les offres retirées par l'équipe.
- **Historique** : chaque changement est journalisé (motif, avant et après). Il apparaît dans l'historique de l'offre.

## Effet côté client

- En **rupture** ou en **réapprovisionnement**, l'offre :
  - disparaît du catalogue, de l'accueil, des pages boutique et des accessoires ;
  - ne peut plus être commandée, mise dans un devis ou payée en plusieurs fois.
- La fiche produit l'annonce comme « Rupture de stock » ou « En réapprovisionnement ».
- Repassée **en stock**, elle se vend de nouveau selon sa quantité.
- Kati, l'assistante, suit la même règle : elle lit le catalogue.

## Garde-fous

- Impossible de remettre en vente une offre suivie sans pièce disponible : la fenêtre et l'API demandent une quantité.
- Impossible de descendre la quantité sous les pièces déjà réservées pour des clients.
- Pas de quantité pour une boutique qui ne suit pas son stock : seule la disponibilité se règle.
- Réservé à la direction.

## Vérification

- **Backend** :
  - 9 nouveaux tests : remise en stock avec quantité et mouvement de stock, réapprovisionnement, refus sans pièce ou sous les réservations, droits, produit entier, `disponibleOffre`, filtre « rupture », liste d'offres.
  - Les tests des services marketplace passent, ainsi que ceux de l'assistant, de la vitrine et du catalogue.
  - Les 4 échecs restants (notifications marketplace) existaient avant ce changement.
  - Vérification de types sans erreur.
- **Panel** : 2 nouveaux tests sur la fenêtre (offre suivie remise en stock avec sa quantité ; produit entier). 28 tests du catalogue passent ; vue-tsc sans erreur.
- **Site** : `tsc` et eslint sans erreur.
- **Non vérifié** : l'enchaînement complet sur une base réelle.

## Mise en ligne

La migration `20261030150000_disponibilite_offre` ajoute une colonne avec une valeur par défaut. Elle s'applique au démarrage du backend. Déployer le backend avant le panel.
