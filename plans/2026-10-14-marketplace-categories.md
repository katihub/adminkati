# Gestion des catégories marketplace dans le panel

## Objectif

Donner à la direction l'écran du lot 2 du plan maître `../plans/2026-10-14-categories-marketplace.md` : créer, modifier, activer, désactiver et supprimer les catégories et sous-catégories que les marchands choisissent, et fixer pour chacune une garantie minimale, saisie en mois ou en années.

## Contrat backend

- `GET /v1/marketplace/categories/administration` (direction) : l'arbre complet, catégories inactives comprises. Chaque nœud porte `produits` (le nombre de produits rattachés) et `garantie` (`mois`, `unite`, `heritee`, `libelle`).
- `POST /v1/marketplace/categories` avec `{ nom, parentId?, garantie?: { valeur, unite }, ordre? }`. La garantie est obligatoire au premier niveau.
- `PATCH /v1/marketplace/categories/:id` avec `{ nom?, garantie?: {…} | null, ordre?, active? }`. `garantie: null` fait hériter une sous-catégorie de sa catégorie.
- `DELETE /v1/marketplace/categories/:id` : réservé à une catégorie vide, sinon 409.

## Phases

### 1. Données

- **Quoi :** types, clés de requête, requête et mutations.
- **Où :** `app/types/api/marketplace-categories.ts`, `app/utils/api-query-keys.ts`, `app/composables/useMarketplaceCategories.ts`.

### 2. Écran

- **Quoi :** onglet « Catégories marketplace », réservé à la direction, dans les opérations.
  - Arbre : garantie de chaque nœud, mention « héritée », nombre de produits, statut.
  - Formulaire : nom, garantie (durée et unité mois ou années, ou héritage pour une sous-catégorie), ordre.
  - Actions : activer ou désactiver. La suppression est confirmée, et désactivée tant que la catégorie contient des produits ou des sous-catégories.
- **Où :** `app/components/operations/MarketplaceCategoriesWorkspace.vue`, `app/pages/operations.vue`, `i18n/locales/operations/*.json`.

### 3. Tests

- **Où :** `test/nuxt/marketplace-categories-workspace.test.ts`, `test/nuxt/operations-page.test.ts`.
