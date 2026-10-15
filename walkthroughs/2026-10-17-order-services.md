# Walkthrough — services de commande

Plan : `plans/2026-10-17-order-services.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Données | fait | `app/types/api/order-services.ts`, `app/types/api/marketplace-categories.ts` (installation), `app/composables/useOrderServices.ts`, `app/utils/api-query-keys.ts` (`orderServices`) |
| 2. Écran | fait | `app/components/operations/OrderServicesWorkspace.vue`, onglet `order-services` (direction) dans `app/pages/operations.vue`, traductions `operations.orderServices.*` et `operations.tabs.orderServices` |
| 3. Tests | fait | `test/nuxt/order-services-workspace.test.ts` (2 cas), `test/nuxt/operations-page.test.ts` (nouvel onglet) |

## Écarts par rapport au plan

- Le prix d'installation se tient sur la catégorie elle-même (même route que le reste de la catégorie) ; l'écran ne fait que l'exposer à part, avec le taux d'assurance.
- Le bouton « Proposer » reste grisé tant qu'aucun prix n'est saisi : le backend refuserait de toute façon une installation active sans prix.

## Tests exécutés

```
bunx vitest run test/nuxt/order-services-workspace.test.ts test/nuxt/operations-page.test.ts test/nuxt/marketplace-categories-workspace.test.ts
      Tests  49 passed (49)
bunx vitest run --project unit  → 1040 passed
bun run typecheck               → aucune erreur
bun run i18n:check              → ok
```

## Notes pour le relecteur

- Les montants d'assurance et d'installation encaissés sont inscrits au compte `revenu_services` du registre financier, à la confirmation de la commande.
