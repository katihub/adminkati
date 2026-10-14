# Grille des frais de livraison dans le panel

## Objectif

Lot 3 du plan maître `../plans/2026-10-15-corrections-et-completions.md`, décidé le 15 octobre : **une grille par ville tenue par KatiHub**, avec un tarif par ville et par mode. La direction doit pouvoir la créer et la tenir à jour depuis le panel.

## Contrat backend

- `GET /v1/marketplace/livraison/tarifs/administration` (direction) : tous les tarifs (`ville`, `mode`, `montantFcfa`, `gratuitDesFcfa`, `actif`).
- `POST /v1/marketplace/livraison/tarifs`, `PATCH …/:id` (`montantFcfa`, `gratuitDesFcfa` ou `null`, `actif`) et `DELETE …/:id`.
- Un tarif existe au plus une fois par ville et par mode (409 sinon).

## Phases

1. **Données** : `app/composables/useDeliveryFees.ts`, `app/utils/api-query-keys.ts`.
2. **Écran** : l'onglet « Frais de livraison », réservé à la direction, dans `app/pages/operations.vue`, avec `DeliveryFeesWorkspace.vue`.
   - La grille regroupée par ville, et pour chaque mode : le montant, le seuil de gratuité et l'état.
   - La création, la modification, l'activation ou la désactivation, et la suppression confirmée.
   - Les traductions fr et en.
3. **Tests** : `test/nuxt/delivery-fees-workspace.test.ts` et `test/nuxt/operations-page.test.ts`.
