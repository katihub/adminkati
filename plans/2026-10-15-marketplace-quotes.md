# Suivi des devis marketplace dans le panel

## Objectif

Lot 6 du plan maître `../plans/2026-10-15-corrections-et-completions.md`. La direction suit tous les devis marketplace : où ils en sont, quelles boutiques tardent à répondre, combien deviennent des commandes. Elle peut aussi déclencher les relances sans attendre la tâche horaire.

## Contrat backend

- `GET /v1/marketplace/administration/devis?statut=&enRetard=` (direction) : `indicateurs` (`total`, `acceptes`, `tauxConversionBps`, `partiesEnRetard`) et `devis`. Chaque devis donne son client, ses parties (statut, `enRetard`, boutique) et sa commande.
- `GET …/:reference/pdf` : le devis complet.
- `POST …/relances` : une passe de relances, avec son bilan (`boutiquesRelancees`, `clientsPrevenus`).

## Phases

1. **Données** : `app/composables/useMarketplaceQuotes.ts`, `app/utils/api-query-keys.ts`.
2. **Écran** : l'onglet « Devis marketplace » (direction), avec `MarketplaceQuotesWorkspace.vue`.
   - Les indicateurs et les filtres (statut, en retard).
   - Les devis et leurs parties, une partie en retard étant mise en évidence.
   - Le PDF et le bouton « Relancer maintenant ».
3. **Tests** : `test/nuxt/marketplace-quotes-workspace.test.ts` et `test/nuxt/operations-page.test.ts`.
