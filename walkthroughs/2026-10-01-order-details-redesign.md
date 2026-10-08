# Walkthrough: Redesign OrderDetails panel — Proposition 1 (Command Center)

## What I built

Redesigned the `OrderDetails` panel (`DetailPanel.vue` and its child components in `app/components/orders/`) according to **Proposition 1: Command Center**. Replaced the vertically stacked card layout with an integrated 2-column operational workspace that strictly avoids border clutter and removes all box shadows, relying purely on clean surface contrast (`bg-card rounded-2xl` over `bg-muted/70`), whitespace, and refined typography. Also implemented a comprehensive skeleton UI for order details loading state, fixed horizontal layout clipping on the operational sidebar, and fixed counter resolution for pickup orders.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| 1. Header & Stepper Enhancement | Done | [`app/components/orders/DetailHeader.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/DetailHeader.vue) & [`app/components/orders/DetailStepper.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/DetailStepper.vue) |
| 2. Basic Details Refinement | Done | [`app/components/orders/BasicDetails.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/BasicDetails.vue) |
| 3. Lines & Items Presentation | Done | [`app/components/orders/LinesTable.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/LinesTable.vue) & [`app/components/orders/LineRow.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/LineRow.vue) |
| 4. Financial Card & Settlement | Done | [`app/components/orders/PaymentStatus.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/PaymentStatus.vue) |
| 5. Customer & Delivery Landmark Card | Done | [`app/components/orders/CustomerInfo.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/CustomerInfo.vue) & [`app/components/orders/DeliveryInfo.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/DeliveryInfo.vue) |
| 6. 2-Column Workspace Assembly | Done | [`app/components/orders/DetailPanel.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/DetailPanel.vue) |
| 7. Skeleton Loading State | Done | [`app/components/orders/DetailSkeleton.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/components/orders/DetailSkeleton.vue), [`app/pages/orders.vue`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/app/pages/orders.vue), [`test/nuxt/orders-detail-skeleton.test.ts`](file:///Users/michaelnji/Projects/nowtech-admin/feat-prod-stock-mgt/test/nuxt/orders-detail-skeleton.test.ts) |
| 8. Verification & Quality Gates | Done | Vitest (17 test files), `typecheck`, `lint`, `format`, `i18n:check`, and `fallow audit` all passing |

## Deviations

- **Component extraction for Fallow cognitive complexity**:
  Extracted `DetailStepper.vue` from `DetailHeader.vue` and `DeliveryInfo.vue` from `CustomerInfo.vue`. This kept template branching and cognitive complexity low, ensuring 100% clean passes on both Fallow and Vitest while adhering to the single responsibility principle.
- **Zero borders and zero shadows policy**:
  Per explicit user feedback, removed all container borders (`border border-border`) and box shadows (`shadow-xs`) from cards, subcards, headers, badges, and callout boxes across all redesigned order detail components. Surface distinction is achieved entirely via clean flat card backgrounds (`bg-card rounded-2xl`) against the canvas background (`bg-muted/70`), whitespace, and soft background fills (`bg-muted/40`, `bg-primary/5`, `bg-amber-500/10`, `bg-emerald-500/10`).
- **CSS Grid overflow and column shrinkage fix**:
  Resolved an overflow issue where the right operational column (`PaymentStatus`, `CustomerInfo`) was clipped on viewports >= 1280px. Placed `min-w-0` on both columns and updated the grid definition to `xl:grid-cols-[minmax(0,1fr)_340px]`, allowing the table to size flexibly within its container without pushing the right sidebar offscreen.
- **LinesTable full-height alignment**:
  Expanded `OrdersLinesTable` (`flex-1` within `flex flex-col` in the left column) so that its bottom edge stretches and ends on the exact same horizontal baseline as the Customer Information card in the adjacent column.
- **Unit price and line total columns in LinesTable & LineRow**:
  Updated `LineRow.vue` to compute and render both the unit price (`prixFerme ?? prixCapture`) and the line total (`unitPrice * quantite`). Added corresponding table headers in `LinesTable.vue`, added `unitPrice` translations in `i18n/locales/orders/`, and tightened cell padding (`px-2`) with title truncation (`max-w-[200px]`) so all 6 columns render cleanly.
- **Pickup counter display refinement**:
  Refined `comptoirText` in `BasicDetails.vue` so that when a pickup order has no specific counter assigned, it renders `"—"` rather than `"None — home delivery"`.
- **Skeleton UI replacement**:
  Replaced the simple text loading indicator (`orders.page.loading`) with `OrdersDetailSkeleton.vue`, providing an accessible, layout-identical skeleton reflecting the header, stepper, basic details, line items table, payment card, and delivery sections.

## Tests

- **Nuxt Component Tests (Vitest)**:
  `bunx vitest run test/nuxt/orders-*.test.ts`
  Result: 17 test files passed, 51 tests passed (100% success rate). Covers all data-testid seams, role visibility constraints, courier display conditions, payment triggers, action bar states, unit price & line total assertions, and the new skeleton loading state.
- **Typecheck**:
  `bun run typecheck`
  Result: `Type check passed in 18981ms.`
- **Lint**:
  `bun run lint`
  Result: `0 errors, 2 warnings (unrelated pre-existing).`
- **i18n Key Parity**:
  `bun run i18n:check`
  Result: Clean parity across English and French catalogs.
- **Format**:
  `bun run format:check`
  Result: `All matched files use the correct format.`
- **Fallow Audit**:
  `bun run fallow`
  Result: `✓ No issues in 792 changed files (1.53s)`. Zero cognitive complexity issues in touched order components.
- **Visual Browser Verification**:
  Verified in live Chromium browser using `agent-browser`. Captured screenshots:
  - Full aligned command center with Unit Price & Total Price (Dark): `/Users/michaelnji/.gemini/antigravity-cli/brain/d461f0bd-fe5a-48f4-a9c3-d290af5f3e7a/order-details-prices-v2-full.png`
  - Full aligned command center with Unit Price & Total Price (Light): `/Users/michaelnji/.gemini/antigravity-cli/brain/d461f0bd-fe5a-48f4-a9c3-d290af5f3e7a/order-details-prices-v2-light.png`
  - Dark mode without shadows: `/Users/michaelnji/.gemini/antigravity-cli/brain/d461f0bd-fe5a-48f4-a9c3-d290af5f3e7a/order-details-noshadow-dark.png`
  - Light mode without shadows: `/Users/michaelnji/.gemini/antigravity-cli/brain/d461f0bd-fe5a-48f4-a9c3-d290af5f3e7a/order-details-noshadow-light.png`
  - Skeleton dark mode: `/Users/michaelnji/.gemini/antigravity-cli/brain/d461f0bd-fe5a-48f4-a9c3-d290af5f3e7a/order-details-skeleton.png`
  - Skeleton light mode: `/Users/michaelnji/.gemini/antigravity-cli/brain/d461f0bd-fe5a-48f4-a9c3-d290af5f3e7a/order-details-skeleton-light.png`

## Not done

None. All requested items and visual fixes have been completed.

## Notes for the reviewer

- `OrdersDetailSkeleton.vue` is auto-imported and activated when `isOrderPending` is true in `app/pages/orders.vue`. It retains `data-testid="orders-detail-loading"`, `role="status"`, and `aria-busy="true"`.
- All `data-testid` attributes used by the integration and component test suites remain intact and verified.
