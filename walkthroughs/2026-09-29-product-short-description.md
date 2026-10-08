## What I built

A `description` field on product details — a real, optional, 500-character prose summary distinct
from the existing bullet-highlight list (`caracteristiques`, now labeled "Features") — with a live
`{count}/{max}` character counter next to its label. It reuses the backend's already-existing
`description` column end to end; no backend, schema, or migration change was needed.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| `ProductDetail.description: string \| null` + fixed stale citation | Done | `app/types/api/produits.ts:68-74` |
| `produitSchema.description` (trim, max 500, nullable, optional) | Done | `app/schemas/produit.ts:70-75` |
| `DetailForm.vue` state, derivation, payload, field-label wiring | Done | `app/components/products/DetailForm.vue` (FieldName union, `values`, `errorKeys`, `deriveScalarValues`, `buildRawPayload`, `FIELD_LABEL_KEYS`, template) |
| New component for the field | Done, renamed per user instruction | `app/components/products/OverviewShortDescription.vue` (user asked for "Overview Short Description" instead of the plan's "Overview Description") |
| Relabel the mislabeled `caracteristiques` UI | Done, renamed per user instruction | `app/components/products/OverviewDescriptions.vue` — title changed to "Features" instead of the plan's "Characteristics" |
| `OverviewDetails.vue` wiring | Done | `app/components/products/OverviewDetails.vue:22-23,39-43,64-65,105-112` |
| i18n keys (fr + en) | Done | `i18n/locales/products/{fr,en}.json` |
| Tests (schema + component) | Done | `test/unit/produit-schema.test.ts`, `test/nuxt/products-detail-form.test.ts` |
| Character counter (post-plan follow-up request) | Done | `app/components/products/OverviewShortDescription.vue`, `app/schemas/produit.ts:3-5` (`DESCRIPTION_MAX_LENGTH`) |
| Consistent section spacing (post-plan follow-up request) | Done | `app/components/products/OverviewDetails.vue`, `OverviewShortDescription.vue`, `OverviewDescriptions.vue` |
| Unified active-state color for departments/categories/secondary categories (post-plan follow-up request) | Done | `app/components/products/OverviewDepartments.vue`, `OverviewCategories.vue`, `app/components/InlineTagSelector.vue` |
| Manual QA in a running dev server | Not done | see Not done |

## Deviations

- **Component and title naming** (explicit user instruction, not a plan default): the new component
  is `OverviewShortDescription.vue` / `<ProductsOverviewShortDescription>`, not `OverviewDescription.vue`
  as the plan proposed. The plan's `OverviewDescription`/`OverviewDescriptions` prop names
  (`description`, `descriptionFieldId`) would have collided with the existing caracteristiques
  props of the same name, so the new prop pair on `OverviewDetails.vue` is `shortDescription` /
  `shortDescriptionInputId` instead — kept distinct on sight, matching the component's own name.
- **Features, not Characteristics**: the plan's renamed title was "Caractéristiques" (fr) /
  "Characteristics" (en). The user asked for "Features" instead, "since it lists the product's
  features." Applied to the English section title only (`overview.featuresTitle` = "Features");
  French stays "Caractéristiques", which is the closer natural translation and matches the
  existing (unrenamed) `detailForm.caracteristiques.label` field-error text, so the two don't
  disagree within a locale. For the same reason, the English per-item aria-labels were also aligned
  to "Feature {index}" / "Add a feature" (French: "Caractéristique {index}" / "Ajouter une
  caractéristique") — a copy-consistency call within scope of the rename, not asked for verbatim
  but the alternative (heading says "Features", item labels still say "Description N") would have
  been a worse result than what was asked for.
- **Form-state shape**: the plan modeled `values.description` on the `marque` pattern
  (`string | null`, defaulting to `null`). Implemented it on the `url_source` pattern instead
  (`string`, defaulting to `""`) — `description` is a plain text control like `url_source`, not a
  picker like `marque`, and `url_source`'s exact null-mapping at submit
  (`values.url_source.trim() ? values.url_source.trim() : null`) is what `description` now mirrors
  verbatim in `buildRawPayload()`.
- **Border removed on the description textarea** (explicit user instruction mid-implementation,
  after the UI was built): `OverviewShortDescription.vue`'s `Textarea` now carries `class="border-0"`,
  overriding the shadcn default via `cn()`'s tailwind-merge. Scoped to this one instance — the
  bullet-list inputs in `OverviewDescriptions.vue` are untouched and keep their own (different,
  pre-existing) border styling.
- **Ripple fix beyond the plan's four files**: making `ProductDetail.description` a required
  (non-optional, nullable) field broke typecheck in five other test files that build their own
  `ProductDetail` fixtures: `test/nuxt/orders-detail-workspace.test.ts`,
  `test/nuxt/products-image-rendering.test.ts`, `test/nuxt/products-lifecycle.test.ts`,
  `test/nuxt/products-workspace.test.ts`, `test/nuxt/quotes-detail-workspace.test.ts`. Each got a
  one-line `description: null` added next to its existing `caracteristiques: []`. No behavioral
  change to any of those files.
- **Character counter** (post-plan follow-up request, not in the original plan): user asked for a
  word or character count next to the textarea. Implemented as characters, not words — the field's
  only real constraint is the 500-*character* cap, and a word count would track nothing the schema
  actually enforces. Followed the exact precedent already in this codebase
  (`app/components/content/BannerForm.vue:359-374`, `BANNIERE_ALT_MAX_LENGTH`): a
  `{used}/{max}` counter (not "remaining"), `text-xs tabular-nums text-muted-foreground`, and the
  cap exported from the schema file as a single source of truth shared by the Zod `.max()` and the
  component. New export: `DESCRIPTION_MAX_LENGTH = 500` in `app/schemas/produit.ts`, replacing the
  literal `500`/`"500"` previously duplicated between the schema and the `Textarea`'s `maxlength`.
  The counter turns destructive-colored if the count ever exceeds the cap — not reachable through
  the browser's own `maxlength` enforcement, but reachable for a product whose `description` was
  set longer than 500 chars before this UI cap existed (the backend's own cap is 20,000 chars), so
  the guard is real, not speculative.
- **Section spacing** (post-plan follow-up request): user flagged the gap between categories,
  secondary categories, description, and features as inconsistent. Root cause:
  `OverviewDetails.vue`'s outer container used `space-y-8` (32px) between its direct children, but
  Departments/Categories/SecondaryCategories were nested inside their own `space-y-6` (24px)
  sub-wrapper, and both `OverviewShortDescription.vue` and `OverviewDescriptions.vue` additionally
  carried their own `border-t ... pt-8` — stacking a second 32px on top of the parent's already-32px
  margin, so the gap before Description and before Features was ~64px against ~24-32px everywhere
  else. Fixed by: (1) removing the inner `space-y-6` wrapper so Departments, Categories,
  SecondaryCategories are direct siblings under the same outer `space-y-8` as everything else; (2)
  removing the `border-t`/`pt-8` divider from both `OverviewShortDescription.vue` and
  `OverviewDescriptions.vue` entirely, rather than only shrinking the padding — a divider stopped
  earning its place once every section already reads as visually distinct through uniform, equal
  spacing, and keeping it meant either accepting a slightly larger gap around two sections only (a
  second inconsistency) or fighting margin/padding math to make a bordered gap pixel-equal to a
  plain one. The user's own message offered exactly this choice ("add top padding, or remove the
  border if it isn't necessary") after a first attempt at (2) still left the divider looking flush
  against the field below it. Net result: one `space-y-8` (32px) rhythm governs all five sections
  (Departments, Categories, Secondary Categories, Description, Features) with no exceptions.
- **Unified active-state color** (post-plan follow-up request, out of the original plan's scope —
  Departments/Categories/SecondaryCategories predate this feature and aren't part of it, but the
  user raised it while reviewing this same panel): each of the three chip pickers used a different
  active-state treatment — Departments: `bg-success/15 border-success text-success` (green);
  Categories: `border-primary bg-primary-foreground text-primary shadow-xs` (near-white fill +
  shadow); SecondaryCategories (via `InlineTagSelector.vue`): `bg-info/20 text-info shadow-xs`
  (blue, no border). All three already shared the identical *inactive* class
  (`border-border/80 bg-card text-foreground hover:border-foreground/50`), so only the active state
  had drifted three ways. Found an existing precedent for this exact toggle-chip shape already in
  the codebase — `app/components/team/HireForm.vue:107`, `border-primary bg-primary/10 text-primary`
  on the same inactive class — and applied it verbatim to all three instead of inventing a fourth
  variant. Net effect: one shared color (`primary`), no `shadow-xs` anywhere in this set (the likely
  source of the reported "blurry" look — a soft shadow on a small bordered/tinted chip), and
  `InlineTagSelector.vue`'s selected chip gained a `border` it didn't have before, to match the
  other two's shape.
- **Inactive-chip text color + label font weight** (post-plan follow-up request, same reasoning as
  above — out of the original plan, raised while reviewing this panel): user's message read "Phone
  callers for inactive options should also be reduced a bit" — read as a transcription error and
  interpreted as "the colors for inactive options should also be reduced a bit," given it directly
  follows the active-color unification above. Applied conservatively: only `text-foreground` →
  `text-muted-foreground` on the inactive branch of `OverviewDepartments.vue` and
  `OverviewCategories.vue`'s chip buttons; left `border-border/80`, `bg-card`, and the hover state
  untouched. Did not touch `InlineTagSelector.vue`'s overflow/add trigger buttons — those are
  controls, not "inactive options" in the toggle sense the request seems to describe. **Flagged as
  an interpretation, not a confirmed instruction** — easy to revert or redirect if wrong. Separately
  and unambiguously: every field/section label in this panel (`OverviewDepartments.vue:40`,
  `OverviewCategories.vue:43`, `InlineTagSelector.vue:81`, `OverviewShortDescription.vue:26`,
  `OverviewDescriptions.vue:33`) went from `font-semibold` to `font-medium` — the user asked for
  "medium or no weight" without a color change; picked `font-medium` over `font-normal` as the
  middle option, still legible as a label rather than reading as flat body text. Scoped to exactly
  the five section labels in this panel — did not touch `font-semibold` elsewhere in
  `app/components/products/` (e.g. `OverviewPricing.vue`'s price/currency/rating *values*,
  `AddImageDialog.vue`, `LocalInventoryPanel.vue`), since those are either data values rather than
  field labels, or unrelated dialogs outside the panel this conversation has been about.

## Tests

TDD followed throughout — each slice's test was added and confirmed failing before the matching
source change:

- `bunx vitest run test/unit/produit-schema.test.ts` — red on the new description test (asserted
  `undefined` where a 500-char string was expected, since the schema silently dropped the unknown
  key), then green after adding the schema field: **13 passed (13)**.
- `bunx vitest run test/nuxt/products-detail-form.test.ts` — red on 4 assertions (missing textarea,
  stale "Description N" aria-label, missing entry in the disabled-controls list, missing element in
  the new submit test), then green after the component + wiring + i18n rename: **24 passed (24)**.
- Character counter follow-up: 3 more assertions added (counter reads "0/500" empty, reads
  "`{length}`/500" pre-filled from an existing product, updates live while typing "Bonjour" → "7/500")
  — red (element not found) before, green after adding the counter: **25 passed (25)**.
- Spacing, active-color, inactive-color, and label-weight follow-ups: all pure CSS-class changes
  with no new DOM structure, so no new test assertions apply to them (the existing 25
  component-test assertions don't inspect classes); re-ran `test/nuxt/products-detail-form.test.ts`
  after each and stayed green (**25 passed**) — confirming no behavior regressed, not that the
  visual result is correct (see Not done).
- Final combined run, everything touched by this change:
  `bunx vitest run test/unit/produit-schema.test.ts test/nuxt/products-detail-form.test.ts test/nuxt/orders-detail-workspace.test.ts test/nuxt/products-image-rendering.test.ts test/nuxt/products-lifecycle.test.ts test/nuxt/products-workspace.test.ts test/nuxt/quotes-detail-workspace.test.ts`
  → **82 passed, 2 failed** — 6 files green, 1 file with 2 pre-existing failures (`products-image-rendering.test.ts`: "runs
  against a catalogue host that IPX does trust", "still sends banner artwork on the shared host
  through IPX") — unrelated to `description`, they assert against `catalogueImageOrigin`, which
  resolves to `""` in this Vitest environment (`nuxt.config.ts:98` default) even though `.env` sets
  `NUXT_PUBLIC_CATALOGUE_IMAGE_ORIGIN` — a test-environment gap. Confirmed via `git diff` that my
  only change to that file is the one-line `description: null` fixture addition; nothing else in it
  was touched.
- `bun run typecheck` — clean except the same 4 pre-existing errors in
  `test/unit/order-export-bff.test.ts` (Node `http.createServer` typing), confirmed via
  `git status`/`git log` to predate this session — I never edited that file.
- `bun run lint:fix` — no output, no violations.
- `bun run fallow` — `✓ No issues in 28 changed files`. Same one inherited finding (CSS token drift
  in `app/components/assistant/Thread.vue`, from an unrelated in-progress change already on this
  branch) excluded by the gate as pre-existing, not introduced here.

## Not done

- **Manual QA in a running dev server**, called for by the plan's Phase 3 "done when." I started a
  throwaway `nuxt dev` instance on port 3005 (to avoid the port-3000 dev server already running,
  possibly from another worktree/session) and opened `/products` with `agent-browser`, but the app
  requires real Supabase sign-in — `NUXT_LOCAL_AUTH_BYPASS=true` in `.env` is not read anywhere in
  the codebase (confirmed by grep across `app/` and `server/`; it's dead/legacy config), and I have
  no real credentials to sign in with. I did not attempt to work around this. The dev server and
  browser session were both shut down cleanly afterward. Visual confirmation of the rendered field,
  the border removal, and the "Features"/"Description" section order is therefore unverified beyond
  the component test's DOM assertions (element presence, pre-filled value, disabled state) — those
  don't see CSS. This applies doubly to the spacing/divider, active-color, inactive-color, and
  label-weight follow-ups: all are pure visual changes with no DOM-structure assertion that could
  catch a wrong gap, a wrong color, or a wrong weight, so they're unverified beyond reading the
  Tailwind classes and the reasoning given above for each. The inactive-color change in particular
  rests on a guessed interpretation of a garbled instruction ("Phone callers for inactive options
  should also be reduced a bit") — worth explicit confirmation from the user, not just a visual
  check, before treating it as settled.

## Notes for the reviewer

- The naming asymmetry flagged in the plan's Risks section stands as predicted:
  `OverviewDescriptions.vue` (plural, the bullet list) is now visually titled "Features" while the
  file itself is still named `OverviewDescriptions`, alongside the new, differently-named
  `OverviewShortDescription.vue`. Left as-is per the plan's scope call — renaming the older file
  would ripple into its auto-imported name everywhere it's used.
- Worth a second look: the `products.detailForm.caracteristiques.*` i18n keys (error-summary text,
  remove-button aria-label) still say "Characteristics" in English while the visible section title
  now says "Features". Not user-visible as a section heading (that text is only used in the
  invalid-field summary and an aria-label), so left untouched as out of the literal scope of what
  was asked — but flagging in case the reviewer/user wants full terminology consistency.
- Live-browser visual verification is the one open item — see Not done.
