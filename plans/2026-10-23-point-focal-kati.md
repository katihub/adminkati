# Point focal KATI : un représentant régional limité à ses boutiques

Statut : validé et réalisé le 23 octobre 2026 (lots 1 à 7) ; compte rendu dans `walkthroughs/2026-10-23-point-focal-kati.md`.

## Le besoin

Un **point focal KATI** représente KatiMarket dans une autre région. La direction lui assigne des boutiques ; il contrôle les demandes de ces boutiques et agit dessus, sans jamais voir les autres. La direction garde la vue sur tout et peut toujours agir elle-même.

## Décisions prises (23 octobre 2026)

| Sujet | Décision |
|---|---|
| Rôle | Nouveau rôle d'équipe `point_focal`, cumulable avec « comptoir ». |
| Assignation | Boutique par boutique, par la direction. **Une boutique a au plus un point focal.** |
| Nouvelles inscriptions | Elles arrivent chez la direction, qui assigne la boutique à un point focal ; celui-ci traite ensuite le dossier (option A, pas de zone automatique). |
| Validation | Le point focal peut valider ou refuser seul le dossier d'une boutique. |
| Argent | Tout ce qui touche aux finances reste à la direction. |
| Commandes et clients | Le point focal voit les commandes de ses boutiques et les coordonnées des clients concernés (il en a besoin pour les litiges). |

## Ce que le point focal voit et fait, sur ses boutiques seulement

| Domaine | Lire | Agir |
|---|---|---|
| Inscription du vendeur et pièces justificatives | oui | prendre en charge, valider ou refuser une pièce, valider ou refuser le dossier |
| Modération des produits, offres et contenus | oui | prendre en charge, approuver, refuser |
| Litiges et retours | oui, avec la commande et les coordonnées du client | décider du retour, arbitrer |
| Devis | oui | les actions de la direction sur les devis |
| Avis signalés | oui | modérer |
| Agents de livraison des boutiques | oui | vérifier, désactiver |
| Commandes de ses boutiques | oui, avec les coordonnées des clients | — |

**Restent à la direction seule** : remboursements (y compris celui qui suit un litige), retraits et versements des vendeurs, commissions, KATI, paiement en plusieurs fois, sanctions, export du catalogue d'une boutique, assignation des points focaux, réglages.

## Principes

1. **Le périmètre se vérifie au backend, à chaque route.** Une liste est filtrée sur les boutiques du point focal ; une action sur une autre boutique répond 403, même adresse tapée à la main. Le panel ne fait qu'en tirer les conséquences à l'affichage.
2. **Le périmètre voyage avec l'appelant**, comme les comptoirs : la garde le lit dans la même requête que le membre. Aucun service n'a de seconde lecture à faire, donc aucun ne peut l'oublier.
3. **Un point focal sans boutique ne voit rien.** C'est l'inverse des comptoirs (liste vide = toute la maison) : ici, la liste vide veut dire « rien encore assigné ».
4. **La direction n'est jamais restreinte**, même si elle porte aussi le rôle `point_focal`.
5. **Tout est inscrit au journal** : assignation, retrait, et chaque décision prise par un point focal (avec son identité, comme pour la direction).

## Données

- `Role` gagne `point_focal` (migration `ALTER TYPE ... ADD VALUE`).
- `boutiques.point_focal_id` : le membre d'équipe assigné, nul par défaut, clé étrangère vers `membres_equipe`. Une seule colonne garantit par construction « un point focal au plus par boutique ».

## Découpage en lots

1. **Fondations** : rôle et migration, colonne d'assignation, périmètre porté par l'appelant, aides de contrôle, routes d'assignation (direction) et liste des points focaux, journal.
2. **Inscription et pièces des vendeurs** : liste, fiche, pièces, décision sur le dossier.
3. **Modération** : produits, offres, contenus produits.
4. **Litiges et retours**, avec la commande et les coordonnées du client ; le remboursement reste à la direction.
5. **Devis, avis signalés, agents de livraison.**
6. **Panel** : rôle dans l'équipe, écran « Points focaux » (assignation boutique par boutique), point focal affiché sur la fiche d'une boutique, navigation limitée aux écrans du rôle.
7. **Fin** : tests, recette en navigateur avec un compte point focal, compte rendu.

## Points d'attention

- Les services vérifient souvent eux-mêmes `direction` (`exigerDirection`) en plus du décorateur `@Roles` : les deux doivent être ouverts au point focal, et seulement là où le tableau ci-dessus le prévoit.
- Une boutique sans point focal n'est visible que de la direction : rien ne change pour l'existant tant qu'aucune assignation n'est faite.
- Retirer le rôle `point_focal` à un membre ne retire pas ses assignations en base, mais il ne voit plus rien ; l'écran « Points focaux » signale ces boutiques comme sans point focal actif.
