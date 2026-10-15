# Walkthrough — villes et quartiers, expédition en agence

Plan : `plans/2026-10-18-delivery-localities.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Données | fait | `app/types/api/localities.ts`, `app/composables/useLocalities.ts`, `app/utils/api-query-keys.ts` (`localities`), `app/composables/useDeliveryFees.ts` (`agence`) |
| 2. Écrans | fait | `app/components/operations/LocalitiesWorkspace.vue`, onglet `localities` (direction) dans `app/pages/operations.vue`, `DeliveryFeesWorkspace.vue` (trois modes tarifés), traductions `operations.localities.*`, `operations.tabs.localities` et `operations.deliveryFees` (Kati Express, agence) |
| 3. Tests | fait | `test/nuxt/localities-workspace.test.ts` (2 cas), `test/nuxt/delivery-fees-workspace.test.ts` (création d'un tarif agence), `test/nuxt/operations-page.test.ts` (nouvel onglet) |

## Écarts par rapport au plan

- Un quartier ou une ville se **masque** et ne se supprime pas : une adresse déjà enregistrée garde son sens, et la liste se réaffiche d'un clic.
- Le renommage d'une ville ou d'un quartier existe côté API (`nom`), mais l'écran ne l'expose pas encore. Pour corriger une faute, on masque l'entrée fautive et on ajoute la bonne.
- Une ville déjà listée est refusée avant l'envoi (comparaison sans casse), comme le fait le backend.

## Tests exécutés

```
bunx vitest run                 → 250 fichiers, 2077 tests passés (avant l'ajout de l'onglet aux tests de la page)
bunx vitest run test/nuxt/operations-page.test.ts → 47 passés
bun run typecheck               → aucune erreur
bun run i18n:check              → ok
```

## Notes pour le relecteur

- La première liste (35 quartiers à Douala, 36 à Yaoundé) est posée par la migration backend `20261017161000_localites_retrait`.
- Les listes sont des suggestions : la vitrine propose « Autre quartier… » en saisie libre, et le backend accepte une adresse hors liste.
