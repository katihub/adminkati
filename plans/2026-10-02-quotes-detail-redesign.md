# Redesign QuotesDetail panel — Command Center Layout

## Requirement

Redesign the UI of the `QuotesDetail` panel (`DetailPanel.vue` and its child components in `app/components/quotes/`) following the same Command Center design system established for the `OrderDetails` panel redesign:
1. Integrated Header with operational status badge (with live pulse), reference typography, action controls (Archive dialog), and lifecycle progression stepper (`QuotesDetailStepper.vue`).
2. 2-column responsive split layout:
   - Primary left area (60-65%): Compact metadata strip (`BasicDetails.vue`) and ordered items (`LinesTable.vue`, `LineRow.vue`) with full-height flex stretching.
   - Right operational sidebar (35-40% / 340px on xl): Financial summary card (`AmountSummary.vue`) with high-contrast callout block, customer identity & converted order card (`CustomerInfo.vue`), and catalogue price verification panel (`PriceRefreshPanel.vue`).
3. Loading State: Introduce `QuotesDetailSkeleton.vue` mirroring the 2-column layout and replace the plain text loading message in `Workspace.vue`, maintaining accessible `role="status"` and `data-testid="quotes-detail-loading"`.
4. Strict Zero Borders & Zero Box-Shadows policy: Surface distinction achieved via flat `bg-card rounded-2xl` on canvas `bg-muted/70`, whitespace, and soft background fills (`bg-muted/40`, `bg-primary/5`, `bg-emerald-500/10`).
5. Preserve 100% of existing role gates (`direction`, `comptoir`, `preparation`), API contracts, translation keys, and `data-testid` selectors.

## Reuse

- Container & Page: `app/pages/orders.vue` (under `activeTab === 'quotes'`).
- Panel Orchestrator: `app/components/quotes/Workspace.vue`, `app/components/quotes/DetailPanel.vue`.
- Header & Actions: `app/components/quotes/DetailHeader.vue`, `app/components/quotes/ArchiveDialog.vue`.
- Core Data Components:
  - `app/components/quotes/BasicDetails.vue`
  - `app/components/quotes/LinesTable.vue`, `app/components/quotes/LineRow.vue`
  - `app/components/quotes/AmountSummary.vue`
  - `app/components/quotes/CustomerInfo.vue`
  - `app/components/quotes/PriceRefreshPanel.vue`
- UI Primitives:
  - `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/table`, `@/components/ui/skeleton`, `@/components/ui/empty`
- Composables & Utilities:
  - `useCachedSession`, `useProduit`, `useCustomer`, `useQuoteMutations`
  - `formatDateCourte`, `formatMontant`, `productImageUrl`
  - `QUOTE_STATUS_TONE`

## Data contract

- `DevisDetail`, `DevisLigne`, `StatutDevis`, `RefreshQuoteResult` from `app/types/api/devis.ts`.
- `CustomerAccountDetail`, `CustomerProfile` from `app/types/api/clients.ts`.
- Preserves all conditional role-based visibility (e.g. `preparation` role cannot view product links or archive quotes).

## Implementation phases

1. **Skeleton Loading State (`QuotesDetailSkeleton.vue` & `Workspace.vue`)**:
   - Create `app/components/quotes/DetailSkeleton.vue` with accessible role, status label, and 2-column skeleton structure (header, basic details, lines table, amount summary, customer info, price refresh).
   - Wire `QuotesDetailSkeleton` into `app/components/quotes/Workspace.vue` when `isPending` is true.
   - Add unit/component tests in `test/nuxt/quotes-detail-skeleton.test.ts`.

2. **Header & Lifecycle Progression (`DetailHeader.vue` & `DetailStepper.vue`)**:
   - Modernize `DetailHeader.vue` with sticky positioning, clean bold mono reference, status badge with live pulse indicator, order pill (if converted), and header action slot.
   - Extract `DetailStepper.vue` to show quote status progression (`ouvert` -> `commande` / `archive`), keeping cognitive complexity low.
   - Retain slots and testids (`quotes-detail-header`, `quotes-detail-header-reference`, `quotes-detail-status`, `quotes-detail-actions`).

3. **Basic Details Streamlining (`BasicDetails.vue`)**:
   - Transform into a sleek metadata card (`rounded-2xl bg-card p-5`) with an icon badge (`ph:info`).
   - Clean 4-column responsive definition list displaying quote reference, created date, updated date, and catalogue snapshot date.
   - Retain `data-testid="quotes-detail-basic-details"`.

