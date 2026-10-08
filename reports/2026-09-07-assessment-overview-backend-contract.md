# Assessment — overview page against the current statistics backend

**Date:** 2026-09-07  
**Question:** Given the data that the backend now manages, what should be removed, added, or modified around `app/pages/index.vue`?  
**Decision:** Use the existing backend endpoint as the single source of truth. Do not remove desired dashboard capabilities merely because their source data is not yet available; preserve them as conditionally rendered backend-owned extensions, never as frontend-generated values.

## Method

Read the current overview page, its query/composable, API type, and every statistics component it renders. Then read the sibling backend's statistics controller, service, and role-projection tests, plus the local route that currently shadows the BFF proxy. The checkout state was inspected before this assessment; no existing source file was modified.

## Findings

### The page already has the correct request topology; a mock route prevents it from using the backend

`app/pages/index.vue:18-24` server-prefetches one `GET /api/v1/statistiques/apercu?periode=…` request and `app/composables/useStatistiquesApercu.ts:10-14` reuses the same query key and path. This is the correct one-request SSR/client-refresh shape.

However, `server/api/v1/statistiques/apercu.get.ts:7-28` is a more-specific Nitro route that returns `apercu-mock.ts`; it wins before the authenticated catch-all BFF in `server/api/v1/[...path].ts:12-27` can proxy the request. The mock only refreshes a session and does not project data by backend role. It therefore returns money and unsupported measurements to every signed-in team member.

The backend now implements `@Equipe() GET /statistiques/apercu` in `NowTech-backend-/src/statistiques/statistiques.controller.ts:14-17`. Its service makes the role projection before it serializes the response (`statistiques.service.ts:157-202`).

### Current backend payloads are intentionally partial and role-safe

The table reflects what the service returns today, not the older mock contract.

| Data | direction / comptoir | preparation | livreur |
| :-- | :-- | :-- | :-- |
| `kpis.totalSales`, `kpis.returnProducts` | present | present | absent |
| `kpis.productRevenue`, `salesStatistics` | present | absent | absent |
| `recentTransactions` | present, including `amount` | present, `amount` omitted | present, `amount` omitted |
| `topSellingProducts` | present, including `earnings` | present, `earnings` omitted | absent |
| `totalStock`, `saleGoal`, `totalProfit` | absent | absent | absent |

Evidence: the assembly of the current source payload is in `statistiques.service.ts:249-304`; the exact redaction expectation is tested in `statistiques.service.spec.ts:138-190`.

`totalStock`, `saleGoal`, and `totalProfit` are not regressions to fill with zeros. The prior backend contract assessment established that the catalogue has only an `en_stock` boolean, not a quantity or historical inventory; it also has no sales-target or cost-of-goods data. The current backend test deliberately verifies their omission.

### The frontend currently requires fields the backend will omit

`app/types/api/statistiques.ts:81-91` marks all dashboard blocks and money fields required. `StatsOverviewBlocks.vue:21-31` then unconditionally renders every block; `KpiGrid.vue:26-54`, `RecentTransactionsCard.vue:49-83`, and `TopSellingProductsCard.vue:31-72` dereference or format values which will be absent for supported roles.

Consequences when the local mock is removed:

- A financial user reaches an exception when `KpiGrid` reads absent `totalStock`, and `OverviewBlocks` passes absent sale-goal and profit data to their cards.
- A preparation user receives no revenue/chart data and no monetary list fields, but the current components still try to render them.
- A livreur receives only redacted transactions, whereas the current layout first assumes KPIs and a top-products list exist.

The backend also maps `close` plus `sans_preuve` to `"unverified"` (`statistiques.service.ts:215-221`), while the frontend's `TransactionStatus` and lookup maps admit only three values (`app/types/api/statistiques.ts:53`, `RecentTransactionsCard.vue:12-22`).

## Recommendation

### Remove

1. Remove the local statistics override, `server/api/v1/statistiques/apercu.get.ts`, and then remove `server/utils/apercu-mock.ts` and its mock-only endpoint tests once role-aware integration tests replace them. This lets the existing page query reach the authenticated BFF and backend endpoint.
2. Remove no dashboard requirement or visual component solely because it lacks a backend value today. In particular, do not retain the mock's stock count, target, or margin as client constants.

### Modify

1. Keep `app/pages/index.vue`'s `team: true`, its one server prefetch, its period picker, and its loading/error behavior. Its request path and query key already match the backend. Its only functional dependency is receiving a role-aware partial payload.
2. Replace the required statistics interface with a contract that represents absence truthfully: optional `kpis`, optional KPI members, optional `salesStatistics`, `saleGoal`, `totalProfit`, `topSellingProducts`, `amount`, and `earnings`. Include `"unverified"` in `TransactionStatus`.
3. Make `StatsOverviewBlocks` and its child cards render only fields present in the response. The UI must infer permission from missing server data, not from a client role check that could drift from the backend. Hide the Amount and Earnings columns when their values are absent; render the transaction feed alone for a livreur.
4. Preserve the two existing financial cards that are genuinely backed today: product revenue and sales statistics. Preserve total sales, returned products, recent transactions, and top-selling products for the roles that receive them.

### Add as backend-owned extensions

1. **Total stock:** retain the tile as a future inventory feature. A true unit count plus comparison needs stock quantity and snapshots/movements. If the immediate business need is merely availability, define a different metric such as `availableProducts` from `nowtech.produits.en_stock`, rename the card, and make its comparison nullable until history exists.
2. **Sales goal:** retain the radial card once the backend stores a management-defined objective for a date range. It cannot be derived from historical sales without turning the goal into a fabricated number.
3. **Profit:** retain the margin card once a cost-of-goods value is captured on each sold order line. A current catalogue price or strike-through price is not historical purchase cost.
4. **Status:** either formally retain the backend's `unverified` status with translated visual treatment, or change its mapping in the backend by product decision. The frontend must not silently coerce it to delivered or in-progress.

## Suggested implementation order

1. First update the boundary type and write failing role-payload component tests: financial, preparation, livreur, and `unverified` transaction cases.
2. Make the rendered blocks and table columns conditional, then pass those tests.
3. Delete the overriding mock route so the pre-existing page query reaches the BFF.
4. Add each future measurement only with its backend storage and aggregation contract; then enable its preserved card when the API returns it.

## Scope limits

No browser request was made and no backend database query was run; conclusions are based on current source and its role-projection tests. This assessment does not select a stock model, sales target, purchase-cost policy, or the product meaning of `sans_preuve`. It also does not implement or change the sibling backend.
