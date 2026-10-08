# Point-of-Sale Wizard Walkthrough

## What I built

Replaced the point-of-sale create/edit form with a three-step Identity, Contact information, and Review workflow. The same reactive draft, API payloads, active switch, deep links, and leave guard are retained; the final save happens only from Review.

The visual hierarchy now relies on the progress indicator as the only visible step title. Field labels are muted, static help appears in icon-only tooltips beside its label, and dynamic saved-value feedback remains visible below its control.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Split full validation into identity and contact step schemas | Done | `app/schemas/point-vente.ts` |
| Add localized wizard copy and remove replaced rail copy | Done | `i18n/locales/points-of-sale/en.json`, `i18n/locales/points-of-sale/fr.json` |
| Add accessible, non-skippable three-step progress | Done | `app/components/points-of-sale/WizardProgress.vue` |
| Extract identity, review, and wizard action components | Done | `app/components/points-of-sale/IdentityFields.vue`, `app/components/points-of-sale/ReviewStep.vue`, `app/components/points-of-sale/WizardActions.vue` |
| Orchestrate one reactive create/edit draft across steps | Done | `app/components/points-of-sale/Form.vue` |
| Simplify drawer and retain deep links, status, active switch, errors, and leave guard | Done | `app/components/points-of-sale/DrawerEditor.vue`, `app/components/points-of-sale/EditorHeader.vue` |
| Remove replaced rail/readiness components and helper code | Done | Removed `SectionNav.vue`, `ReadinessChecklist.vue`, `FormSection.vue`, `ErrorSummary.vue`; `app/utils/point-of-sale.ts` |
| Cover wizard transitions, submission, deep links, and leave guard | Done | `test/nuxt/points-of-sale-page.test.ts`, `test/nuxt/points-of-sale-form.test.ts` |
| Cover independently meaningful step schema boundaries | Done | `test/unit/point-of-sale.test.ts` |
 | Reduce duplicate headings and move static field help into tooltips | Done | `app/components/points-of-sale/Field.vue`, `app/components/points-of-sale/Form.vue`, `app/components/points-of-sale/ContactFields.vue`, `app/components/points-of-sale/MapFields.vue`, `app/components/points-of-sale/ReviewStep.vue` |
 | Split high-complexity wizard decisions into focused helpers without changing behavior | Done | `app/utils/point-of-sale.ts`, `app/schemas/point-vente.ts`, `app/components/points-of-sale/` |

## Deviations

- Direct `PointsOfSaleForm` tests were retained and migrated through the wizard steps instead of being removed. They still cover phone normalization, ordering, validation, and payload behavior that is meaningful after the layout change.
- Duplicate step headings are screen-reader-only rather than removed from the document. They remain valid focus targets and preserve announced context after a step transition.
- Review-card headings were removed visually and semantically replaced with labelled sections and target-specific Edit button names.

## Tests

- `rtk bunx vitest run "test/nuxt/points-of-sale-form.test.ts" "test/nuxt/points-of-sale-page.test.ts" "test/unit/point-of-sale.test.ts"` — 3 files, 63 tests passed.
- `rtk bun run i18n:check` — passed.
- `rtk bun run lint` — passed.
- `rtk git diff --check` — passed.
- `rtk bunx vitest run --passWithNoTests` — 149 files and 959 tests passed; six unrelated IPX image-rendering assertions failed in banner/product specs.
- `rtk bun run typecheck` — blocked by the existing `test/nuxt/inline-tag-selector.test.ts:43` `Element.click` type error; no point-of-sale type errors remain.
- `rtk bunx fallow audit` — passed with no audit findings.
- `rtk bun run build` — client and server bundles built, then `@nuxt/fonts` failed downloading a Google font because the network request timed out.

## Not done

- Manual responsive browser testing was not performed because the dashboard route requires an authenticated session unavailable to this task.
- Existing IPX rendering failures, the inline-tag-selector type error, and external font download failure remain outside this feature's scope.

## Notes for the reviewer

- Verify the tooltip density on a narrow drawer with a signed-in session. Help is intentionally attached to its owning label, while normalization feedback and link previews stay visible.
- `Form.vue` remains the orchestration boundary for the wizard. Its length is driven by three conditional views and focused navigation; no additional responsibilities were added.
