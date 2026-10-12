# Implementation Plan — Super-admin marketplace dashboard

## 1. What the mockup shows

The reference is a dense global marketplace command centre: a dark left rail, a global search header, period controls, eight compact KPIs, three charts, operational rankings, pending approvals, anomalies and quick actions. Its purpose is to let a global administrator see business health and jump directly to the queue that needs attention. Only a desktop frame is supplied; loading, error, empty and responsive states are not shown.

- **M1 — App shell:** navy sidebar, brand, global-admin identity, support block and content canvas.
- **M2 — Header:** global search, notifications, messages, profile and storefront link.
- **M3 — Period control:** explicit date range plus common presets.
- **M4 — KPI strip:** GMV, orders, active sellers, clients, products, commissions, open disputes and withdrawals.
- **M5 — Activity:** revenue/order evolution, traffic and order-status distribution.
- **M6 — Operations:** recent orders, top sellers and top products.
- **M7 — Action queues:** pending shop/product/KYC approvals, payments, fraud, quick actions, support, reviews and system alerts.
- **M8 — Visual system:** white canvas, pale borders, compact typography, orange brand accent, blue information accent and semantic status colours.

## 2. What the requirement asks for

- **R1 — Explicit:** provide a global KatiHub super-admin interface.
- **R2 — Explicit:** identify missing backend capabilities and add the API capabilities required by that interface.
- **R3 — Explicit:** add missing admin interfaces.
- **R4 — Explicit:** use the supplied dashboard as visual inspiration.
- **R5\* — Implied:** show real database values and never placeholder business metrics.
- **R6\* — Implied:** protect global marketplace data so only direction can receive it.
- **R7\* — Implied:** provide loading, error, empty and responsive behaviour.
- **R8\* — Implied:** keep one above-the-fold API request rather than multiplying dashboard requests.

## 3. Mapping

| ID | Element | Requirement | Verdict | Note |
| :-- | :-- | :-- | :-- | :-- |
| M1 | Global shell | R1, R4 | PARTIAL | Reuse the existing authenticated admin shell and navigation instead of replacing the product IA. |
| M2 | Global header/search | R1, R3 | PARTIAL | Keep the existing profile header; add a dashboard search affordance only when a real cross-domain search exists. |
| M3 | Period presets | R1, R4 | MATCH | Reuse `StatsRangePicker` and the existing period contract. |
| M4 | Marketplace KPIs | R1, R2, R5 | MATCH | Extend the existing overview response for direction. |
| M5 | Revenue and order status | R1, R2, R4 | PARTIAL | Reuse the real sales chart and add the missing marketplace status distribution; omit traffic without analytics data. |
| M6 | Recent orders/top products/sellers | R1, R2, R3 | PARTIAL | Reuse existing transactions/products and add the missing seller ranking. |
| M7 | Queues and alerts | R1, R2, R3 | PARTIAL | Add database-backed approvals and alerts; link quick actions to existing routes. |
| M8 | Visual system | R4 | PARTIAL | Preserve KatiHub/NowTech tokens and accessibility while adopting the reference density and hierarchy. |
| — | Role-safe payload | R6 | REQUIREMENT-ONLY | The reference does not describe authorization. |
| — | Async/responsive states | R7 | REQUIREMENT-ONLY | The reference supplies desktop/default only. |
| — | Single dashboard request | R8 | REQUIREMENT-ONLY | Architectural constraint from the repository. |

## 4. Cut from the mockup

| ID | Element | Reason for cut |
| :-- | :-- | :-- |
| M2 | Notification and message counters | No notification/message source exists in this scope. |
| M5 | Marketplace traffic | No trustworthy analytics event store exists. |
| M4 | Withdrawal requests | No withdrawal domain exists yet. |
| M7 | Support-ticket list | Existing assistance data is a neighbouring customer-support surface, not yet a marketplace-wide ticket contract. |
| M7 | Recent reviews | Review moderation exists in operations; duplicating a feed is lower priority than actionable queues. |
| M1 | Decorative support and online cards | Not required for administration and would consume permanent navigation space. |

## 5. Gaps — required but not designed

- **Authorization:** expose the command-centre extension only to the `direction` role.
- **Loading/error/empty:** retain the existing overview skeleton and API error; each new list renders a clear zero state.
- **Responsive:** preserve the current mobile header/navigation and collapse dashboard regions from 12 columns to one column.
- **Data recency:** return `genereLe` through the existing endpoint and retain manual refresh.

## 6. Build plan

### Phase 1 — Direction-only marketplace aggregate

- [ ] Extend `GET /v1/statistiques/apercu` with a direction-only `marketplace` block containing KPI metrics, order status distribution, approval queues, top sellers and alerts.
  - Files: `BackendKati/src/statistiques/statistiques.service.ts`, related specs
  - Serves: R2, R5, R6, R8
  - Done when: contract tests prove the block is present for direction and absent for other roles.

### Phase 2 — Super-admin command centre

- [ ] Extend the typed contract and compose focused dashboard sections from the single overview query.
  - Files: `app/types/api/statistiques.ts`, `app/components/stats/*`, `app/pages/index.vue`
  - Reuses: `StatsRangePicker`, `StatsBlockShell`, existing overview cards/charts and locale-aware links
  - Serves: R1, R3, R4, R7, R8
  - Done when: the direction dashboard exposes marketplace health, queues and navigable quick actions on desktop and mobile without fake values.

### Phase 3 — Verification and trace

- [ ] Run focused tests, type checks, builds and browser visual QA against the supplied reference.
  - Files: `test/nuxt/*`, `walkthroughs/2026-10-11-super-admin-marketplace-dashboard.md`
  - Serves: R5, R7
  - Done when: checks pass and the walkthrough records evidence and intentional deviations.

## 7. Data contracts

The existing `GET /v1/statistiques/apercu?periode=30j` remains the only request. For direction it gains `marketplace`: period/current-and-previous KPIs for GMV and orders; current totals for active sellers, clients, active products and open disputes; commission total; order statuses; approval counts; seller ranking; and data-derived alerts. Other roles receive no `marketplace` property.

## 8. Test plan

- Backend role projection: direction receives the block; comptoir, preparation and livreur do not.
- Backend aggregation: a controlled SQL result maps to the public response and zero values remain valid.
- Frontend component: renders key metrics and queue links; zero queues show a calm empty state.
- Existing partial-contract tests continue to prove that absent optional blocks do not break the dashboard.
- Typecheck/build plus desktop/mobile browser inspection.

## 9. Risks

- Marketplace tables are recent and can be absent in an older database; deployment must apply all migrations before this dashboard endpoint is used.
- “Commission” is derived from planned sub-order commissions until a settled payout/withdrawal domain exists, so the UI must label it precisely.
- A full left-sidebar redesign would alter every admin page and is intentionally outside this vertical dashboard slice.

## 10. Needs a decision

None blocks this slice. The recommended next increment is a dedicated finance/withdrawal domain before adding the withdrawal KPI from the reference.
