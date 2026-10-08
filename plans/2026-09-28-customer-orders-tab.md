# Customer Orders Tab

## Goal

Add an Orders tab to the selected customer detail panel. It shows that customer's paginated order summaries and links each summary to its existing order workspace detail. It does not add editing, filtering, or a second order-detail view inside Users.

The point-of-sale prerequisite is already committed as `3d6673d`; this plan must not touch the concurrent banner worktree changes.

## Decisions And Reuse

- Extend the established team order directory with a typed `clientId` filter rather than creating a second customer-orders endpoint. This preserves the existing pagination shape, role-aware projection, TanStack Query composable, mutation invalidation prefix, and order-detail URL contract.
- Add `UsersOrdersTab.vue` below the existing `UsersDetailHeader`, driven by the local `PillTabs` pattern used by taxonomy detail panels. The tab starts on Profile and resets to Profile when `detail.client.id` changes.
- Do not add `?tab=` URL state. `?id=` already identifies a restorable customer selection; this nested, non-destructive view is not independently linkable, and URL state would make it tempting to SSR-prefetch below-fold order history. Mount the Orders tab with `v-if` only after a user activates it.
- Reuse `useOrders`, `apiQueryKeys.orders.list`, `InfiniteListFooter`, `ApiErrorCard`, `EmptyStateCard`, `formatDateCourte`, `formatMontant`, `ORDER_STATUS_TONE`, and `NuxtLinkLocale`. Do not mirror orders into Pinia or add a customer-orders store.
- The order row must be a locale-aware `<NuxtLinkLocale :to="{ path: '/orders', query: { order: reference } }">`, matching the existing cash-register and quote links. It opens the existing localized orders route with its existing `?order=` selection contract.

## Data Contract And Authorization

### Required Backend Addition

The browser-facing request is:

```text
GET /api/v1/commandes/equipe/annuaire?clientId=<customer UUID>&tri=recent&taille=50&page=1
```

The BFF forwards it unchanged to:

```text
GET /v1/commandes/equipe/annuaire?clientId=<customer UUID>&tri=recent&taille=50&page=1
```

Add optional `clientId` to `ListerCommandesEquipeDto`, validated with `@IsUUID()`. `CommandesService.listerAnnuairePourEquipe()` must add a parameterized `c.client_id = $n` condition to both the count and row queries when supplied. It must compose with the current status, search, sort, and pagination conditions, never interpolate the UUID into SQL.

The response remains the existing `CommandeAnnuairePage`:

```ts
interface CommandeAnnuairePage {
  total: number
  page: number
  taille: number
  pages: number
  elements: CommandeAnnuaireItem[]
}
```

`CommandeAnnuaireItem` must be modelled as the exact `projeterCommandeAnnuaire()` response, not as `Omit<CommandeListItem, "lignes">`: every caller receives `id`, `reference`, `statut`, `modeRemise`, `modePaiementSouhaite`, `comptoir`, `creeLe`, `closeLe`, and `ligneCount`; `direction` and `comptoir` additionally receive the optional financial/customer fields (`totalEstimeTtc`, `totalFermeTtc`, `totalFacturableTtc`, `resteAPayer`, `statutPaiement`, `clientNom`, `clientTelephone`). It does not contain lines, delivery address, phone-at-door, courier, transition state, or a `clientId` response field.

Authorization remains on the existing `@Roles(Role.direction, Role.comptoir, Role.preparation)` team-directory route. The Users page itself retains `definePageMeta({ roles: ["direction", "comptoir"] })`, so neither `preparation` nor `livreur` can open this UI. The backend remains the enforcement boundary: a client session is rejected by the role guard, `livreur` is excluded, invalid UUIDs are rejected before persistence, and the response projection continues to omit financial and customer-contact fields for `preparation` callers. The existing directory already authorizes `preparation`; the `clientId` filter must not broaden that route's role set.

## Async, SSR, And Responsive States

