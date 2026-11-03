# Walkthrough : messagerie directe entre les vendeurs et l'équipe KATI

Plan : [plans/2026-11-03-messagerie-vendeurs.md](../plans/2026-11-03-messagerie-vendeurs.md)

## Résultat

- **Côté vendeur** (site, espace vendeur), onglet **« Messagerie KATI »** :
  - **« Nouvelle conversation »** : un sujet et un premier message.
  - La liste des conversations de la boutique, avec la date, le statut et une pastille de non-lus.
  - Le fil distingue les messages de la boutique et ceux de l'équipe : ces derniers sont signés « Nom · équipe KATI ». Une zone de réponse suit le fil, qui se relit toutes les 20 secondes.
  - Répondre sur une conversation résolue la rouvre.
- **Côté équipe** (panel), **Opérations → « Messagerie vendeurs »** :
  - La direction voit toutes les boutiques, un point focal seulement les siennes.
  - Le filtre propose les conversations ouvertes, résolues ou toutes ; une pastille compte les non-lus de l'équipe.
  - Le fil, la réponse signée du nom du membre, et le bouton « Marquer résolue » ou « Rouvrir ».
- L'application mobile n'est pas concernée.

## Modifications

- **BackendKati**, commit `0d17fd7` :
  - tables `conversations_vendeur` et `messages_conversation_vendeur` (migration `20261103100000_messagerie_vendeurs`). L'application peut lire, créer et modifier, mais pas supprimer ;
  - `src/vendeurs/messagerie-vendeurs.service.ts` et `messagerie-vendeurs.controller.ts`, routes sous `messagerie-vendeurs` ;
  - `messagerie-vendeurs.spec.ts` : 7 tests.
- **adminkati**, commit `838dadb` :
  - `useSellerMessaging.ts` ;
  - `SellerMessagingWorkspace.vue`, `SellerConversationCard`, `SellerThread` ;
  - onglet `seller-messages`, ouvert à la direction et aux points focaux ;
  - tests `seller-messaging.test.ts` et `operations-page.test.ts`.
- **websitekati**, commit `aaa5e75` :
  - `vendeur/MessagerieKati.tsx` et sa feuille de style ;
  - onglet dans `SellerWorkspace.tsx` ;
  - test de bout en bout `e2e/messagerie-vendeur.spec.ts`.
  - Au passage, le titre français de l'onglet « Devis » est corrigé : il affichait « Paramètres de la boutique ».

## Vérifications

- **Backend** : 63 tests du module vendeurs au vert, dont les 7 de la messagerie. `tsc`, `eslint` et `prisma validate` sans erreur.
- **Panel** : 80 tests au vert (`seller-messaging` et `operations-page`). `vue-tsc` sans erreur. Les contrôles du commit (lint, traductions, complexité) sont au vert.
- **Site** :
  - `tsc`, `eslint` et `next build` sans erreur ;
  - test de bout en bout passé sur ordinateur et sur mobile : ouverture d'une conversation, lecture de la réponse, puis réponse dans le fil ;
  - les tests de l'espace vendeur et des devis passent toujours.

## À savoir

- **Ordre de déploiement** : le backend d'abord, puisque sa migration crée les tables, puis le panel et le site.
- **Pas d'alerte en dehors de l'écran** : ni e-mail, ni notification push. L'équipe repère les nouveaux messages grâce aux pastilles de l'onglet, que le panel rafraîchit toutes les 30 secondes.
- **Accès côté boutique** : tout membre actif de la boutique peut lire et écrire, quel que soit son rôle.
