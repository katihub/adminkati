# Walkthrough — agents des boutiques

Plan : `plans/2026-10-18-shop-agents.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Données | fait | `app/types/api/shop-agents.ts`, `app/composables/useShopAgents.ts`, `app/utils/api-query-keys.ts` (`shopAgents`) |
| 2. Écran | fait | `app/components/operations/ShopAgentsWorkspace.vue`, onglet `shop-agents` (direction) dans `app/pages/operations.vue`, traductions `operations.shopAgents.*` et `operations.tabs.shopAgents` |
| 3. Tests | fait | `test/nuxt/shop-agents-workspace.test.ts` (2 cas), `test/nuxt/operations-page.test.ts` (nouvel onglet) |

## Écarts par rapport au plan

- Le plafond est facultatif à la vérification. Laissé vide, il n'est pas envoyé et le plafond de la ville s'applique.
- Un agent retiré par sa boutique reste visible dans « Tous les agents », sans action.
- L'écran ne modifie pas le plafond d'un agent déjà vérifié. Le backend ne l'expose pas encore hors de la vérification.

## Tests exécutés

```
bunx vitest run test/nuxt/shop-agents-workspace.test.ts test/nuxt/operations-page.test.ts → 58 passés
bunx vitest run                 → suite complète
bun run typecheck               → aucune erreur
bun run i18n:check              → ok
```

## Notes pour le relecteur

- Côté vitrine, l'espace vendeur (`LivraisonsBoutique.tsx`) affiche « En attente de vérification KatiHub » tant que l'agent n'est pas vérifié, et le plafond une fois fixé.