- **SSR/default tab:** retain `app/pages/users.vue`'s current prefetch of the customer directory and selected customer detail only. The Orders tab is absent from the initial component tree, so it makes no server request and adds no pressure to the backend's shared 10 requests/second ceiling.
- **Initial loading:** after the operator opens Orders, show compact skeleton rows while page one is pending.
- **Initial error:** render `ApiErrorCard` in the wide detail panel and wire its retry action to the TanStack query's `refetch`.
- **Empty success:** render `EmptyStateCard` with the customer-orders copy. An incomplete profile does not prevent the tab from querying by `detail.client.id`.
- **Success and pagination:** render compact summary links, then use `InfiniteListFooter` for further pages. If a later page fails, retain the already loaded rows and show the footer retry state rather than replacing them with a full error card.
- **Role-shaped fields:** render an amount only when the optional monetary field is present; never substitute a made-up zero for a field the API withheld.
- **Customer change:** reset to Profile before mounting a different customer's query, preventing stale history from being shown while the selection updates.
- **Mobile:** preserve the existing mobile back button and single-detail-pane flow. Keep the two `PillTabs` controls in a non-overflowing row, use one-column rows with `min-w-0`/truncation for references, and allow status, date, and amount metadata to wrap without horizontal scrolling.

## Public Test Seams

- `apiQueryKeys.orders.list({ clientId, tri: "recent", taille: 50 })` is the cache key for a customer order history. It remains below `apiQueryKeys.orders.all`, so existing order mutations invalidate it.
- `useOrders()` remains the public client seam; its reactive filters must forward `clientId` together with `page` and preserve infinite-query pagination.
- `UsersDetailPanel` exposes `users-detail-tab-profile` and `users-detail-tab-orders`. `UsersOrdersTab` exposes `users-orders-loading`, `users-orders-empty`, `users-orders-list`, and one `users-orders-link` per result. Its `InfiniteListFooter` uses `users-orders-sentinel` and `users-orders-load-failed`.
- The existing `api-error-card` test seam covers the full-width initial error; retry is observable through a second registered endpoint call.

## Execution Plan

### 1. Lock Down The Backend Directory Filter

**Files:**

- `../../nvc/NowTech-backend-/src/commandes/commandes.dto.ts`
- `../../nvc/NowTech-backend-/src/commandes/commandes.service.ts`
- `../../nvc/NowTech-backend-/src/commandes/commandes.service.spec.ts`

**What changes:**

1. Have the tester add failing service/DTO coverage for a valid customer UUID filter, an invalid UUID rejection, parameterized `c.client_id` filtering in both directory queries, preserved pagination, and the existing audience projection rules.
2. Add the optional validated `clientId` DTO field and apply it as a bound SQL condition in `listerAnnuairePourEquipe()` without changing the route or its role decorator.
3. Keep the response projection as `projeterCommandeAnnuaire()` so no line details or extra PII are introduced by this filter.

**Done when:** a direction/comptoir request for one UUID gets the normal paginated directory shape containing only that customer's summaries; an invalid UUID is a 400; and the current preparation projection test still proves financial/contact fields are absent.

### 2. Make The Existing Orders Query Customer-Aware

**Files:**

- `app/types/api/commandes.ts`
- `app/composables/useOrders.ts`
- `app/utils/api-query-keys.ts`
- `test/nuxt/orders-api.test.ts`
- `test/unit/api-query-keys.test.ts`

**What changes:**

1. Have the tester add failing client-query and cache-key tests: `clientId` reaches `/api/v1/commandes/equipe/annuaire` with the normal first-page parameters; different customer IDs create distinct list keys; both remain invalidated by `orders.all`.
2. Add `clientId?: string` to the handwritten front-end directory-query type with an updated backend source citation.
3. Replace the inaccurate annuaire item alias with the explicit role-shaped response contract above, while retaining only fields the current order list actually consumes.
4. Reuse `useOrders()` and `prefetchOrders()` unchanged in shape so they naturally include `clientId` in their request and key. Do not create a duplicate composable, a new API route, or a Pinia cache.

**Done when:** the API integration test observes `clientId`, `tri`, `taille`, and `page`; cache keys cannot collide across customers; existing global order paging and mutation invalidation behavior remain intact.

### 3. Add The Lazy Customer-Orders Tab

**Files:**

- `app/components/users/DetailPanel.vue`
- `app/components/users/OrdersTab.vue` (new)
- `i18n/locales/users/en.json`
- `i18n/locales/users/fr.json`

**What changes:**

