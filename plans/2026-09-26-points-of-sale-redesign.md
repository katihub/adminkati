# Points of sale redesign — table, drawer form, board-style states

**Slug:** `points-of-sale-redesign` · **Date:** 2026-09-26

## Requirement

Redesign the Content › Points of sale tab (`app/components/points-of-sale/`) from the design canvas
<https://claude.ai/artifact/Y3iy9TWvTrKcJpnY1yR9AN>, row "Chosen" (`D-Main`, `D-Edit`, `D-States`).
The user picked:

- **Proposition C's table** as the page: one row per counter, one column per published field, a
  "+ Add" cell where a field is missing, a storefront switch and a ⋯ menu per row, summary cards on
  top.
- **Proposition A's create/edit UI**: section nav with per-section error counts, an error summary
  with jump links, a live "Storefront readiness" checklist, and a key that follows the label and
  then locks. It is hosted in a wide right-hand drawer, since the table takes the full width.
- **Proposition B's states, dialogs and toasts**: centered icon dialogs, dark pill toasts at the
  bottom centre, an explicit "Arrange order" mode (replacing the always-visible move arrows), a
  dashed "Add your first counter" empty state, and a "No match" state with Clear filters.

No backend change. Every write already exists: `GET/POST/PATCH/DELETE
/vitrine/administration/points-vente[/:id]` and `POST …/reordonner`.

## Reuse

| Need | Existing piece |
| :-- | :-- |
| Data + writes | `app/composables/usePointsVente.ts` (`usePointsVente`, `usePointVenteMutations` — reorder is already optimistic with rollback) |
| Validation, payloads | `app/schemas/point-vente.ts`, `app/utils/point-of-sale.ts` (`missingContactFields`, `moveId`, `sortByIds`, `cleFromLibelle`, `buildCreerPointVente`, `buildModifierPointVente`, `mapLink`) |
| Form fields | `points-of-sale/Form.vue`, `Field.vue`, `ContactFields.vue`, `MapFields.vue` — kept; `Form.vue` gains section ids and exposes its error paths |
| Read-only details | `points-of-sale/Details.vue` — kept for the comptoir drawer |
| UI kit | `ui/table`, `ui/sheet`, `ui/alert-dialog`, `ui/dropdown-menu`, `ui/switch`, `ui/skeleton`, `ui/input`, `ui/button`, `ui/badge` |
| Error state | `ApiErrorCard.vue` (AGENTS.md: a wide surface with a real error uses it, so B's error look is not rebuilt) |
| Role gate | `useCachedSession()` → `roles.includes("direction")`, as in today's `Workspace.vue` |
| Copy helpers | `utils/whatsapp.ts` (`whatsappLink`, `cameroonPhone`) |
| Toasts | `vue-sonner` `toast` (per-toast `position` and `class` are supported by the installed 2.x — no global Toaster change) |

Nearest precedents: `taxonomy/BrandTable.vue` (table shape) and `content/Banner*` (panel + action split).

## Behaviour contract

- **URL state** is unchanged: `?tab=points-de-vente&point=<id>` opens the drawer for that counter,
  `&new=1` opens it in creation (Direction only), and `&section=identity|contact|map` scrolls the
  form to a section (new, used by the "+ Add" cells).
- **Direction**, clicking a row or its name, opens the drawer **in edit mode**. **Comptoir** gets the
  same drawer read-only, showing `Details.vue`, with no footer actions.
- **Table columns:** Order · Counter (label, district, city) · Landmark · Numbers (first + "+N") ·
  WhatsApp · Hours · Maps · GPS · Storefront (switch) · ⋯. A missing WhatsApp, hours, Maps link or
  GPS pin renders a "+ Add" button (Direction) or "—" (Comptoir). The "+ Add" button opens the
  drawer at the matching section.
- **Summary cards:** Counters, On the storefront, Missing details (a toggle that filters to
  incomplete rows), Cities covered.
- **Toolbar:** a search over label, city, district and key (case- and accent-insensitive), Arrange
  order (Direction; hidden while a filter or search is active, because a partial list cannot be
  reordered), and New point of sale (Direction).
- **Arrange order mode:** a dark bar with "Arranging — N changes", Cancel and Save order. Rows gain
  ↑/↓ buttons, and the table's other actions are inert. Save sends **one** `reordonner` call with
  every id. Keyboard focus stays on the moved row's arrow (today's focus rules carried over). Cancel
  restores the server order.
- **Row menu:** Edit · Hide from the storefront / Put back on the storefront · Copy key · Copy
  details for a customer · Delete…
- **Storefront switch:** PATCH `{ active }`. When it hides a counter, a toast offers Undo.
- **Delete dialog (B):** confirm, then "Delete". A 409 keeps the dialog open with the backend
  message verbatim and swaps the button to "Deactivate instead" (current behaviour, new look).
