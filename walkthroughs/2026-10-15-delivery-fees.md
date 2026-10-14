# Walkthrough — grille des frais de livraison

Plan : `plans/2026-10-15-delivery-fees.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Données | fait | `app/composables/useDeliveryFees.ts`, `app/utils/api-query-keys.ts` (`deliveryFees`) |
| 2. Écran | fait | `app/components/operations/DeliveryFeesWorkspace.vue`, onglet `delivery-fees` (direction) dans `app/pages/operations.vue`, traductions `operations.deliveryFees.*` et `operations.tabs.deliveryFees` |
| 3. Tests | fait | `test/nuxt/delivery-fees-workspace.test.ts` (2 cas), `test/nuxt/operations-page.test.ts` (nouvel onglet) |

## Écarts par rapport au plan

- La ville et le mode ne se modifient pas après la création : pour changer de ville, il faut créer un nouveau tarif. Seuls le montant, le seuil et l'état se modifient, comme le prévoit la route `PATCH`.
- Le formulaire distingue la création de la modification par un indicateur `creating`, et non par une valeur sentinelle : `i18n:check` prenait la chaîne `"new"` pour du texte affiché.

## Tests exécutés

```
bunx vitest run --project nuxt test/nuxt/delivery-fees-workspace.test.ts test/nuxt/operations-page.test.ts
      Tests  26 passed (26)
bun run typecheck   → aucune erreur
bun run i18n:check  → ok
```

## Notes pour le relecteur

- Une grille vide bloque toutes les livraisons marketplace : l'état vide de l'écran le dit (« Ajoutez au moins Douala »).
- Le backend refuse un doublon ville et mode (409) ; le message s'affiche tel quel dans un toast.
