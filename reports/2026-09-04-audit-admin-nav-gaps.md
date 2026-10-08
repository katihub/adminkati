# Audit — admin nav coverage vs. backend controllers

**Date:** 2026-09-04
**Question:** Which backend APIs have no navigation item on the admin panel?

## Method

Enumerated every NestJS controller in the sibling backend repo (`../NowTech-backend-/src/**/*.controller.ts`,
11 controllers) and its routes/role guards. Compared that against `app/utils/admin-navigation.ts`
(the single source `AdminHeader.vue`/`AdminNavigation.vue` render from) and, for each apparent gap,
searched `app/composables/`, `app/types/api/`, and `app/pages/` for any existing client wiring that
just lacked a nav entry versus a feature with no frontend at all.

Did not read the backend's Prisma schema, run its Swagger UI, or check its git history — controller
source (routes, `@Roles`, doc comments) was treated as authoritative. Did not evaluate whether the
existing pages fully cover the backend surface they do link to (e.g. whether `products.vue` exposes
every `catalogue/administration` route) — only whether a destination exists at all.

## Executive finding

Two backend surfaces had no nav item: `caisse` (cash-register reconciliation) and `devis` (quotes).
`caisse` was the more notable gap — its client data layer (`useCaisse.ts`, `types/api/caisse.ts`,
query keys) was already fully built and simply unreachable; `devis` had no frontend wiring
whatsoever. A third issue surfaced as a side effect of checking `propositions` (added the prior
session without checking its backend): its placeholder copy described a feature that doesn't exist.

## Findings

### 1. `caisse` — full data layer, no nav item, no page

`app/composables/useCaisse.ts` already wraps `GET /caisses`, `/caisses/encours`, `/caisses/:id`, and
`POST /caisses/:id/{compter,ecart,valider}`; `app/types/api/caisse.ts` mirrors the backend shapes;
`useOrderMutations.ts:12` invalidates `apiQueryKeys.caisse.all` on encaissement. None of it is
reachable — no route, no nav entry. `app/pages/index.vue:106` mentions "caisse" only in SEO copy, not
as an actual data consumer. Backend: `src/caisse/caisse.controller.ts`, `direction`+`comptoir`.

### 2. `devis` — no client wiring at all

No type file, no composable, no page. `app/types/api/commandes.ts:109` carries a `devisId` field on
an order but nothing resolves it. Backend: `src/devis/devis.controller.ts` — staff-facing
`GET /devis/equipe` is gated `direction`+`comptoir`+`preparation` (client-facing `POST /devis`,
`GET /devis` are self-service and out of scope for an admin nav item).

### 3. `propositions` copy describes a feature that isn't the real one

`app/pages/propositions.vue`, added the previous session on request without checking the backend,
described "featured product propositions shown to shoppers." The actual backend
(`src/catalogue/administration.controller.ts` `GET/POST .../propositions*`) is diffs proposed by the
WooCommerce sync (before/after value pairs) that `direction` accepts or rejects — an unrelated
feature that happens to share the English word.

## Not a gap

- `sante` — health probe + `/moi` whoami, infra/diagnostic, not admin content.
- `auth` — login/session, not a nav destination.
- `profil`'s self-service routes (`/profil`, `/adresses`) — client-facing, deliberately separate from
  the admin panel's `/clients` (comptoir-facing) routes on the same controller, which `users.vue`
  already covers.

## Recommendation

Add `caisse` and `devis` nav items with placeholder pages (matching the `banners.vue` /
`propositions.vue` shape already in the repo), gated to match their backend guards, and correct
`propositions.vue`'s copy. Tracked in `plans/2026-09-04-caisse-devis-nav.md`.
