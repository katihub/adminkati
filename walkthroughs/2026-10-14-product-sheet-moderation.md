# Walkthrough — modération des fiches produit et des variantes

Plan : `plans/2026-10-14-product-sheet-moderation.md`.

## Ce qui a été construit

| Phase | Statut | Fichiers |
| :-- | :-- | :-- |
| 1. Données | fait | `app/types/api/marketplace-moderation.ts` (`MarketplaceContentReview`, `MarketplaceContentImage`, champs de variante), `app/utils/api-query-keys.ts` (`contents`), `app/composables/useMarketplaceModeration.ts` (`useMarketplaceContentReviews`, `claimContent`, `decideContent`) |
| 2. Écran | fait | `MarketplaceCatalogueModerationWorkspace.vue` : file « Fiches », blocs `content-review-seo` et `content-review-gallery`, variante dans le détail d'une offre et dans la liste ; traductions fr/en `operations.catalogue.*` |
| 3. Tests | fait | `test/nuxt/marketplace-content-moderation.test.ts` |

## Écarts par rapport au plan

- Les onglets de file, « Prendre en charge » et « Approuver » portent désormais un `data-testid`. Les tests du panel tournent en anglais : viser les libellés aurait lié le test à la langue.
- Le titre, le sous-titre et le texte de recherche du détail sont passés en `computed`, puisqu'il y a maintenant trois files au lieu de deux.

## Tests exécutés

```
bunx vitest run --project nuxt test/nuxt/marketplace-content-moderation.test.ts
      Tests  2 passed (2)
bun run typecheck   → aucune erreur
bunx oxlint         → 2 avertissements préexistants (session.ts, categorie-schema.test.ts)
bun run i18n:check  → ok
bun run fallow      → ✓ No issues in 77 changed files
bunx vitest run     → 2030 passed, 3 failed
```

Rejoués seuls, `assistant-workspace` et `operations-page` passent : ils ont expiré sous la charge de la suite complète. `users-orders-tab` (« opens the existing French orders workspace… ») échoue aussi avec ces changements mis de côté (`git stash`) : l'échec est antérieur à ce travail et sans lien avec lui.

## Notes pour le relecteur

- Les images sont affichées par `<img>` directement depuis le bucket public `produits` : ce sont des photos destinées à être publiques, déjà contrôlées (type réel, antivirus) au dépôt.
- Approuver retire côté backend les photos publiées absentes de la galerie proposée ; le texte d'aide de la galerie le dit au modérateur.
