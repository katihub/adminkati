# Compte rendu : notifications dans l'interface

Plan : `plans/2026-11-05-notifications-in-app.md`.

## Résultat

Chaque espace a sa **cloche avec un compteur rouge**. Le compteur se met à jour toutes les 30 secondes et dès qu'on revient sur l'onglet ou l'application. La cloche montre les dernières notifications ; ouvrir une notification la marque comme lue et mène à la bonne page. « Tout marquer comme lu » vide le compteur.

- **Panel** : la cloche est dans l'en-tête, à côté de la langue. La page « Voir toutes les notifications » (`/fr/notifications`) garde l'historique.
- **Espace vendeur** : la cloche est dans l'en-tête de la boutique. Une notification ouvre la bonne rubrique (Commandes, Messagerie KATI, Devis, Litiges, Finances, Catalogue).
- **Site, client** : la cloche est dans l'en-tête, à côté du compte. L'historique est sur `/compte/notifications`, aussi accessible par le menu « Mes notifications ».
  - **Sur mobile**, la cloche remplace le raccourci « Mes commandes » ou « Ma boutique », qui reste dans le menu du compte. L'en-tête ne déborde donc pas.
- **Application** : la cloche de l'accueil affiche le compteur et ouvre « Mes notifications ». Les liens du site mènent à l'écran équivalent : commande, devis, paiement en plusieurs fois, KATI. Le réglage des notifications push reste accessible par l'icône en haut de l'écran, et par « Notifications push » dans le compte.

## Qui reçoit quoi

- **Client** :
  - commande confirmée ou paiement reçu ;
  - commande en préparation (un livreur est désigné), expédiée, en route, livrée ;
  - paiement à la porte ;
  - article indisponible ;
  - devis confirmé, refusé ou bientôt expiré ;
  - réponse dans un litige, retour accepté ou refusé, arbitrage, remboursement ;
  - paiement en plusieurs fois : ouverture, versements, réservation, solde, rappels, fin ;
  - KATI disponibles, commission de parrainage, KATI bientôt expirés.
- **Vendeur** :
  - nouvelle commande ;
  - demande de devis et relance ;
  - litige, message du client, retour en route, arbitrage ;
  - message de l'équipe KatiMarket ;
  - produit ou offre approuvé, refusé ou à corriger, avec le motif ;
  - retrait approuvé, refusé ou versé ;
  - contrat vendeur changé ;
  - stock réservé et commande issue d'un paiement en plusieurs fois.
- **Équipe** :
  - nouvelle commande : la direction une fois par commande, et chaque point focal pour sa boutique ;
  - message d'un vendeur, y compris par Kati ;
  - nouvelle boutique à valider ;
  - produit ou offre à valider ;
  - litige à arbitrer ;
  - demande de retrait ;
  - demande Kati d'un client.
  - Un point focal ne voit que ses boutiques.

## À savoir

- Les textes sont en français, quelle que soit la langue choisie.
- « En préparation » correspond à l'affectation d'un livreur : la boutique n'a pas encore de bouton « colis prêt ».
- Une notification n'apparaît que pour les faits survenus après la mise en ligne. Rien n'est rattrapé pour le passé.

## Modifications

- **BackendKati** :
  - migration `20261105100000_notifications_app`, avec son `rollback.sql` ;
  - `src/notifications/notifications-app.service.ts` et `notifications-app.controller.ts` ;
  - les notifications sont ajoutées dans les services des commandes (acompte), des livraisons, des notifications marketplace, du paiement en plusieurs fois, du catalogue, de la messagerie vendeurs, de l'inscription vendeur, de la finance vendeur, du contrat et des demandes Kati.
- **adminkati** :
  - `AdminNotificationBell` et `AdminNotificationItem` ;
  - `useTeamNotifications` et `useOpenNotification` ;
  - `utils/notifications.ts` ;
  - page `notifications.vue`.
- **websitekati** :
  - `lib/notifications.ts` ;
  - `components/notifications/ClocheNotifications.tsx` ;
  - page `compte/notifications` ;
  - en-tête du site et espace vendeur.
- **mobilekati** :
  - `lib/notifications-api.ts` et l'écran `notifications.tsx` ;
  - la cloche de l'en-tête et le menu du compte.

## Vérification

- **Backend** :
  - 8 tests nouveaux : clés et rejeu, boîtes client, vendeur et équipe, point focal, pagination et « tout lu », annonce d'une commande confirmée, étapes de livraison, textes du paiement en plusieurs fois ;
  - test de la messagerie mis à jour (8 sur 8) ;
  - vérification de types sans erreur.
  - Suite complète : les seuls échecs sont ceux qui existaient déjà. Ils sont dans les mêmes 10 suites, avec le même nombre d'échecs.
- **Panel** :
  - tests unitaires et Nuxt (cloche, historique, lue, tout lu) ;
  - tests de navigation : 9 sur 9 ;
  - vérification de types et contrôles de traduction sans erreur.
- **Site** :
  - test de bout en bout de la cloche vendeur, sur ordinateur et sur mobile : 4 sur 4 ;
  - suite complète : 26 échecs, tous déjà présents avant ce chantier (vérifiés sur la version précédente) ;
  - build sans erreur.
- **Application** : `tsc` et eslint sans erreur, et la traduction des liens vérifiée.
