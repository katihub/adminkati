# Implementation Plan — Product History Timeline

## 1. What the mockup shows

The mockup presents a spacious vertical process timeline in one elevated, rounded white surface. A thin rail at the left joins circular status markers; each event places a strong title and muted supporting information on the left, with a compact semantic status pill aligned to the right. Events are separated by generous vertical rhythm and hairline dividers, and their detailed artefacts sit in an indented, branch-like sub-list beneath the event.

### Structure

- **M1** — A single rounded, light surface contains the entire timeline.
- **M2** — A continuous left-hand vertical rail joins all event markers.
- **M3** — Each event has a circular marker: completed events use a check; in-progress uses a dashed spinner.
- **M4** — Event rows are divided with a quiet horizontal rule and have generous vertical padding.
- **M5** — An optional indented branch groups supporting files beneath an event.

### Components, typography, and surface

- **M6** — Large, high-emphasis event title; muted explanatory text beneath it.
- **M7** — A right-aligned soft-gray pill combines a coloured dot and a short stage label.
- **M8** — The supporting-file branch uses subtle rule segments, small file icons, and compact labels.
- **M9** — The mockup surrounds the surface with a decorative blue/orange gradient field.

### States, interaction, and accessibility

- **M10** — Completed and in-progress marker variants are shown; no empty, error, focus, or narrow-screen state is shown.
- **M11** — No controls are shown; the timeline is read-only.
- **M12** — Only a desktop width is shown. Narrow-screen behaviour is therefore undefined.
- **M13** — Status is expressed by both icon/colour and readable text in the pill, not colour alone.

## 2. What the requirement asks for

- **R1 — Explicit:** Redesign the existing Product detail **History** tab as a timeline that follows the supplied visual direction.
- **R2 — Explicit:** Limit the redesign to product change history; do not redesign the stock-movement table.
- **R3 — Implied:** Preserve the existing backend history contract, newest-first order, change-field rendering, dates, and editor attribution.
- **R4 — Implied:** Preserve the existing history empty state and work at narrow widths.
- **R5 — Implied:** Keep the event rows understandable without relying on their marker colour or icon.

## 3. Mapping

| ID | Element / requirement | Requirement | Verdict | Note |
| --- | --- | --- | --- | --- |
| M1 | Rounded timeline surface | R1, R4 | MATCH | `ProductsHistoryPanel` already owns this surface. |
| M2 | Left event rail | R1 | MATCH | Replace the generic centered `vuzeno` rail with a product-specific start-aligned rail. |
| M3 | Status markers | R1, R5 | PARTIAL | Map product event type to icon and semantic colour; backend has no completed/in-progress state. |
| M4 | Separated spacious rows | R1 | MATCH | Render the existing history entry as a flat row rather than a card inside a card. |
| M5 / M8 | Indented supporting branch | R1, R3 | PARTIAL | Render existing field diffs as the nested branch; no files exist in the product-history contract. |
| M6 | Event title and supporting text | R1, R3 | PARTIAL | Use the translated history type as the title and the existing event timestamp as supporting information. |
| M7 | Coloured status pill | R1, R5 | PARTIAL | Use the translated event type; it must remain text-labelled. |
| M9 | Decorative gradient page background | — | MOCKUP-ONLY | It is presentation from another screen, not part of the product History tab. |
| M10 | Completed/in-progress workflow state | — | MOCKUP-ONLY | The product history API has no workflow-progress field. |
| M11 | Interactive timeline controls | — | MOCKUP-ONLY | The supplied scope is visual redesign only. |
| M12 | Responsive behaviour | R4 | REQUIREMENT-ONLY | Stack metadata below the heading and keep the status pill aligned without horizontal overflow. |
| — | Existing empty state | R4 | REQUIREMENT-ONLY | Retain the translated `No changes yet.` / French equivalent state. |

## 4. Cut from the mockup

| ID | Element | Reason for cut |
| --- | --- | --- |
| M9 | Blue/orange gradient backdrop | It belongs to the mockup presentation and conflicts with the surrounding product-workspace surface. |
| M10 | In-progress spinner and workflow completion semantics | Product audit entries only expose creation, modification, and removal types. |
| M8 | PDF/XLSX file labels and file-type icons | Product history exposes changed fields, not imported files. |
| M11 | Timeline actions | No required action or mutating endpoint exists. |

## 5. Gaps — required but not designed

