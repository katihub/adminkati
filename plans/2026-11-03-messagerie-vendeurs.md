# Plan : messagerie directe entre les vendeurs et l'équipe KATI

## Besoin

Un vendeur doit pouvoir écrire à l'équipe KATI depuis son espace, et l'équipe lui répondre depuis le panel. C'est une messagerie directe, sans assistant automatique. Elle n'est pas proposée dans l'application mobile, qui est réservée aux clients.

## Qui voit quoi

- **Le vendeur** : tout membre actif de la boutique voit les conversations de sa boutique, en ouvre une et y répond. Il ne voit jamais celles d'une autre boutique.
- **La direction** voit et répond à toutes les conversations.
- **Un point focal** voit et répond seulement aux conversations des boutiques qui lui sont assignées.
- Aucun client n'y a accès.

## Modèle

- `conversations_vendeur` :
  - champs : boutique, sujet, statut (`ouverte`, `resolue`), membre qui l'a ouverte, date du dernier message, dates de dernière lecture côté boutique et côté équipe ;
  - le statut est enregistré comme une chaîne, ce qui évite d'ajouter un type énuméré en migration.
- `messages_conversation_vendeur` : conversation, côté de l'auteur (`vendeur` ou `equipe`), identifiant et nom de l'auteur figés au moment de l'envoi, contenu (1 à 4 000 caractères), date.
- Les non-lus se comptent à partir des dates de lecture : ce sont les messages de l'autre côté postérieurs à la dernière lecture.

## Routes (backend, `messagerie-vendeurs`)

| Qui | Route | Effet |
| --- | --- | --- |
| Vendeur | `GET /messagerie-vendeurs/boutiques/:boutiqueId` | Ses conversations, avec le nombre de non-lus |
| Vendeur | `POST /messagerie-vendeurs/boutiques/:boutiqueId` | Ouvre une conversation `{ sujet, contenu }` |
| Vendeur | `GET /messagerie-vendeurs/boutiques/:boutiqueId/:id` | Le fil complet, marqué lu côté boutique |
| Vendeur | `POST /messagerie-vendeurs/boutiques/:boutiqueId/:id/messages` | Répond ; une conversation résolue est rouverte |
| Équipe | `GET /messagerie-vendeurs?statut=` | Les conversations de son périmètre, avec les non-lus |
| Équipe | `GET /messagerie-vendeurs/:id` | Le fil, marqué lu côté équipe |
| Équipe | `POST /messagerie-vendeurs/:id/messages` | Répond, signé de son nom |
| Équipe | `POST /messagerie-vendeurs/:id/statut` | Marque la conversation résolue, ou la rouvre |

Le préfixe `messagerie-vendeurs` est distinct de `vendeurs/:id`, pour éviter qu'une route vendeur existante ne capte ces adresses.

## Interfaces

- **Panel** (`adminkati`) : nouvel onglet « Messagerie vendeurs » dans Opérations, pour la direction et les points focaux.
  - À gauche, la liste des conversations : filtre ouvertes, résolues ou toutes ; boutique, sujet, date et pastille de non-lus.
  - À droite, le fil, une zone de réponse et le bouton « Marquer résolue » ou « Rouvrir ».
- **Espace vendeur** (`websitekati`) : nouvel onglet « Messagerie KATI ».
  - La liste des conversations de la boutique et un bouton « Nouvelle conversation » (sujet et premier message).
  - Le fil avec une zone de réponse.
  - Le fil se rafraîchit toutes les 20 secondes tant qu'il est ouvert.

## Tests

- **Backend** :
  - un vendeur limité à sa boutique ;
  - un point focal limité à ses boutiques ;
  - la direction voit tout ;
  - une réponse du vendeur rouvre une conversation résolue ;
  - les non-lus s'annulent à la lecture ;
  - les contenus vides sont refusés.
- **Panel** : liste, envoi d'une réponse, changement de statut.
- **Site** : `tsc` et `eslint`, puis une capture de l'onglet.

## Hors périmètre

- Les pièces jointes, l'e-mail et la notification push : les nouveaux messages se voient par les pastilles de non-lus.
- L'application mobile.