4. **Lines & Items Presentation (`LinesTable.vue`, `LineRow.vue`)**:
   - Refine `LinesTable.vue` with `flex-1 flex flex-col rounded-2xl bg-card p-5`, icon header (`ph:shopping-bag`), item count pill, and borderless table header (`border-0`, `hover:bg-transparent`).
   - Elevate `LineRow.vue` with subtle hover (`hover:bg-muted/40`), thumbnail with lazy loading, product name link for authorized roles (`canViewProduct`), SKU, quantity badge, unit price, and line total.
   - Retain all `data-testid` attributes (`quotes-lines-table`, `quotes-detail-lines-empty`, `quotes-detail-line`, `quotes-detail-line-image`, `quotes-detail-line-product-link`).

5. **Financial Card (`AmountSummary.vue`)**:
   - Redesign as an actionable financial summary card (`rounded-2xl bg-card p-5 space-y-4`) with an icon badge (`ph:receipt`).
   - Emphasize total with a high-contrast callout block (`bg-primary/5 rounded-xl p-4`) displaying the Total TTC and converted status badge.
   - Tabular breakdown for Subtotal HT, VAT, and Total.
   - Retain `data-testid="quotes-detail-amount"` and `data-testid="quotes-detail-total"`.

6. **Customer & Converted Order Card (`CustomerInfo.vue`)**:
   - Modernize customer identity card with icon badge (`ph:user`), direct tel: call button, company info, and preferred counter.
   - If converted (`quote.commandeReference`), render a prominent order navigation callout box (`bg-primary/5 rounded-xl p-3`).
   - Preserve empty state with `data-testid="quotes-detail-customer-empty"` when customer details are unavailable.
   - Retain `data-testid="quotes-detail-customer-info"`, `data-testid="quotes-detail-customer"`, `data-testid="quotes-detail-phone"`, and `data-testid="quotes-detail-order-link"`.

7. **Catalogue Price Verification (`PriceRefreshPanel.vue`)**:
   - Redesign as a clean card (`rounded-2xl bg-card p-5 space-y-3`) with icon badge (`ph:arrow-clockwise`), responsive refresh button, unchanged success callout, and clean delta list without harsh borders.
   - Retain `data-testid="quotes-price-refresh"`, `data-testid="quotes-refresh-button"`, `data-testid="quotes-refresh-unchanged"`, `data-testid="quotes-refresh-result"`, `data-testid="quotes-refresh-error"`.

8. **2-Column Workspace Assembly (`DetailPanel.vue`)**:
   - Assemble `DetailPanel.vue` with `grid w-full min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]`.
   - Left column: `QuotesBasicDetails` and `QuotesLinesTable` (`flex-1`).
   - Right column: `QuotesAmountSummary`, `QuotesCustomerInfo`, and `QuotesPriceRefreshPanel`.

9. **Verification & Quality Gates**:
   - Run Vitest suites for quotes (`quotes-detail-workspace.test.ts`, `quotes-detail-skeleton.test.ts`, `quotes-list-panel.test.ts`, `quotes-api.test.ts`, `orders-quotes-tab-routing.test.ts`).
   - Run `bun run typecheck`, `bun run lint`, `bun run format`, `bun run i18n:check`, and `bun run fallow`.
   - Write walkthrough artifact `walkthroughs/2026-10-02-quotes-detail-redesign.md`.

## UI states

- **Open Quote (`ouvert`)**: Displays open status badge with pulsing dot, basic metadata, lines table, amount breakdown with total callout, customer details, and price verification trigger.
- **Converted Quote (`commande`)**: Displays converted badge, order reference callout linking to `/orders?order=...`, lifecycle stepper completed.
- **Archived Quote (`archive`)**: Displays archived badge, archive button absent / disabled.
- **Loading State**: Displays `QuotesDetailSkeleton` with pulsing placeholders for header, basic details, lines table, and operational sidebar.
- **Customer Unavailable**: Displays `Empty` state card inside CustomerInfo when customer lookup fails.
- **Price Changes Found**: Displays deltas list showing old -> new prices and quantities without harsh borders.
- **Role Gating**: Preparation staff cannot view product links or trigger quote archiving.

## Tests and confirmed seams

- Public behavior seams: `QuotesDetailPanel`, `QuotesDetailHeader`, `QuotesDetailStepper`, `QuotesBasicDetails`, `QuotesLinesTable`, `QuotesLineRow`, `QuotesAmountSummary`, `QuotesCustomerInfo`, `QuotesPriceRefreshPanel`, `QuotesArchiveDialog`, `QuotesDetailSkeleton`.
- Existing test suite `test/nuxt/quotes-detail-workspace.test.ts` plus new test suite `test/nuxt/quotes-detail-skeleton.test.ts`.