- **Drawer (A):**
  - **Header:** the title ("New point of sale" / the counter's label), then the dirty state ("Not
    saved yet" / "N unsaved changes"), the "Publish on the storefront" switch, Cancel, and Create /
    Save N changes.
  - **Body:**
    - after a failed submit, an error summary whose links focus each invalid field;
    - the section nav (Identity, Contact, On the map), each with its error count;
    - the form;
    - the readiness checklist (5 items from the live form values).
  - Closing while dirty (Esc, ✕, Cancel, click on the backdrop) asks "Leave without saving?" with
    Discard / Keep editing.
- **Toasts (B):** dark pill, bottom-centre, via one helper, used for:
  - created, with an Open action;
  - saved;
  - hidden, with an Undo action;
  - order saved;
  - order not saved, with a Retry action;
  - deleted;
  - the API errors of the switch and row actions.

## States

| Surface | Loading | Empty | Error | Partial |
| :-- | :-- | :-- | :-- | :-- |
| Page | summary skeletons + 4 row skeletons | dashed "Add your first counter" row (Direction) / "No points of sale yet." (Comptoir) | `ApiErrorCard` with retry, summary hidden | — |
| Filtered table | — | "No counter matches “q”" + Clear filters | — | — |
| Drawer | — | — | submit error `role="alert"` in header area; field errors in form | `?point=<unknown id>` → "This point of sale could not be found." + Close |
| Row switch | switch disabled + aria-busy on that row | — | toast, switch back to server value | — |
| Arrange | Save disabled + spinner | — | toast + Retry, order restored (existing rollback) | — |
| Delete | confirm disabled + spinner | — | message in dialog; 409 → Deactivate instead | — |

## Tests (TDD, red → green per slice)

Seams — public interfaces only:

1. **`app/utils/point-of-sale.ts`** (unit, `test/unit/point-of-sale.test.ts`):
   - `summarizePoints(points)` returns the counts and cities;
   - `filterPoints(points, { query, incompleteOnly })`: accent-insensitive search, incomplete filter;
   - `readinessChecklist(values)`: 5 flags from form input strings;
   - `errorsBySection(paths)`: counts per section from issue paths such as `telephones.1`.
2. **Content page, points-of-sale tab** (component, `test/nuxt/points-of-sale-page.test.ts`,
   rewritten):
   - rows and "+ Add" cells;
   - "+ Add" opens the drawer at the section;
   - the incomplete filter and the no-match state with Clear;
   - arrange mode sends one whole order and Cancel restores it;
   - a refused order is restored;
   - the switch patches `active`;
   - the 409 delete → deactivate instead;
   - comptoir sees no write affordance and gets a read-only drawer;
   - creation opens the new counter;
   - the dirty-close prompt.
3. **`Form.vue`** (component, `test/nuxt/points-of-sale-form.test.ts`): existing cases kept, plus
   the error summary listing the invalid fields after submit, with the section counts.

Not tested: markup and classes, the toast styling, and shadcn primitives.

## Phases

Each phase ends green on `bunx vitest run test/unit/point-of-sale.test.ts test/nuxt/points-of-sale-*`
and `bun run lint`.

### 1 · Pure helpers
- **What:** add `summarizePoints`, `filterPoints`, `readinessChecklist`, `errorsBySection` and
  the `POINT_VENTE_SECTIONS` map (field → section).
- **Where:** `app/utils/point-of-sale.ts`, `test/unit/point-of-sale.test.ts`.
- **Done when:** the unit specs pass.

### 2 · Table page (read path)
- **What:**
  - new `Summary.vue`, `Toolbar.vue`, `Table.vue`, `TableRow.vue` and `States.vue` (loading, empty,
    no-match);
  - `Workspace.vue` rewired to them;
  - `List.vue` and `ListItem.vue` deleted.
- **Where:** `app/components/points-of-sale/`.
- **Done when:** page specs for rows, "+ Add", filter/no-match, empty, error and comptoir pass.

### 3 · Arrange order mode
- **What:** `ArrangeBar.vue`, and a draft order held in `Workspace.vue`. Row move buttons appear in
  arrange mode only. Save calls `reorder.mutate(ids)` once.
- **Done when:** the arrange specs (whole order sent once, Cancel restores, focus stays, rollback on
  refusal) pass.

### 4 · Row actions + dialogs + toasts
- **What:**
  - the storefront switch and row menu in `TableRow.vue`;
  - `DeleteDialog.vue` (B style, 409 flow);
  - the `useStorefrontToast` helper in `app/composables/`.
- **Done when:** switch, Undo, and delete/409 specs pass.

### 5 · Drawer with A's form
- **What:**
  - `Drawer.vue` (Sheet, `sm:max-w-[1100px]`), with header, error summary, section nav, readiness
    aside and the dirty-close confirm;
  - `Form.vue` gains section wrappers (`id` per section) and exposes `errorPaths`, `isDirty`,
    `changedCount` and `values`;
  - `ReadinessChecklist.vue`, `SectionNav.vue`, `ErrorSummary.vue`;
  - `Panel.vue`, `ActionRail.vue` and `FormActions.vue` deleted.
- **Done when:** the create, edit, dirty-close and comptoir-drawer specs and the form specs pass.

### 6 · i18n + gates
- **What:** every new string in `i18n/locales/points-of-sale/{en,fr}.json`, and removed keys pruned.
- **Done when:** `bun run i18n:check`, `bun run lint`, `bun run typecheck`, `bunx vitest run` and
  `bun run fallow` are clean.

## Risks

- **The drawer's width on small screens.** At `< sm` the Sheet goes full width, and the three-column
  body stacks: section nav hidden, readiness below the form.
- **The table on phones.** The columns collapse to Counter / Storefront / ⋯ below `md`, hiding the
  missing-field columns there. This is accepted for now; the "Missing details" card still filters.
- **Switching rows while a drawer is dirty** goes through the same "Leave without saving?" guard
  (a route change).
- **Test rewrite size.** The page spec is replaced almost entirely; its cases are kept as behaviours,
  not testids.

## Open questions (defaults taken)

1. **Error look.** B's error card vs the repo's `ApiErrorCard`: **use `ApiErrorCard`**, per
   AGENTS.md.
2. **Row click for Direction.** Straight to edit, or a view first: **straight to edit**, as the
   canvas shows (D-Edit note).
3. **Toast styling scope.** The dark pill applies to point-of-sale toasts only, through the helper;
   the global Toaster is untouched.
4. **TDD seams** are listed above. The user asked to begin implementation right away, so they are
   taken as confirmed. Object and they will be revisited.
