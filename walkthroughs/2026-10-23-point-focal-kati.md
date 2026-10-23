# Walkthrough — Point focal KATI

Plan : `plans/2026-10-23-point-focal-kati.md`. Les lots 1 à 7 sont réalisés.

## Résultat

Un **point focal KATI** représente KatiMarket dans une région. La direction lui assigne des boutiques, une par une ; il traite leurs demandes et ne voit jamais les autres boutiques.

**Donner le rôle** : page Équipe, rôle « Point focal KATI ». Il se cumule avec les autres, comptoir par exemple.

**Assigner les boutiques** (direction) : Opérations → onglet **Points focaux**.
- Filtre « Sans point focal » : la file des boutiques à assigner. C'est là qu'arrive toute nouvelle inscription.
- Filtres « Toutes les boutiques » et « un point focal », pour voir et déplacer ses boutiques.
- Chaque boutique a une liste « Point focal » : un seul par boutique. Seul un point focal actif peut être choisi.
- Un point focal désactivé est signalé, avec ses boutiques à réassigner.

**L'espace du point focal** : il arrive directement sur Opérations → **Mes boutiques**. Le pilotage le redirige, car il n'a pas de tableau de bord.
- **Mes boutiques** : ses boutiques. Pour chacune, ses commandes avec le client (nom, téléphone, e-mail) et l'adresse de livraison.
- **Ses onglets**, tous limités à ses boutiques par le backend :

| Onglet | Ce qu'il y fait |
|---|---|
| Validation vendeurs | lit le dossier et les pièces, les prend en charge, valide ou refuse une pièce, **valide ou refuse le dossier seul** |
| Modération catalogue | produits, offres et contenus proposés par ses boutiques : prise en charge et décision |
| Litiges et retours | lit le litige avec les coordonnées du client, décide et réceptionne le retour, **arbitre** une contestation |
| Agents des boutiques | vérifie et désactive les agents de ses boutiques |
| Produits vérifiés | pose ou retire le badge « Vérifié par KatiMarket » sur leurs offres |
| Devis marketplace | voit les devis de ses boutiques, seulement leurs parties (pas les prix des autres boutiques), et leurs PDF |
| Avis signalés | modère les avis laissés sur ses boutiques |

**Reste à la direction** :
- l'argent : remboursements (y compris après un litige qu'il a tranché), retraits, commissions, KATI, paiement en plusieurs fois, plafond d'espèces d'un agent ;
- le changement de statut d'un vendeur (suspension, exclusion) et les sanctions ;
- l'export du catalogue d'une boutique ;
- l'assignation des points focaux, la relance générale des devis, les réglages.

**Litiges, pour tous** : le détail d'un litige affiche maintenant le client (nom, e-mail, téléphones, adresse de livraison).

## Backend

- **Migration `20261023150000_point_focal`**, avec retour arrière :
  - valeur `point_focal` du type `role` ;
  - colonne `boutiques.point_focal_id` (clé étrangère vers `membres_equipe`, indexée).
  - Nulle partout au déploiement : rien ne change tant que la direction n'assigne rien.
- **Périmètre** : la garde lit les boutiques suivies avec le membre, dans la même requête que ses comptoirs. `src/commun/perimetre-boutiques.ts` dit ce qu'un membre traite :
  - direction : tout ;
  - point focal : ses boutiques, **rien sans assignation**.

  Chaque liste est filtrée, et chaque action sur une autre boutique répond 403, même adresse tapée à la main.
- **Routes `points-focaux`** :
  - réservées à la direction : liste des points focaux, boutiques et leur point focal, assignation ou retrait (au journal, avec l'avant et l'après) ;
  - pour le point focal : « mes boutiques » ;
  - pour les deux : les commandes d'une boutique avec les coordonnées des clients.
- **Ouvertures au rôle**, en plus de la direction et sur ses boutiques seulement :
  - vendeurs (liste, fiche, pièces, dossier) ;
  - modération (produits, offres, contenus, badge) ;
  - litiges (liste, détail, décision, réception, arbitrage) ;
  - devis (liste, PDF) ;
  - avis signalés ;
  - agents (liste, vérification sans plafond, nouvelle route de désactivation par l'équipe).
- **Journal** : chaque décision d'un point focal est inscrite sous son identité, avec le rôle `point_focal`.

## Vérifications

- **Tests backend** : périmètre et assignation (9), garde, vendeurs (5), modération (5), litiges et commandes (7), devis, avis et agents (7). Les suites existantes des domaines touchés passent. Un seul échec, déjà présent : le test qui lit le PDF d'un devis avec `pdf-parse`, sans rapport avec ce travail (il demande `--experimental-vm-modules`).
- **Tests panel** :
  - onglets de la page Opérations par rôle (71, dont le point focal seul et le cumul comptoir + point focal) ;
  - navigation (22) ;
  - écrans Points focaux, Mes boutiques et bloc client des litiges (4).

  oxlint, i18n:check, typecheck et fallow sont au vert ; les seules erreurs de type restantes sont celles, anciennes, des frais de livraison.
- **Recette API sur le backend local** (27 contrôles) :
  - création d'un point focal et assignation ;
  - vue limitée à ses boutiques : vendeurs, modération, badge, devis, agents, commandes ;
  - refus sur une autre boutique ;
  - 8 actions réservées à la direction refusées : liste des points focaux, assignation, retraits, transferts KATI, confiance vendeurs, statut d'un vendeur, export du catalogue, relance des devis.

  Sur une boutique ayant une vraie commande : client, téléphone et adresse lus, autre boutique refusée.
- **Recette en navigateur** :
  - point focal : redirection vers Mes boutiques, onglets et navigation limités, commande et client affichés, vendeurs des autres absents, onglet KATI fermé même par son adresse ;
  - direction : écran Points focaux.

  Aucune erreur JavaScript.

## Écarts au plan

- **Assignation** : option A retenue (pas de zone automatique). Une nouvelle boutique apparaît dans « Sans point focal », et la direction l'assigne.
- **Badge « Vérifié par KatiMarket »** : ouvert au point focal sur ses boutiques, en plus de la liste de départ. C'est une vérification d'article sur place, pas une opération d'argent.
- **Plafond d'espèces d'un agent** : le point focal peut vérifier un agent mais pas fixer ce plafond, qui reste à la direction.
- **Désactivation d'un agent par l'équipe** : nouvelle route ; seule la boutique pouvait le faire jusqu'ici.
- **Coordonnées des clients dans les litiges** : ajoutées pour tous les membres qui traitent les litiges, pas seulement le point focal.

## Limites

- Les onglets **Validation vendeurs**, **Modération catalogue** et **Confiance vendeurs** restent affichés au comptoir, comme avant, alors que le backend les lui refuse. C'est un état antérieur à ce travail, que je n'ai pas changé.
- Le statut d'une commande dans **Mes boutiques** s'affiche tel que le backend le donne (« nouvelle »), sans traduction.
- La **relance générale des devis** et l'**export du dossier d'un litige** restent à la direction.
