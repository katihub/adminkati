# Sécurité des preuves de litige dans le panel

## Objectif

Afficher dans le centre d'opérations ce que le backend sait désormais des fichiers privés (lot 6 du plan maître `../plans/2026-10-13-exploitation-pilote-marketplace.md`), et permettre à la direction d'exporter un dossier de litige complet.

## Contrat backend

- Chaque pièce de `GET /v1/marketplace/demandes-client/retours/:id` porte `statutAnalyse` (`non_analysee`, `en_quarantaine`, `saine`, `infectee`) et `purgeeLe`.
- `GET /v1/marketplace/demandes-client/:id/export` (direction) renvoie un ZIP : dossier, journal, pièces déchiffrées et manifeste SHA-256.

## Phases

### 1. Types et états des pièces

- **Quoi :** typer les nouveaux champs ; désactiver le téléchargement d'une pièce en analyse, bloquée ou effacée, avec un badge qui dit pourquoi.
- **Où :** `app/types/api/marketplace-operations.ts`, `app/components/operations/MarketplaceDisputesWorkspace.vue`.
- **Fini quand :** aucune pièce illisible n'est cliquable.

### 2. Export du dossier

- **Quoi :** bouton « Exporter le dossier », réservé à la direction, qui télécharge l'archive.
- **Où :** même composant, traductions `operations.disputes.*`.
- **Fini quand :** un compte `comptoir` ne voit pas le bouton ; un export échoué l'annonce.

### 3. Tests

- **Quoi :** premier test du composant de litiges : états des pièces, export, rôle.
- **Où :** `test/nuxt/marketplace-disputes-workspace.test.ts`.
