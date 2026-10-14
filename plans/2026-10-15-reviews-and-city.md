# Avis signalés et ville du client dans le panel

## Objectif

Lot 7 du plan maître `../plans/2026-10-15-corrections-et-completions.md`.

- Avec la règle du 15 octobre, signaler un avis ne le masque plus d'office : seules la boutique concernée et KatiHub signalent, une fois chacune, et l'avis n'est masqué qu'au-delà de 3 signalants distincts. Il reste donc publié et doit passer dans une **file de modération** tenue par la direction.
- La **ville du client**, demandée à l'inscription, s'affiche sur sa fiche.

## Contrat backend

- `GET /v1/marketplace/reputation/avis/a-moderer` (direction) : les avis signalés depuis leur dernière modération, avec leurs signalements.
- `POST /v1/marketplace/reputation/avis/:id/moderation` avec `{ statut: publie | masque, motif }` (route existante).
- `GET /v1/clients/:id` : `profil.ville`.

## Phases

1. **Avis signalés** :
   - `app/composables/useReportedReviews.ts` et l'onglet « Avis signalés » (direction) ;
   - `ReportedReviewsWorkspace.vue` : l'avis et son état (publié, ou masqué en attente), ses signalements, et la décision avec motif obligatoire.
2. **Ville** : `app/types/api/clients.ts`, `ProfileDetails.vue` et `ProfileTab.vue`.
3. **Tests** : `test/nuxt/reported-reviews-workspace.test.ts`, `test/nuxt/operations-page.test.ts` et `test/nuxt/users-status-actions.test.ts`.
