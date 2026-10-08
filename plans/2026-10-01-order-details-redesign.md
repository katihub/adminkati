# Redesign OrderDetails panel — Proposition 1 (Command Center)

## Requirement

Redesign the UI of the `OrderDetails` panel (`DetailPanel.vue` and its child components in `app/components/orders/`) according to **Proposition 1: Command Center**. Transform the currently vertically stacked, fragmented card layout into an integrated operations-first split workspace:
1. Integrated Header with operational lifecycle stepper, key metadata, and accessible action controls.
2. 2-column responsive split layout:
   - Primary left area (60-65%): Compact general order metadata strip and ordered items (`LinesTable`) with clear discrepancy highlights.
   - Right operational sidebar (35-40%): Prominent payment settlement card with high-contrast "Reste à payer" callout and immediate collection trigger, alongside customer identity, delivery landmark (`repere`), and courier assignment card.
3. Preserve 100% of existing role gates (`direction`, `comptoir`, `preparation`, `livreur`), perimetre money checks, API contracts, translation keys, and `data-testid` selectors.

## Reuse

- Container & Page: `app/pages/orders.vue` (right column).
- Panel Orchestrator: `app/components/orders/DetailPanel.vue`.
- Header: `app/components/orders/DetailHeader.vue`, `app/components/orders/HeaderActions.vue`, `app/components/orders/ActionBar.vue`.
- Core Data Components:
  - `app/components/orders/BasicDetails.vue`
  - `app/components/orders/LinesTable.vue`, `app/components/orders/LineRow.vue`, `app/components/orders/LineImage.vue`
  - `app/components/orders/PaymentStatus.vue`
  - `app/components/orders/CustomerInfo.vue`
- Dialogs:
  - `app/components/orders/PaymentDialog.vue`
  - `app/components/orders/TransitionDialog.vue`
  - `app/components/orders/LivreurDialog.vue`
  - `app/components/orders/ExportDialog.vue`
- Composables & Utilities:
  - `useCachedSession`
  - `useOrderMutations`
  - `isOrderInPerimetre`, `moneyPerimetre`, `comptoirLabel`
  - `formatDateCourte`, `formatMontant`
  - `ORDER_STATUS_TONE`, `PAYMENT_STATUS_TONE`, `ORDER_TRANSITION_ICON`, `ORDER_TRANSITION_SEVERITY`

## Data contract

- `CommandeDetail` interface from `app/types/api/commandes.ts`.
- Preserves all conditional role-based fields (e.g. `preparation` role receives orders without financial fields `totalEstimeTtc`, `resteAPayer`, `statutPaiement`, and without customer details `clientNom`, `clientTelephone`).

## Implementation phases

1. **Header & Stepper Enhancement (`DetailHeader.vue`)**:
   - Modernize the header layout with clean typography, delivery mode badge, status badge with live pulse indicator, and a visual order progress stepper showing the status pipeline (`soumise` -> `confirmee` -> `en_preparation` -> `en_remise` -> `close` / `livree`).
   - Retain slots and testids for action buttons (`orders-detail-export-trigger`, `orders-detail-actions`).
2. **Basic Details Refinement (`BasicDetails.vue`)**:
   - Streamline the basic details into a sleek, compact metadata section with clean borders and subtle muted surfaces instead of an isolated bulky card.
   - Retain all `data-testid` attributes (`orders-detail-basic-details`, `orders-detail-comptoir`).
3. **Lines & Items Presentation (`LinesTable.vue`, `LineRow.vue`)**:
   - Elevate the table styling with subtle row hovers, clearer item thumbnails, prominent quantity badges, and high-visibility discrepancy callouts (`motifEcart`).
   - Retain table headers, product linking for authorized roles, and all `data-testid` selectors.
4. **Financial Card & Settlement (`PaymentStatus.vue`)**:
   - Transform the payment block into an actionable financial summary card.
   - Emphasize the **Reste à payer** with a prominent callout block (`amber` when pending, `emerald` when settled).
   - Display clear subtotal, remaining, and total breakdown with tabular numerals.
   - Provide an embedded "Encaisser" button when `canCollect` is true.
5. **Customer & Delivery Landmark Card (`CustomerInfo.vue`)**:
   - Redesign customer contact with direct phone call icon button.
   - For home delivery (`domicile`), feature the address with a dedicated **Repère physique** (landmark) callout box (`bg-primary/5`), courier assignment status, and courier contact details.
   - Maintain empty state (`orders-detail-customer-empty`) when customer details are unavailable.
6. **2-Column Workspace Assembly (`DetailPanel.vue`)**:
   - Structure `DetailPanel.vue` with a responsive two-column grid (`grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start`).
   - Pass through necessary props and event handlers (payment modal trigger, courier modal trigger, transition trigger).
7. **Verification & Quality Gates**:
   - Run Vitest suites for orders (`orders-detail-workspace.test.ts`, `orders-livreur-visibility.test.ts`, `orders-action-bar.test.ts`, `orders-payment-dialog.test.ts`).
   - Run `bun run typecheck`, `bun run lint`, `bun run format`, `bun run i18n:check`, and `bun run fallow`.
   - Write walkthrough artifact `walkthroughs/2026-10-01-order-details-redesign.md`.

## UI states

- **Standard Delivery (Domicile) with pending balance**: Displays delivery address, landmark box, courier status, and amber remaining balance box with collection button.
- **Counter Pickup (Retrait)**: Displays counter name (`Akwa`, etc.), no delivery section, pickup-specific status.
- **Preparation role view**: Hides payment status card and customer info card; shows customer unavailable empty state; lines table omits prices.
- **Closed / Fully Paid order**: Shows emerald settled badge, 0 FCFA balance, export button active, transition actions hidden.
- **Stock discrepancy on item**: Highlights item row with destructive `motifEcart` message.
- **Out of perimetre notice**: Displays notice text when user's counter perimetre does not include the order's counter.

## Tests and confirmed seams

- Public behavior seams: `OrdersDetailPanel`, `DetailHeader`, `BasicDetails`, `LinesTable`, `LineRow`, `PaymentStatus`, `CustomerInfo`, `HeaderActions`.
- Existing test suites in `test/nuxt/orders-detail-workspace.test.ts` and `test/nuxt/orders-livreur-visibility.test.ts` test all public seams, testids, role behaviors, and conditional displays.
