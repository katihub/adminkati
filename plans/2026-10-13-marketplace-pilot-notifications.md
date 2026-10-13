# Pilote marketplace et file de notifications

## Objectif

Donner à la direction deux écrans d'exploitation pour le pilote Douala :

- **Pilote marketplace** : créer un pilote (ville, boutiques, seuils de sortie), le démarrer, le suspendre ou le terminer, lire les mesures calculées par le serveur face à leurs seuils, puis figer une évaluation go / prolonger / bloqué.
- **Notifications** : suivre la file persistante des courriels marketplace (en attente, en cours, envoyées, abandonnées), relancer une notification abandonnée et déclencher un traitement immédiat.

Ce plan transcrit, pour le panel, les lots 1 et 2 du plan maître `../plans/2026-10-13-exploitation-pilote-marketplace.md`, écrit avant toute implémentation.

## Réutilisation

- Page `app/pages/operations.vue` et son système d'onglets partageables par URL ; onglets réservés à la direction sur le modèle de `legal-closure` et `seller-finance`.
- Styles de cartes et d'aside de `app/components/operations/LegalClosureWorkspace.vue`.
- `useApiFetch` / `useApiWrite`, TanStack Query et `apiQueryKeys` pour le cache et l'invalidation.
- `ApiErrorCard`, `EmptyStateCard` et `AlertDialog` de shadcn-vue pour les états d'erreur, de liste vide et de confirmation.

## Contrats de données (backend)

- `GET /v1/marketplace/deploiement/pilotes`, `GET .../references`, `POST /`, `GET /:id/mesures`, `POST /:id/{demarrer|suspendre|terminer}`, `POST /:id/evaluations { cleIdempotence }`.
- `GET /v1/notifications/synthese`, `GET /v1/notifications?statut&page&taille`, `POST /v1/notifications/:id/relancer`, `POST /v1/notifications/traiter`.
- Tous réservés au rôle `direction`. Les taux circulent en points de base (entiers) ; seul l'affichage les divise.

## Phases

### 1. Types, clés de requête et composables

- **Quoi :** typer les réponses, ajouter les clés `marketplacePilots` et `outboundNotifications`, écrire `useMarketplacePilots` et `useOutboundNotifications`.
- **Où :** `app/types/api/`, `app/utils/api-query-keys.ts`, `app/composables/`.
- **Fini quand :** chaque mutation invalide son préfixe et l'évaluation envoie une clé d'idempotence nouvelle à chaque clic.

### 2. Écran pilote

- **Quoi :** liste des pilotes, détail des mesures face aux seuils, preuves de bout en bout, dernière évaluation, actions confirmées et formulaire de création.
- **Où :** `app/components/operations/MarketplacePilotWorkspace.vue`, `MarketplacePilotCreateForm.vue`, `app/utils/pilot-measures.ts`.
- **Fini quand :** un indicateur hors seuil est signalé visuellement et aucune transition ne part sans confirmation.

### 3. Écran notifications

- **Quoi :** compteurs par statut, ancienneté de la plus vieille attente, filtre par statut, liste paginée avec dernière erreur, relance et traitement immédiat.
- **Où :** `app/components/operations/OutboundNotificationsWorkspace.vue`.
- **Fini quand :** l'absence de fournisseur de courriel est expliquée au lieu d'afficher un succès vide.

### 4. Onglets, traductions et tests

- **Quoi :** deux onglets réservés à la direction, traductions fr/en, tests unitaires et Nuxt.
- **Où :** `app/pages/operations.vue`, `i18n/locales/operations/`, `test/`.
- **Fini quand :** `i18n:check`, lint, format, typecheck et les tests ciblés passent ; un compte `comptoir` ne voit aucun des deux onglets.
