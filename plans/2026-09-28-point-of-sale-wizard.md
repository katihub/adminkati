# Implementation Plan — Point-of-Sale Wizard

## Goal

Replace the long, scrollable create/edit form with a three-step workflow:

1. **Identity** — counter name, city, district, key, and landmark.
2. **Contact information** — phone numbers, opening hours, Google Maps link, and GPS coordinates.
3. **Review** — a read-only summary of all entered values with direct links back to the relevant step.

The same workflow applies to both creation and editing. Saving remains a single create or patch request after the Review step.

## Reuse

- Keep `PointsOfSaleContactFields.vue` and `PointsOfSaleMapFields.vue` as the field-level implementations for Contact information.
- Keep `pointVenteSchema`, `buildCreerPointVente()`, `buildModifierPointVente()`, the existing mutations, the active storefront switch, and the leave-with-unsaved-changes guard.
- Keep the current `?section=identity|contact|map` route contract. Identity opens step 1; Contact and Map open step 2.
- Preserve existing input test IDs so the focused points-of-sale suite can evolve rather than duplicate setup.

## Data Contracts

No API, payload, schema-field, or shared-type contract changes are needed.

- `POST /api/v1/vitrine/administration/points-vente` continues to receive `CreerPointVenteInput` once Review is confirmed.
- `PATCH /api/v1/vitrine/administration/points-vente/:id` continues to receive the changed subset from `buildModifierPointVente()`.
- `PointVenteFormInput` remains the single reactive draft across all three steps, so leaving a step never loses its fields.

## States

- **Initial:** Step 1 is active for normal create and edit entry; a valid `section` query deep link selects its mapped step.
- **Validation:** Next validates only the active step, shows errors beside its fields, keeps the operator on that step, and focuses the first invalid control. Review performs a final full-form validation before saving.
- **Review:** Required identity values and optional contact/map values are shown as entered, with a localized not-provided treatment for absent optional fields. Edit actions return to the relevant step without resetting the draft.
- **Saving:** The final action is pending and disabled while the existing create/update mutation runs; server failure retains the Review step and draft, using the current submit-error treatment.
- **Leave:** Cancel, Escape, and overlay close keep the existing dirty-state confirmation for every wizard step.
- **Responsive:** Use a compact accessible progress indicator on narrow drawers and a three-item labelled progress rail at wider container widths. Each step remains a single-column form on narrow screens.

## Build Plan

### Phase 1 — Define wizard validation and labels

- [ ] **Split the existing form validation into reusable Identity and Contact information step schemas while preserving the current full submit schema and its transformations.**
  - Files: `app/schemas/point-vente.ts`
  - Reuses: existing required text, phone, map-link, coordinate, and coordinate-pair rules.
  - Done when: Identity can validate its five fields without rejecting untouched Contact information fields; Contact information validates its optional values and rejects invalid phones, maps, or incomplete coordinate pairs; full save validation is behaviorally unchanged.

- [ ] **Add English and French wizard copy for step labels, progress announcements, Back, Continue, Review details, edit-step actions, and missing optional values. Retire only locale keys made unused by the removed section rail/readiness UI.**
  - Files: `i18n/locales/points-of-sale/en.json`, `i18n/locales/points-of-sale/fr.json`
  - Reuses: `pointsOfSale` locale domain and current create/save/cancel strings.
  - Done when: `bun run i18n:check` reports key parity and no raw wizard UI text remains.

### Phase 2 — Build the wizard primitives

- [ ] **Create a presentational progress control for the three named steps, including current/completed semantics and an accessible “step X of 3” announcement.**
  - Files: `app/components/points-of-sale/WizardProgress.vue`
  - Reuses: existing button focus styles and the new locale copy.
  - Done when: it visually distinguishes Identity, Contact information, and Review, communicates the current step to assistive technology, and never lets the operator skip required validation by clicking ahead.

- [ ] **Extract the identity fields and a read-only review summary into focused components. Include Edit actions that identify their destination step.**
  - Files: `app/components/points-of-sale/IdentityFields.vue`, `app/components/points-of-sale/ReviewStep.vue`
  - Reuses: `PointsOfSaleField`, existing form labels and hints, normalized phone/map previews where safe, and `PointVenteFormInput`.
  - Done when: Identity renders the current name/address/key controls; Review renders every identity and contact/map value without editable controls and emits `edit:identity` or `edit:contact-info`.

- [ ] **Create one step-action component with Back and contextual primary actions.**
  - Files: `app/components/points-of-sale/WizardActions.vue`
  - Reuses: `Button`, mutation pending state, and current create/save labels.
  - Done when: Identity offers Continue, Contact information offers Back and Review details, and Review offers Back plus Create point of sale or Save changes; only the final action submits.

