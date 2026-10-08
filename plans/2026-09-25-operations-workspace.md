# Operations Workspace

## Requirement

Combine the existing Cash Register and Customer Requests destinations into one tabbed Operations
workspace. Model the shared page header and tab URL state on `app/pages/content.vue`. The user chose
the name **Operations** / **Opérations**; the two tabs remain **Cash Registers** and **Customer
Requests**.

## Existing Shape And Reuse

- `app/pages/content.vue` is the precedent for `AdminPageHeader`, `PillTabs`, an explicit `tab`
  query parameter, and query-driven active tabs.
- `app/pages/caisse.vue` and `app/pages/assistant.vue` already own distinct, complete
  master-detail workspaces. Their existing `Caisse*` and `Assistant*` components, composables,
  query keys, data contracts, role checks, loading, empty, and error states are reused unchanged.
- `app/utils/admin-navigation.ts` holds the two destinations that become one; its locale labels live
  in `i18n/locales/common/{en,fr}.json`.

## Data Contracts And States

No backend endpoint or API type changes are required.

- The cash-register tab continues to use `GET /caisses`, `GET /caisses/encours`, team directory
  data, and `GET /caisses/:id`. Its list, detail loading, empty selection, and API-error states stay
  inside the extracted cash-register workspace.
- The customer-requests tab continues to use
  `GET /assistant/administration/demandes[/:id]`. Its list, selection, detail loading, empty,
  expired-conversation, and API-error states stay inside the extracted customer-requests workspace.
- The Operations page owns only `tab`: `cash-registers` is the default and omits `tab`; requests use
  `?tab=customer-requests`. Existing detail/filter query keys remain owned by their respective
  workspace.

## Test Seams

The user-facing seams are the Operations route and the admin navigation:

- A direct Operations URL selects the corresponding tab and renders its existing workspace.
- Selecting a tab changes the shareable `tab` query and active tab affordance.
- The navigation exposes one Operations destination for `direction` and `comptoir`, with English
  `/operations` and French `/fr/operations` routes.
- Existing customer-request and cash-register deep links remain usable through redirects to their
  respective Operations tabs, retaining their existing query state.

The existing workspace suites are moved to mount the Operations route/tab rather than re-testing the
already-covered internal panels.

## Risks And Assumptions

- **Risk:** rendering both workspace components at once would double SSR prefetch requests against
  the shared backend throttle. Render exactly the active tab with `v-if`, so only its setup and SSR
  prefetch run.
- **Risk:** the page-level cash toolbar becomes visually disconnected when its page header is
  removed. Keep it immediately beneath the Operations tab strip, before the cash workspace grid.
- **Assumption:** `operations` is appropriate for both localized URLs; French remains locale-prefixed
  as `/fr/operations`, while its UI label is translated as `Opérations`.
- **Assumption:** current `/assistant?demande=…` links are a concrete external consumer because the
  page documents email alerts that emit them. Preserve both legacy route families with query-aware
  redirects; no additional compatibility routes are added.

## Implementation Plan

1. Extract the cash-register page orchestration into a reusable workspace component.
   - **What changes:** Move the data prefetch, workspace filter state, selected-caisse URL state, and
     existing list/detail layout from `app/pages/caisse.vue` into a new `.vue` component under
     `app/components/operations/`. Remove only page-specific routing, SEO, and header ownership;
     retain the existing `CaisseFilterBar`, `CaisseListPanel`, and `CaisseDetailPanel` behavior.
   - **Where:** `app/components/operations/CashRegistersWorkspace.vue` (new),
     `app/pages/caisse.vue` (legacy redirect only).
   - **Done when:** mounting the default Operations tab retains first-row selection, `?caisse=` deep
     links, the cash filter bar, and the current empty/loading/error panel states.

2. Extract the customer-requests page orchestration into a reusable workspace component.
   - **What changes:** Move the request query parsing, conditional SSR prefetch, role capability,
     selection navigation, and existing list/detail layout from `app/pages/assistant.vue` into a new
     `.vue` component under `app/components/operations/`. Remove only page-specific routing, SEO,
     and header ownership.
   - **Where:** `app/components/operations/CustomerRequestsWorkspace.vue` (new),
     `app/pages/assistant.vue` (legacy redirect only).
   - **Done when:** an Operations requests-tab URL retains status/page/request query behavior and all
     existing customer-request list and detail states.

3. Add the Operations parent route and consolidate navigation and locale text.
   - **What changes:** Create `app/pages/operations.vue` with admin metadata, custom English/French
     paths, localized Operations SEO metadata, a content-style `AdminPageHeader`, and two
     query-controlled `PillTabs`. Render only the selected extracted workspace. Replace the two
     navigation entries with one Operations entry and add its English/French labels and tab labels.
     Make `caisse.vue` and `assistant.vue` redirect their historical locale-aware paths to the
     matching Operations tab without dropping query keys.
   - **Where:** `app/pages/operations.vue` (new), `app/pages/caisse.vue`,
     `app/pages/assistant.vue`, `app/utils/admin-navigation.ts`,
     `i18n/locales/common/en.json`, `i18n/locales/common/fr.json`, and dedicated Operations locale
     files if the page metadata/tab labels do not fit the shared navigation domain.
   - **Done when:** the desktop/mobile navigation has one active Operations link, `/operations` opens
     Cash Registers, `/operations?tab=customer-requests` opens Customer Requests, and old request or
     cash URLs redirect to their matching tab with their selection query intact.

4. Write and run the user-facing regression tests before implementation, then update the affected
   suites to the new public route.
   - **What changes:** Add Operations tab and legacy-redirect coverage. Change existing cash and
     customer-request workspace tests to mount `operations.vue` with the appropriate `tab` query;
     update navigation expectations from two items/routes to one.
   - **Where:** `test/nuxt/operations-page.test.ts` (new),
     `test/nuxt/caisse-workspace.test.ts`, `test/nuxt/assistant-workspace.test.ts`, and
     `test/nuxt/admin-navigation.test.ts`.
   - **Done when:** the new/updated tests fail before their implementation exists for the intended
     route/tab reason, then pass with `bunx vitest run` for those files.

5. Verify the integrated change and record its implementation.
   - **What changes:** Run the relevant Vitest files, `bun run lint`, `bun run typecheck`, and
     `bun run fallow`; write the implementation walkthrough using this plan's slug.
   - **Where:** validation commands and `walkthroughs/2026-09-25-operations-workspace.md`.
   - **Done when:** the commands report clean results (or documented pre-existing failures) and the
     walkthrough lists actual command output and any deviation from this plan.
