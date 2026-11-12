# Plan : le rôle gestionnaire KatiMarket

## Besoin (décidé le 12 novembre 2026)

Un nouveau rôle d'équipe, **Gestionnaire KatiMarket** (`gestionnaire`), qui a presque tous les droits de la direction. Restent **à la direction seule**, « jusqu'à preuve du contraire » :

- les **retraits des vendeurs** (liste, décision, reversement, rapprochement, pièces) et les commissions acquises ;
- les **remboursements clients** : retours, lignes refusées, paiements échelonnés ;
- la **clôture de caisse** : déclaration, lots, comptage, écart, validation, dépôt, arbitrage ;
- le **taux de commission** d'un vendeur ;
- les **réglages du paiement en plusieurs fois** (la lecture reste ouverte) ;
- l'**audit**.

Dans l'**équipe** (option b) : le gestionnaire ajoute, modifie, désactive et réactive les membres, mais **ne donne ni ne retire** les rôles direction et gestionnaire, et ne touche pas à un membre qui les porte.

## Règle

- Backend : `src/commun/garde/administration.ts` (`ADMINISTRATION`, `estAdministration`). Partout où la direction était exigée, la règle devient « direction ou gestionnaire », sauf aux exceptions, qui gardent `Role.direction` seul à l'endroit même où elles sont vérifiées.
- Panel : `app/utils/administration.ts` (`isAdministration`, `canMoveMoney`, `assignableTeamRoles`, `canManageMember`). Le panel masque ce que le backend refuserait ; le backend décide.

## Étapes

1. **Backend** : valeur `gestionnaire` du type `role` (migration et retour arrière), décorateurs et contrôles des services, règle (b) dans `EquipeService`. Test `gestionnaire-katimarket.spec.ts` qui fige les 26 routes réservées.
2. **Panel** : rôle dans la session et les types, navigation et pages, onglets d'Opérations (sans « Finances vendeurs »), boutons d'argent masqués (remboursements, clôture de caisse, réglages de l'échelonnement), choix des rôles dans l'équipe, libellés et guide des rôles.
