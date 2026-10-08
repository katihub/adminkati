# Walkthrough — customer-orders-tab

Plan: [`plans/2026-09-28-customer-orders-tab.md`](../plans/2026-09-28-customer-orders-tab.md)

## What I built

The selected customer's detail panel now has Profile/Orders tabs in its sticky header — on the same
row as the name, status badge, and status actions, centered between them. Orders shows that
customer's order history (paginated, backend-filtered by `clientId`), lazily: nothing is requested
until the tab is opened. Each row links to the existing `/orders?order=<reference>` workspace,
locale-aware.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| 1 · Backend `clientId` filter | Done | `../../nvc/NowTech-backend-/src/commandes/{commandes.dto.ts,commandes.service.ts}` — separate repo, uncommitted there (see Notes) |
| 2 · Customer-aware orders query | Done, smaller than planned (see Deviations) | `app/types/api/commandes.ts` |
| 3 · Lazy customer-orders tab | Done, tabs relocated (see Deviations) | `app/components/users/{DetailHeader,DetailPanel,OrdersTab,ProfileTab}.vue`, `i18n/locales/users/{en,fr}.json` |
| 4 · Behavioural/integration tests | Done — pre-existing file, unmodified | `test/nuxt/users-orders-tab.test.ts` (7/7 pass against this implementation) |

## Deviations

1. **Tabs live in `UsersDetailHeader`, not below it.** The plan said "below the existing
   `UsersDetailHeader`"; partway through, the user explicitly asked for the tab triggers to sit in
   the header, on the same row as the name/status/actions, then centered. `DetailHeader.vue` gained
   a `#tabs` slot; its row is now a 3-column grid (`1fr auto 1fr`) so the tabs stay visually centered
   regardless of whether the actions slot renders.
2. **Extracted `UsersProfileTab.vue`.** Not in the plan. Folding the profile block back into
   `DetailPanel.vue`'s template pushed its cyclomatic/cognitive complexity over `fallow audit`'s
   threshold (the repo's commit gate). Splitting it out — the same move the plan's own banner work
   made for its pill/card/crown trio — brought it back under.
3. **`useOrders`, `prefetchOrders`, and `apiQueryKeys.orders.list` needed no code changes.** Both
   already take/spread an arbitrary params object, so adding `clientId` to
   `ListerCommandesEquipeQuery` was sufficient for it to flow through the request and the cache key
   unchanged. The plan anticipated tester-written failing tests here; I added them anyway
   (`test/nuxt/orders-api.test.ts`, `test/unit/api-query-keys.test.ts`) to lock in the seam, and the
   `orders-api.test.ts` one was genuinely red first — TypeScript rejected `clientId` on
   `ListerCommandesEquipeQuery` until the type was fixed.
4. **`CommandeAnnuaireItem` corrected as its own interface, not `Omit<CommandeListItem, "lignes">`.**
   Confirmed against the backend's actual `projeterCommandeAnnuaire()` (`commandes.reponse.ts:158-189`):
   it never returns `confirmeParClient`, `motifCloture`, or `livreur`. The old alias claimed those
   fields; nothing in the app read them, so no runtime behavior changed, but the type no longer lies.
5. **Backend needed one more fix beyond the plan's text.** `c.client_id = $n` bound as a plain string
   parameter fails at the Postgres wire level: `operator does not exist: uuid = text` (raw
   `$queryRawUnsafe`, no implicit cast). Found by reproducing the query directly against the dev
   database, bypassing HTTP. Fixed with an explicit `::uuid` cast on that one condition; the existing
   jest assertion (`stringContaining('c.client_id = $1')`) still matches the longer string.

## Tests

- `env -C ../../nvc/NowTech-backend- node -e ...` direct repro against the real dev Postgres (via the
  compiled service, no HTTP/auth) — reproduced the `uuid = text` 500, then confirmed the fix returns
  the two real orders for that customer.
- `npx jest commandes.service.spec.ts` (backend) — 11/11 pass, including the two new `clientId`
  validation/binding cases.
- `npx jest` (backend, full suite) — 163 passed, 11 failed across `administration.service.spec.ts`
  and `main.spec.ts`; both pre-existing and unrelated (an Express-version mismatch breaks
  `app.set` in `main.ts`, and one catalogue fixture assertion) — untouched by this change.
- `bunx vitest run test/nuxt/orders-api.test.ts test/unit/api-query-keys.test.ts` — 17/17 pass.
- `bunx vitest run test/nuxt/users-orders-tab.test.ts` — 7/7 pass (lazy fetch, loading, localized
  link, empty-without-profile, initial-error retry, later-page-failure retry with rows retained,
  reset-on-customer-switch).
- `bunx vitest run test/nuxt/users-workspace.test.ts` — 4/4 pass (no regression on the unchanged
  default detail state).
- `bunx vitest run` (full frontend suite) — 998 passed, 6 failed; all 6 are the pre-existing IPX
  image-rendering failures already noted in `walkthroughs/2026-09-28-point-of-sale-wizard.md`,
  unrelated to this change.
- `bun run i18n:check` — passed.
- `bun run lint` — passed.
- `bun run fallow` — failed once (`DetailPanel.vue` template over the complexity threshold after
  adding the tab switch inline), fixed by extracting `UsersProfileTab.vue`, then passed clean.
- `bun run typecheck` (`nuxt typecheck`) — passed, exit 0.

## Not done

Nothing from the plan is outstanding. The one open item is operational, not code: the backend
`clientId` filter is implemented and tested but sits **uncommitted in a separate repository**
(`../../nvc/NowTech-backend-`, on `main`) — it was not committed or pushed from here, since that is
a different repo/remote with its own review process. It needs its own commit/push/deploy decision
before this tab works against a real deployed backend.

## Notes for the reviewer

- The backend diff is in `../../nvc/NowTech-backend-/src/commandes/`, not in this repo's diff —
  review it there. That repo's working tree also carries an unrelated, pre-existing
  `pnpm-workspace.yaml` change (local `allowBuilds` template drift); I left it alone.
- The header's `grid-cols-[1fr_auto_1fr]` centering was eyeballed with the user live in a real
  browser session (not captured as an automated visual test) — worth a second look at narrow widths,
  where the row has no explicit wrap behavior yet.
- Two console warnings the user saw during the session (`Failed to resolve component: Skeleton` on
  the pre-existing `UsersListLoading`, and a stale `profileMetadata was accessed` warning against an
  old compiled version of `DetailPanel.vue`) were confirmed to be dev-server HMR staleness from
  editing while the page was open — not present in the current source, and gone after a reload.
