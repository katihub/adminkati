# Walkthrough — points-of-sale-redesign

Plan: [`plans/2026-09-26-points-of-sale-redesign.md`](../plans/2026-09-26-points-of-sale-redesign.md)

## What I built

The Content › Points of sale tab is now a table with a filter bar above it. Each published detail
has its own column, and a missing one shows a "+ Add" cell. An explicit "Arrange order" mode saves
the whole order in one call. Each row has a storefront switch and a ⋯ menu.

Clicking a row opens a wide drawer that holds proposition A's form: section nav with error counts,
an error summary, a readiness checklist, and a guard against losing unsaved changes. Comptoir gets
the same drawer read-only.

Dialogs and toasts follow proposition B: a centered-icon delete dialog that switches to "Deactivate
instead" on a 409, and dark pill toasts at the bottom centre with Undo, Retry and Open.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| 1 · Pure helpers | Done, reshaped (see Deviations) | `app/utils/point-of-sale.ts` (`filterPoints`, `readinessChecklist`, `errorsBySection`, `sectionOfPath`, `POINT_VENTE_SECTIONS`, `customerDetailsText`) |
| 2 · Table page (read path) | Done, reshaped (see Deviations) | `points-of-sale/Workspace.vue`, `Toolbar.vue`, `Table.vue`, `TableRow.vue`, `DetailCell.vue`, `MissingCell.vue` |
| 3 · Arrange order mode | Done | `composables/useArrangeOrder.ts`, `points-of-sale/ArrangeBar.vue`, `MoveButtons.vue` |
| 4 · Row actions, dialogs, toasts | Done | `points-of-sale/RowMenu.vue`, `DeleteDialog.vue`, `composables/usePointOfSaleActive.ts`, `composables/usePointOfSaleDelete.ts`, `utils/point-of-sale-toast.ts` |
| 5 · Drawer with A's form | Done | `points-of-sale/Drawer.vue`, `DrawerEditor.vue`, `EditorHeader.vue`, `ErrorSummary.vue`, `SectionNav.vue`, `ReadinessChecklist.vue`, `LeaveDialog.vue`, `FormSection.vue`, `Form.vue` |
| Old components removed | Done | `List.vue`, `ListItem.vue`, `Panel.vue`, `ActionRail.vue`, `FormActions.vue` deleted |
| 6 · i18n + gates | Done, except the unrelated failures listed under Tests | `i18n/locales/points-of-sale/{en,fr}.json` — new keys added, 11 keys that nothing references any more pruned |

## Deviations

1. **The page header and table now follow the taxonomy tabs** (the user's instruction arrived
   mid-phase 4). This replaced three things from proposition C and the plan:
   - **Summary cards: removed.** Taxonomy has none.
   - **Toolbar: now a filter bar.** It is built on `FilterControls` with three chips that are
     always present: search (`q`), Storefront (active / deactivated) and Details (complete /
     missing). It sits in the same sticky `top-16` bar as the taxonomy tabs. The "Missing details"
     card became the Details chip.
   - **Table states: taxonomy's.** Loading, error, empty and no-results reuse
     `taxonomy/TaxonomyFlatTableState.vue`, as `DepartmentTable.vue` does. That replaces B's dashed
     "Add your first counter" row and the custom no-match block.

   Rows are clickable (`cursor-pointer`, like `DepartmentTable`), with an icon-tile first cell.
   The order column is a secondary badge, and the Landmark column was dropped. `summarizePoints`
   was removed with the cards. `filterPoints` now takes `{ query, status, details }`.
2. **Toast helper is a util, not a composable.** It holds no state, so it went in
   `app/utils/point-of-sale-toast.ts` (`pointOfSaleToast`, `pointOfSaleErrorToast`). It sets
   `position` and inline `style` per toast, so the global Toaster is untouched.
3. **After a create or save, the drawer closes.** It used to reopen on the counter. After saving,
   the loaded snapshot would be stale and the form would read as dirty, so closing is the safe
   outcome. The created toast has an "Open" action.
4. **Added `customerDetailsText`** (unit-tested) for the menu's "Copy details for a customer"
   item.
5. **Search reuses `includesIgnoringAccents`** from `utils/search-text.ts` instead of a new fold.
6. **Added `app/utils/filter-fields.ts`** (`searchFilterField`, `selectFilterField`). Without it,
   fallow reported a clone group of the toolbar with `CategoryToolbar.vue` and
   `BannerFilterBar.vue`. Only the points-of-sale toolbar uses it; the other two are unchanged.
7. **The drawer is split into three components** (`Drawer` → `DrawerEditor` → `EditorHeader`),
   and **TableRow is split** into `DetailCell` and `MoveButtons`. Fallow flagged each template as
   too complex; after the split, fallow reports nothing on these files.
8. **Follow-ups after the first report:**
   - **Intro removed.** The paragraph above the toolbar ("The counters the storefront lists…",
     plus its read-only variant) is gone at the user's request, with both locale keys. The two
     specs that used it were changed: `content-page.test.ts` now checks for the toolbar as the
     marker that the tab rendered, and the comptoir spec no longer asserts the intro text.
   - **The drawer lays out against its own width.** Its layout used viewport breakpoints (`lg:`),
     so a narrow drawer in a wide window still got three columns, and the form spilled under the
     readiness checklist. The layout now uses container queries on `SheetContent` (`@container`):
     one column below `@3xl`, form + checklist from `@3xl`, and section nav + form + checklist
     from `@5xl`. The header stacks its actions under the title below `@3xl`.