- **Product-specific event statuses:** Proposal — reuse `creation`, `modification`, and `disparition` as text-labelled status pills and icon markers. Green/success applies to creation, primary/info to modification, and destructive to removal. This is display-only and adds no contract.
- **Narrow layout:** Proposal — the rail remains fixed at the left; event header metadata wraps below the title rather than overflowing. Diff values continue to wrap within their branch.
- **No-change entries:** Existing logic suppresses events whose field values all resolve to the same display value. Preserve this guard so empty visual timeline rows are never rendered.
- **Loading/error:** Product history arrives in the already-loaded `ProductDetail` payload, so the panel has no independent asynchronous request or distinct loading/error state. Its parent owns the detail-fetch state; this redesign must not introduce another request.

## 6. Build plan

### Phase 1 — Lock the history-row behaviour with a component test

- [ ] **Add a public-seam component test for a product audit event** — prove a rendered change event exposes its translated type, machine-readable timestamp, text-labelled status, and real field change content; retain the existing newest-first and empty-state coverage in `products-lifecycle.test.ts`.
  - Files: `test/nuxt/products-history-entry.test.ts`
  - Reuses: `mountSuspended`, existing history fixtures and `data-testid` contract
  - Serves: R3, R5
  - Done when: the new test fails against the old card implementation for the new status/rail public contract, then passes after Phase 2.

### Phase 2 — Build the product-specific timeline layout

- [ ] **Replace the generic timeline composition with a purpose-built ordered history list** — keep `ProductsHistoryPanel` as the rounded outer surface and the existing sort/empty-state logic, but let each history entry own its left rail and nested branch layout.
  - Files: `app/components/products/HistoryPanel.vue`, `app/components/products/HistoryEntry.vue`
  - Reuses: `ProductHistoryEntry`, `ProductsHistoryActorPill`, `formatDateCourte`, `useHistoryValueFormatter`, existing product-history translations and semantic Tailwind tokens
  - Serves: R1, R2, R3, R4, R5
  - Done when: entries render newest-first as flat timeline rows with a connected left rail, event heading/date, text-labelled type pill, indented diffs, and editor attribution; unchanged entries and the empty state retain their current behaviour.

### Phase 3 — Verify the responsive, localized implementation

- [ ] **Format and run the focused quality checks** — ensure the new timeline behaves without layout assumptions and locale keys remain valid without adding duplicate copy.
  - Files: changed files only
  - Reuses: project `oxfmt`, Vitest Nuxt project, i18n parity checker
  - Serves: R3, R4, R5
  - Done when: focused specs, typecheck, lint, format check, i18n check, and changed-file fallow audit report their observed results.

## 7. Data contracts

No endpoint, payload, schema, or dependency changes are needed.

`ProductHistoryEntry` already supplies every required value through `ProductDetail.historique`:

| Field | Existing use in redesigned timeline |
| --- | --- |
| `id` | Stable ordered-list key and test identifier |
| `type` | Marker icon/colour, event title, and text status pill |
| `detectee_le` | Defensive newest-first sort key |
| `decidee_le` | Human-readable and machine-readable event timestamp |
| `champs` | Nested field-diff branch |
| `decidee_par` | Existing editor attribution pill |
| `motif`, `statut`, `lot_id` | Remain outside scope; the current panel does not render them |

## 8. Test plan

- **Component:** Add one `ProductsHistoryEntry` seam test for the newly visible event summary (type/status/timestamp) alongside a changed field. It protects the information hierarchy and non-colour status representation without coupling to Tailwind classes or DOM nesting.
- **Existing component coverage:** Keep the current tests for display-value formatting/fallbacks, suppression of unchanged diffs, newest-first history order, and empty history. They cover the preserved business behaviour.
- **Not tested:** Exact utility classes, connector pixels, icon dimensions, or card structure. Those are visual implementation details rather than user-facing behavioural seams.

## 9. Risks

- **Semantic duplication:** A title and status pill both derived from `type` may feel repetitive. The visual review should catch this immediately; keep the pill compact and use it as a label, not a second heading.
- **Long field values:** A before/after pair may exceed the width shown in the mockup. The branch must use `min-w-0` and wrapping rather than force a horizontal scroll.
- **No separate history query:** Adding a loading/error treatment would be misleading because history arrives with the product detail. This surfaces as soon as the surrounding detail-loading architecture is inspected.

## 10. Needs a decision

No blocking decisions remain. The user confirmed the Product History tab as scope and the component seam covering order, type/date/diffs/editor attribution, and empty state.
