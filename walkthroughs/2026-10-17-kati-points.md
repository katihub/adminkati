# Walkthrough — administration des points KATI

Plan : `plans/2026-10-17-kati-points.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Données | fait | `app/types/api/kati.ts`, `app/composables/useKati.ts`, `app/utils/api-query-keys.ts` (`kati`) |
| 2. Écrans | fait | `app/components/operations/kati/` (`KatiWorkspace`, `KatiOverview`, `KatiClients`, `KatiSponsorships`, `KatiPolicy`), onglet `kati-points` (direction) dans `app/pages/operations.vue`, traductions `operations.kati.*` et `operations.tabs.katiPoints` |
| 3. Tests | fait | `test/nuxt/kati-workspace.test.ts` (4 cas), `test/nuxt/operations-page.test.ts` (nouvel onglet) |

## Écarts par rapport au plan

- Les taux se saisissent en pourcentage (1,5 %) et partent en points de base (150) ; le formulaire repart du brouillon en attente s'il y en a un, sinon de la politique en vigueur.
- Les champs décimaux portent `step="any"` : avec `step="0.01"`, la validation native jugeait 1,5 invalide (arrondi flottant) et bloquait l'envoi.
- L'ajustement tire sa clé d'idempotence à l'ouverture du formulaire : un double clic n'ajuste qu'une fois, le backend renvoie la même transaction.

## Tests exécutés

```
bunx vitest run                 → 2070 passed (248 fichiers)
bunx vitest run --project unit  → 1040 passed
bun run typecheck               → aucune erreur
bun run i18n:check              → ok
```

## Notes pour le relecteur

- Aucun solde ne se modifie directement : un ajustement est une transaction `ajustement` du registre KATI, en partie double, journalisée avec l'administrateur et le motif.
- « Lancer les traitements » exécute ce que la tâche planifiée du backend fait toutes les dix minutes ; c'est utile après une livraison ou pour vérifier une libération.