9. **Drawer brought back in line with the D-Edit design** (the user flagged that the drawer looked
   nothing like it). This time it was checked in real Chrome: a temporary public
   `pages/pos-preview.vue` was screenshotted with Playwright at 1440px and 800px, then deleted.
   - **The width was the root cause.** The drawer rendered at 384px: the sheet's own
     `data-[side=right]:sm:max-w-sm` beat `sm:max-w-[1100px]`. It now uses the taxonomy panels'
     `data-[side=right]:` override, so it opens at 1100px.
   - **Header:** a bigger title; an amber dot with "Not saved yet · will join the storefront at
     position N" (`nextPosition` comes from `Workspace`); a divider before Cancel; the sheet's ✕
     hidden in form mode.
   - **Layout:** the section nav and the readiness checklist stay sticky, and the nav highlights
     the active section.
   - **Form look:** white, rectangular inputs, scoped to this form through `[data-slot=input]` /
     `[data-slot=textarea]` variants, so `ui/` is not edited. Section headings are bold. The key
     label carries a "Follows the name" badge while it tracks the name.
   - **Field hints:** "Will be saved as…" and the WhatsApp test link sit on one line.
   - **Add a number** now shows its count ("(n of 6)").
   - **Error summary:** each link reads "Label — short reason" (new
     `drawer.shortErrors.*` keys), and the spec asserts it.
10. **The TDD seams were not confirmed with the user before the tests were written.** The plan
   listed them and the user asked to start at once.

## Tests

Watched pass:

- `bunx vitest run test/unit/point-of-sale.test.ts test/nuxt/points-of-sale-page.test.ts
  test/nuxt/points-of-sale-form.test.ts` → **61 passed (61)**.
- `bunx eslint app test i18n` → no issues.
- `bun run i18n:check` → clean.

Whole suite, `bunx vitest run`: **958 passed, 6 failed**. All six are IPX image-URL assertions
(`banner-artwork-preview`, `banner-card`, `banner-panel-artwork`, `products-image-rendering` ×2,
`products-local-preview`):

```
AssertionError: expected 'https://api.test/supabase/storage/v1/…' to contain '/_ipx/'
```

None of these import anything this work changed. I did **not** run them against a clean tree,
so "pre-existing" is not verified. One earlier full run also failed
`operations-page.test.ts > opens Cash Registers as the default workspace`; it passed when run on its
own (3/3), so it looks flaky.

`bun run typecheck` has one error, in `test/nuxt/inline-tag-selector.test.ts:43`: `Property 'click'
does not exist on type 'Element'`. That file is untouched by this work.

`bun run fallow` still fails, but on none of this work's files. It reports 8 complexity findings,
all in banner code (the uncommitted banner work in this worktree) and in `stats/KpiCard.vue`. It
also reports css-token-drift advisories, including `max-w-[1100px]` and the drawer's grid-cols.

**What the specs cover:**

- the table's columns and "+ Add" cells;
- "+ Add" → `?point&section`, landing with focus on the section;
- search, no-results, and clear;
- the empty-state add, and the error card with retry;
- arrange mode: one whole-order request, focus kept on the moved row, focus going to the opposite
  arrow at the ends, Cancel, and rollback on refusal;
- arranging hidden while filtered;
- the row switch PATCH, and "Put back" from the menu;
- delete, and a 409 → deactivate instead;
- comptoir read-only (no write affordances, a view drawer);
- create from the drawer;
- the error summary and per-section counts;
- edit: change count and the minimal PATCH;
- the leave guard (Keep editing / Discard);
- a not-found link.

**Deliberately not covered:**

- **Toast content and the Undo/Retry/Open actions.** The Toaster is not mounted in page tests.
- **The Status and Details chips at page level.** reka's select chips were not driven; the
  filtering itself is unit-tested.
- **The readiness checklist rendering.** Its logic is unit-tested.
- **Copying to the clipboard.**

## Not done

- **The "+ Add" cell focuses the section, not the exact field.** It lands on the section (for
  example Contact), not the specific input (for example the hours).
- **Copy actions report success unconditionally.** They show "Copied" even if the clipboard
  write is refused.

## Notes for the reviewer

- **The drawer's form header lives inside `SheetContent`** (`EditorHeader`). Escape and a click
  on the overlay go through `DrawerEditor.requestClose()` via a template ref in `Drawer.vue`.
  Check that no path reaches `emit("close")` while the form is dirty.
- **Row clicks and inner controls.** `TableRow` uses `@click.stop` on every cell holding
  controls, so the switch, the menu and "+ Add" do not also open the drawer. The name is a
  `<button>` without its own handler, so keyboard users reach the row through it. Check for a
  double open.
- **Menu tests open the menu with Enter.** A synthetic `pointerdown` did not open reka's dropdown
  under happy-dom.
- **Pre-existing edits in this worktree.** `i18n/locales/content/*.json` and all banner files were
  already modified in this worktree before this work, and are not part of it.