1. Have the tester first mount the detail panel with a customer and prove the default Profile tab does not call the customer-filtered orders endpoint; opening Orders makes exactly its first-page request, then renders the returned references and links.
2. In `DetailPanel.vue`, introduce the local Profile/Orders `PillTabs` only for a loaded customer detail. Reset local tab state to Profile when the selected customer ID changes. Keep the existing header, profile state, status actions, mobile back action, and top-level loading/error/empty states unchanged.
3. Add `UsersOrdersTab.vue`. It calls `useOrders()` with the current `detail.client.id`, `tri: "recent"`, and `taille: 50`, flattens the infinite-query pages, and renders the prescribed initial/loading/error/empty/partial-pagination states.
4. Implement each result as a compact locale-aware order link to `{ path: "/orders", query: { order: order.reference } }`, displaying only guaranteed summary data. Use the established date, amount, status-tone, and item-count helpers/translations rather than duplicating formatting logic.
5. Add paired English/French `users.tabs` and `users.orders` strings for the tab labels, loading, empty title/hint, item count, and later-page loading/failure text. No raw UI strings may be introduced.

**Done when:** desktop users can switch between profile and customer orders; mobile users can switch without a horizontal overflow and still use Back; a French customer view links to `/fr/commandes?order=<reference>`; a selection change returns the panel to Profile; and no orders request is made until the tab is opened.

### 4. Verify Behavioural States And Integration

**Files:**

- `test/nuxt/users-orders-tab.test.ts` (new)
- `test/nuxt/users-workspace.test.ts` only if the existing workspace fixture needs a regression assertion for the unchanged default detail state

**What changes:**

1. Cover successful first-page rendering and the locale-aware deep link.
2. Cover empty history, first-page failure with `ApiErrorCard` retry, and a failed later page retaining the successful rows with `InfiniteListFooter` retry.
3. Cover no initial request before Orders is activated, tab reset on customer change, and a profile-less customer still being able to open orders.
4. Keep assertions behavioral: requests, query strings, visible state, accessible active tab, and destination URL. Do not snapshot markup or assert Tailwind classes.

**Done when:** the tests prove the functionality, failure recovery, customer isolation request parameter, lazy-fetch performance boundary, and locale-routing behavior without relying on framework internals.

## Risks And Earliest Checks

| Risk | Mitigation / earliest check |
| :-- | :-- |
| The backend currently has no customer filter, so a front-end-only tab could use name search and show another customer's orders. | Land and deploy the validated `clientId` filter first; frontend tests register only the exact filtered endpoint. Never implement this with `q`. |
| `CommandeAnnuaireItem` currently claims fields omitted by `projeterCommandeAnnuaire()`. | Correct the front-end type in phase 2 before the new UI consumes it; typecheck catches remaining invalid reads. |
| Adding the tab to the rendered initial detail would create an unnecessary SSR request per selected customer and risk the shared 10 req/s backend limit. | Default to local Profile state and use `v-if` for the orders component; assert zero calls before activation. |
| A dedicated customer cache could miss the existing order-mutation invalidation. | Keep it under `apiQueryKeys.orders.list()` so `apiQueryKeys.orders.all` continues to invalidate every variant. |
| A plain Nuxt link would lose the French custom `/commandes` path. | Use `NuxtLinkLocale` and verify the French href. |
| The backend lives outside this admin worktree. | Coordinate its merged/deployed contract before front-end release; do not ship a tab that calls an unavailable filter. |

## Validation Commands

Run after the tester's red phase and after implementation:

```bash
bunx vitest run test/unit/api-query-keys.test.ts
bunx vitest run test/nuxt/orders-api.test.ts
bunx vitest run test/nuxt/users-orders-tab.test.ts
bunx vitest run test/nuxt/users-workspace.test.ts
bun run i18n:check
bun run lint
bun run fallow
bun run typecheck
bunx vitest run
bun run build
```

Run the backend repository's focused command for `src/commandes/commandes.service.spec.ts` before its full test suite, using that repository's documented package-manager command.

## Open Questions

- **Backend delivery ownership:** the required filter is in `../../nvc/NowTech-backend-`, not this worktree. Recommendation: treat its merge and deployment as a release dependency, but implement the front end against the exact contract above once the backend change is accepted.
- **Preparation access to a filtered directory:** the existing `equipe/annuaire` route already allows `preparation`, with its redacted projection. Recommendation: preserve that established route policy for this filter; the Users UI remains direction/comptoir-only. If product policy instead requires customer-scoped lookup itself to be restricted, use a separate `@Roles(direction, comptoir)` endpoint and a dedicated query key, which is a larger intentional change.
