# Compte rendu : le rôle gestionnaire KatiMarket

Plan : `plans/2026-11-12-gestionnaire-katimarket.md`.

## Résultat

- **Nouveau rôle** « Gestionnaire KatiMarket », proposé dans Équipe (ajout et modification d'un membre), dans le filtre par rôle et dans le guide des rôles.
- **Ce qu'il voit et fait** : le même menu et les mêmes écrans que la direction, **sauf Audit et Finances vendeurs** ; toutes les actions de la direction hors argent qui sort.
- **Ce qui reste à la direction** :
  - retraits des vendeurs et commissions acquises : onglet Finances vendeurs absent, routes refusées ;
  - remboursements : boutons masqués (lignes refusées, plans échelonnés, retours) et routes refusées ;
  - clôture de caisse : le gestionnaire **consulte** les caisses et **encaisse** une commande, mais ne compte, ne valide, ne déclare et ne fait pas de lot ;
  - taux de commission d'un vendeur ;
  - réglages du paiement échelonné : **affichés en lecture seule** ;
  - audit.
- **Équipe (option b)** : le gestionnaire ne peut ni choisir les rôles direction et gestionnaire, ni modifier, désactiver ou réactiver un membre qui les porte (fiche en lecture).
- **Notifications** : le gestionnaire reçoit celles de la direction (nouvelles commandes, candidatures, litiges à arbitrer, alertes de fichier), sauf la demande de retrait d'un vendeur.

## Fichiers

- **BackendKati** : migration `20261112110000_role_gestionnaire` et son `rollback.sql` ; `src/commun/garde/administration.ts` ; 207 décorateurs ouverts, 26 gardés ; contrôles des services ; `exigerDroitSurRoles` dans `equipe.service.ts`. Retours arrière ajoutés aussi pour `suivi_candidatures` et `vendeurs_valides_restent_valides`.
- **adminkati** : `utils/administration.ts`, types et session serveur, navigation, pages, onglets d'Opérations, `RefusedLinesWorkspace`, `installment/PlanRow`, `SettingsPanel`, `RulesPanel`, `caisse/DetailPanel`, `team/HireForm`, `team/MemberDetails`, `pages/team.vue`, libellés.

## Tests

- **BackendKati** : `gestionnaire-katimarket.spec.ts` (34 tests : les 26 routes réservées, les routes ouvertes, les contrôles des services, la règle b). Suite complète : aucun échec nouveau ; les 55 échecs restants existaient avant (SQL, PDF, générateur de livraison, retours arrière de 9 migrations antérieures).
- **adminkati** : `administration.test.ts`, `admin-navigation.test.ts` (menu du gestionnaire), `installment-plans-workspace.test.ts` (lecture seule pour le gestionnaire) ; les tests qui jouent la direction lui donnent désormais une session. Suite complète : aucun échec nouveau ; les 11 échecs restants existaient avant.
- **Non vérifié** : la migration n'a pas été jouée sur une vraie base, et le panel n'a pas été ouvert avec un compte gestionnaire.
