# Plan : modifier le taux de commission d'un vendeur

## Besoin

Le taux de commission est fixé par vendeur (10 % par défaut). Il n'est choisi qu'à la création et reste ensuite figé : le panel l'affiche sans permettre de le changer.

Décision : la direction peut le modifier vendeur par vendeur. Le vendeur n'est pas prévenu par e-mail.

## Règles

- Seule la direction peut modifier le taux.
- Le taux va de 0 à 100 %, enregistré en points de base (1000 = 10 %).
- Un motif est obligatoire (5 à 500 caractères). Le journal conserve l'ancien taux, le nouveau taux, le motif et l'auteur.
- Le nouveau taux ne vaut que pour les commandes à venir : chaque ligne commandée garde le taux en vigueur au moment de la commande.
- Un taux identique à l'actuel est refusé, et rien n'est écrit.

## Changements

1. **Backend** : nouvelle route `POST /vendeurs/:id/commission` avec le corps `{ commissionBps, motif }`, réservée à la direction, inscrite au journal sous l'action `vendeur.commission.modifiee`.
2. **Panel** : nouveau composant `SellerCommission` dans la fiche vendeur.
   - Il affiche le taux, et un bouton « Modifier » pour la direction.
   - Le bouton ouvre une fenêtre : nouveau taux en %, motif, et avertissement « nouvelles commandes uniquement ».
3. **Tests** :
   - backend : modification et journal, accès réservé à la direction, vendeur inconnu, taux inchangé ;
   - panel : envoi en points de base, bouton désactivé si la saisie n'est pas valable, pas de bouton hors direction.

## Hors périmètre

- Prévenir le vendeur (écarté par décision).
- Un taux par catégorie.