### Phase 3 — Orchestrate the create/edit wizard

- [ ] **Refactor `PointsOfSaleForm` to own one reactive draft across conditional step views, step-scoped validation, focus management, and the existing mutation path.**
  - Files: `app/components/points-of-sale/Form.vue`
  - Reuses: `PointsOfSaleContactFields`, `PointsOfSaleMapFields`, current dirty/change calculations, error mapping, and create/update mutations.
  - Done when: moving forward validates only the visible step; moving backward or using Review’s Edit actions preserves values; final submission passes the full schema and sends exactly the current create/patch payload; exposed dirty, saving, active, error, and focus interfaces continue to support the drawer.

- [ ] **Simplify the drawer editor around the wizard and remove the old scroll-spy rail/readiness layout. Map existing section deep links to the appropriate wizard step and retain the active switch, header status, submit error, and leave guard.**
  - Files: `app/components/points-of-sale/DrawerEditor.vue`, `app/components/points-of-sale/EditorHeader.vue`, `app/components/points-of-sale/SectionNav.vue`, `app/components/points-of-sale/ReadinessChecklist.vue`, `app/components/points-of-sale/FormSection.vue`
  - Reuses: `PointsOfSaleDrawer`, `PointsOfSaleLeaveDialog`, `PointsOfSaleErrorSummary` where it can focus a mounted field, and `sectionOfPath()`.
  - Done when: the drawer no longer renders the old three-section sticky layout; `?section=identity` opens Identity and `?section=contact|map` opens Contact information with the named target focused; the header no longer offers a premature save; closing behavior is unchanged.

- [ ] **Remove only now-unreferenced rail/readiness/form-section components and scroll-spy code after confirming no other consumer exists.**
  - Files: `app/components/points-of-sale/SectionNav.vue`, `app/components/points-of-sale/ReadinessChecklist.vue`, `app/components/points-of-sale/FormSection.vue`, `app/components/points-of-sale/DrawerEditor.vue`
  - Reuses: `POINT_VENTE_SECTIONS` and `sectionOfPath()` in `Workspace.vue`; do not remove these route-level concepts.
  - Done when: static analysis reports no dead wizard-replaced component, and no generated `app/components/ui/` code is edited.

### Phase 4 — Verify the operator flow

- [ ] **Replace current long-form expectations with behavior-focused wizard component coverage.**
  - Files: `test/nuxt/points-of-sale-page.test.ts`
  - Done when: tests prove invalid Identity cannot advance; valid Identity advances; invalid supplied Contact information cannot reach Review; Review shows entered data and returns to either editable step; final create/update sends the existing payload shape; direct `section=map` opens Contact information; the leave guard retains the draft across steps.

- [ ] **Retain and extend pure schema coverage only for new step-validation behavior.**
  - Files: `test/unit/point-of-sale.test.ts` or a new flat `test/unit/point-vente.test.ts`
  - Done when: the tests exercise the independently meaningful boundary that each step accepts untouched fields from later steps but rejects invalid values it owns. Do not duplicate Zod library behavior or snapshot markup.

- [ ] **Run project gates and manually exercise the responsive drawer.**
  - Files: no source changes expected
  - Done when: `bunx vitest run test/nuxt/points-of-sale-page.test.ts`, relevant unit specs, `bun run lint`, `bun run i18n:check`, `bun run typecheck`, and `bun run fallow` are recorded; the wizard is checked at narrow and wide drawer widths.

## Risks

- **Step validation can accidentally transform or clear values before Review.** Keep all validation non-mutating until the existing full-schema save path; detect this with a test that fills one step, moves between steps, and compares the submitted payload.
- **Current error-summary links assume all fields are mounted.** Make navigation choose the owning step before focusing a field, or show field-level errors only while advancing; detect this when a deep link or final validation finds an error on a hidden step.
- **A deep link to Map currently focuses a distinct section.** Map it to Contact information and focus the map controls, rather than silently dropping the query behavior; cover `?section=map` in the page spec.
- **The old section rail and readiness card are currently live but have no other consumers.** Confirm usage before deletion so no component auto-import consumer is missed.

## Decisions Applied

- Both creation and edit begin at Identity by default. This makes the workflow predictable; existing `?section=` links remain the explicit exception.
- Contact and map details are one Contact information step, not two substeps.
- Review is read-only. It links back to edit a group rather than allowing inline changes, keeping final save semantics explicit.
- The prior test waiver applied to the small scroll-spy adjustment. This workflow changes validation and persistence UX, so its public step transitions and save behavior require tests before implementation.

## Open Questions

None blocking. The plan assumes the active storefront switch remains in the header throughout the workflow and becomes part of the final create/patch payload as it does today.
