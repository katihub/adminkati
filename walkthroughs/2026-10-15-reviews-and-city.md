# Walkthrough — avis signalés et ville du client

Plan : `plans/2026-10-15-reviews-and-city.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Avis signalés | fait | `app/composables/useReportedReviews.ts`, `app/components/operations/ReportedReviewsWorkspace.vue`, onglet `reported-reviews` (direction), traductions `operations.reportedReviews.*` |
| 2. Ville du client | fait | `app/types/api/clients.ts` (`ville`), `app/components/users/ProfileDetails.vue` (`users-profile-city`), `ProfileTab.vue`, `i18n/locales/users/*.json` (`detail.city`) |
| 3. Tests | fait | `test/nuxt/reported-reviews-workspace.test.ts`, `test/nuxt/operations-page.test.ts`, `test/nuxt/users-status-actions.test.ts` |

## Écarts par rapport au plan

- Les comparaisons de statut (`signale`, `equipe`) sont des constantes du script et non des chaînes du modèle : `i18n:check` les prenait pour du texte affiché.

## Tests exécutés

```
bunx vitest run --project nuxt test/nuxt/reported-reviews-workspace.test.ts test/nuxt/operations-page.test.ts
      Tests  31 passed (31)
bunx vitest run --project nuxt test/nuxt/users-status-actions.test.ts
      Tests  5 passed (5)
bun run typecheck   → aucune erreur
bun run i18n:check  → ok
```
