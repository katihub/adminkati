# Modération des fiches produit et des variantes dans le panel

## Objectif

Donner à la direction l'écran de modération du lot 4 du plan maître `../plans/2026-10-14-administration-produit-marchand.md` : les photos et le référencement que les marchands proposent pour leurs produits, et le libellé des variantes dans la file des offres.

## Contrat backend

- `GET /v1/marketplace/moderation/contenus-produits` (direction) : les révisions `soumise` et `en_verification`, avec le produit (et son SEO actuel), la boutique et la galerie ordonnée. Chaque élément de galerie porte son `image` résolue, ou `null` si le fichier a disparu.
- `POST /v1/marketplace/moderation/contenus-produits/:id/prise-en-charge`, puis `POST …/decision` avec `{ decision: approuvee | modification_demandee | refusee, motif? }`. Le motif est obligatoire hors approbation.
- Les révisions d'offre portent `libelleVariante` et `attributsVariante`.

## Phases

### 1. Données

- **Quoi :** types, clé de requête, requête et mutations des contenus.
- **Où :** `app/types/api/marketplace-moderation.ts`, `app/utils/api-query-keys.ts`, `app/composables/useMarketplaceModeration.ts`.

### 2. Écran

- **Quoi :** troisième file « Fiches » dans l'espace de modération du catalogue : SEO actuel face au SEO proposé (avec la longueur), galerie dans l'ordre de publication avec texte alternatif, type et poids, et un fichier manquant signalé. Libellé et attributs de variante dans le détail d'une offre.
- **Où :** `app/components/operations/MarketplaceCatalogueModerationWorkspace.vue`, `i18n/locales/operations/*.json`.
- **Fini quand :** la direction prend en charge puis décide une fiche sans quitter l'écran.

### 3. Tests

- **Où :** `test/nuxt/marketplace-content-moderation.test.ts`.
