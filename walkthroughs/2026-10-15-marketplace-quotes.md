# Walkthrough — suivi des devis marketplace

Plan : `plans/2026-10-15-marketplace-quotes.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Données | fait | `app/composables/useMarketplaceQuotes.ts`, `app/utils/api-query-keys.ts` (`marketplaceQuotes`) |
| 2. Écran | fait | `app/components/operations/MarketplaceQuotesWorkspace.vue`, onglet `marketplace-quotes` (direction) dans `app/pages/operations.vue`, traductions `operations.quotes.*` et `operations.tabs.marketplaceQuotes` |
| 3. Tests | fait | `test/nuxt/marketplace-quotes-workspace.test.ts`, `test/nuxt/operations-page.test.ts` |

## Écarts par rapport au plan

- L'écran est en lecture seule : la direction ne modifie pas un devis, puisque les réponses vont directement des boutiques au client (décision du 15 octobre).
- Le filtre de statut ne propose pas « Annulé » : aucun parcours n'annule encore un devis.

## Tests exécutés

```
bunx vitest run --project nuxt test/nuxt/marketplace-quotes-workspace.test.ts test/nuxt/operations-page.test.ts
      27 passed, 1 failed  ← le cas du devis : il attendait le PDF pendant le rechargement déclenché par le filtre ; corrigé en attendant le retour de la liste
bunx vitest run --project nuxt test/nuxt/marketplace-quotes-workspace.test.ts
      Tests  1 passed (1)
bun run typecheck   → aucune erreur
bun run i18n:check  → ok
```

## Notes pour le relecteur

- Chaque relance ne part qu'une fois : la clé de notification la déduplique. Un second clic sur « Relancer maintenant » renvoie donc un bilan à 0.
