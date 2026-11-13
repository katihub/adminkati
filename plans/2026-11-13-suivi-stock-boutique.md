# Plan : le suivi du stock, au choix de chaque boutique

## Besoin (décidé le 13 novembre 2026)

Depuis le 6 novembre, toutes les boutiques vendent au **statut** (En stock / Réapprovisionnement / Hors stock), sans quantités. Certaines veulent de nouveau **suivre leur stock**. Les deux façons de travailler coexistent.

## Décisions

1. **Passage au suivi** : une offre sans quantité saisie garde son statut manuel jusqu'à ce que le vendeur la renseigne ; l'écran compte les offres sans quantité.
2. **Par boutique**, désactivé par défaut.
3. Une boutique qui suit son stock **ne refuse pas de ligne** (interdit conservé).
4. Côté client : **« Plus que N en stock »** en dessous de 5 unités, et **panier limité** au stock disponible.
5. **Arrêter le suivi** : retour au statut manuel ; les quantités restent en base ; les commandes réservées vont au bout.
6. **Retour au stock automatique** à l'annulation d'une commande et à la réception d'un retour client.
7. Activer ou arrêter le suivi : **propriétaire et gestionnaire** de la boutique.

## Règles

- Une offre est **suivie** quand sa boutique suit son stock, que sa quantité a été renseignée, et que son statut n'est pas « Réapprovisionnement » (qui reste un choix manuel, commandable sans limite).
- Offre suivie : disponible = quantité − réservée ; elle passe **Hors stock** à 0 et **En stock** dès qu'il en reste.
- Offre non suivie : inchangé (le statut décide, « Hors stock » ne se commande pas).
- Commande : la quantité d'une offre suivie est réservée à la commande, sortie au paiement, rendue à l'annulation ; un retour reçu la remet en stock.

## Étapes

1. **Backend** : colonne `stocks_offre.quantite_renseignee` (migration et retour arrière), règle de disponibilité, statut automatique, réservation selon la règle, remise en stock au retour, route `POST /vendeurs/mes-boutiques/:id/suivi-stock`. Tests.
2. **Espace vendeur** : réglage « Je suis mon stock », quantité par offre, offres sans quantité.
3. **Site** : « Plus que N en stock ».
4. **Admin** : suivi du stock visible sur la boutique, quantités sur l'offre.
