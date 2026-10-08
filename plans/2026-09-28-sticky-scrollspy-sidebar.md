# Implementation Plan — Sticky Scrollspy Sidebar

## 1. What the mockup shows

The drawer has a wide, white editor surface with a left navigation rail containing Identité, Contact, and Sur la carte. The selected item has an inset muted surface and strong foreground text; unselected entries use muted text. The rail is intended to remain visually fixed at its initial inset while the adjacent editor sections scroll.

- M1: Rounded white navigation rail with 74px horizontal inset and generous vertical padding.
- M2: Three vertically stacked section buttons: Identité, Contact, Sur la carte.
- M3: Active Identity button uses a pale muted fill, rounded corners, and semibold dark text.
- M4: Inactive buttons retain their position and use muted foreground text.

## 2. What the requirement asks for

- R1 — The navigation rail must remain sticky at the visual position it has when the drawer loads.
- R2 — The active navigation item must update reactively as its corresponding form section becomes adjacent to the rail.
- R3* — Existing click and query-parameter navigation must continue to focus the requested form section.

## 3. Mapping

| ID | Element | Requirement | Verdict | Note |
| :-- | :-- | :-- | :-- | :-- |
| M1 | Inset navigation rail | R1 | MATCH | Existing `PointsOfSaleSectionNav` is already present in the editor grid. |
| M2 | Section buttons | R2 | MATCH | Existing nav buttons already expose the active visual state. |
| M3 | Active button treatment | R2 | MATCH | Existing `active` prop controls this styling. |
| M4 | Static inactive entries | R1 | MATCH | Keep the current layout and tokens. |
| — | Click/query landing | R3* | REQUIREMENT-ONLY | Preserve the existing `focusSection()` contract. |

## 4. Cut from the mockup

No mockup-only elements are in scope. The task changes rail positioning and active-state behavior only.

## 5. Gaps — required but not designed

- The screenshot shows only the Identity active state. The implementation will reuse the same existing active treatment for Contact and Sur la carte.
- Loading, error, and empty states are not applicable: the scroll-spy observes static form sections after the form mounts and does not add an async surface.

## 6. Build plan

### Phase 1 — Lock the rail position
- [ ] **Match the sticky offset to the editor grid inset so the rail does not slide upward after loading.**
  - Files: `app/components/points-of-sale/DrawerEditor.vue`
  - Reuses: the existing `PointsOfSaleSectionNav`, editor grid `py-6`, and sticky layout.
  - Serves: R1
  - Done when: the nav remains 24px below the scroll viewport top while the form scrolls.

### Phase 2 — Synchronize the active item with scrolling
- [ ] **Observe each `[data-section]` within the editor’s existing `ScrollArea` viewport and update `activeSection` for the section aligned with the rail. Clean up the observer on unmount.**
  - Files: `app/components/points-of-sale/DrawerEditor.vue`
  - Reuses: `activeSection`, `PointVenteSection`, `PointsOfSaleFormSection` targets, and `ScrollArea`'s `data-slot="scroll-area-viewport"`.
  - Serves: R2, R3*
  - Done when: scrolling from identity through contact and map updates `aria-current` and the existing active styles without disrupting nav clicks or `?section=` focusing.

### Phase 3 — Cover the public interaction
- [ ] **Extend the mounted content-page spec to simulate section visibility and assert the active navigation button changes.**
  - Files: `test/nuxt/points-of-sale-page.test.ts`
  - Reuses: `mountAt()`, the existing drawer form, nav test IDs, and `fake-intersection-observer.ts`.
  - Serves: R2
  - Done when: the test fails before observer wiring and passes when the Contact or map section is adjacent to the rail.

## 7. Data contracts

No API, payload, schema, or shared type changes. Existing `PointVenteSection` values (`identity`, `contact`, `map`) remain the scroll-spy contract.

## 8. Test plan

The public seam is the mounted points-of-sale content page: simulate a visible form section through the existing fake `IntersectionObserver`, then assert the user-visible nav state through `aria-current`. This protects the manual-scroll behavior without coupling the test to observer implementation details or CSS layout internals.

## 9. Risks

- Reka UI owns the real scrolling element. The observer must use its existing viewport element as root, or page-level intersections could select the wrong section. This surfaces in the component test by checking that the observed section changes the nav state.
- An observer callback may receive multiple entries. The implementation must select the section aligned to the rail rather than depending on callback ordering. This surfaces by observing all three actual form sections.

## 10. Needs a decision

1. **Test seam confirmation** — Use the mounted content page and its visible `aria-current` navigation state as the public seam, with the existing fake `IntersectionObserver` simulating a manually scrolled adjacent section. Recommendation: approve, because it verifies the operator-visible requirement without testing layout internals.
