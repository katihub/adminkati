# Product short description

## Requirement

Product details can already carry `caracteristiques` (short bullet highlights) but have no place
for a real prose description. Add one, surfaced to admins and, through the existing public
catalogue projection, to customers.

## Decisions (resolved via grilling, 2026-09-29)

1. **Source**: reuse the backend's existing `description` column — already in the DTO
   (`administration.dto.ts:139-157`), already in the admin read path
   (`administration.service.ts:222-223, 265`), already writable. No migration, no backend change.
2. **Visibility**: customer-facing. The public catalogue projection already reads the same column
   (`catalogue.service.ts:75`, sitting next to `caracteristiques`) — it is simply unpopulated
   today. Filling it in from the admin panel makes it appear on the vitrine immediately, same as
   `caracteristiques` already does.
3. **Length**: frontend caps at 500 characters (Zod). The backend's own cap stays 20,000 chars
   (`administration.dto.ts:150`) and is unaffected — the 500 cap is purely a frontend product
   decision about what counts as "short".
4. **Required**: optional/nullable, matching the backend model. Existing products without one stay
   valid.
5. **Naming**: the *existing* `caracteristiques` bullet-list UI is currently mislabeled
   "Description" (`products.overview.descriptionTitle` etc.) — a pre-existing bug, not something
   this feature introduces, but a same-day fix since the label is now needed for the real field.
   Rename that UI to "Caractéristiques"; the new field takes the "Description" label.

## Reuse

- **`Textarea`** (`app/components/ui/textarea`) + `Label` — already used for capped free text at
  `app/components/products/WithdrawDialog.vue:78-85` (`maxlength="500"` on a `Textarea`, `Label`
  above it). This is the exact shape needed here; no new UI primitive.
- **Nullable-string field pattern** — `marque` and `url_source` in both `produitSchema`
  (`app/schemas/produit.ts:48-53, 59-64`) and `DetailForm.vue`'s `buildRawPayload`
  (`app/components/products/DetailForm.vue:378, 381`: `value.trim() ? value.trim() : null`). The
  new `description` field follows the same shape.
- **Sibling-component composition** — `OverviewDetails.vue` already composes independent overview
  sections (`ProductsOverviewPricing`, `ProductsOverviewDepartments`, `ProductsOverviewCategories`,
  `ProductsOverviewDescriptions`) as siblings, each owning one concern
  (`app/components/products/OverviewDetails.vue:72-111`). The new field follows the same pattern
  rather than growing an existing component.

## Data contracts

| Layer | File | Change |
| :-- | :-- | :-- |
| Type | `app/types/api/produits.ts` | `ProductDetail.description: string \| null` |
| Validation | `app/schemas/produit.ts` | `description: z.string().trim().max(500).nullable().optional()` |
| Payload | `DetailForm.vue` `buildRawPayload()` | `description: values.description?.trim() ? values.description.trim() : null` |

Nothing changes on the wire beyond what the backend already accepts — `ModifierProduitDto.description`
already exists server-side (`administration.dto.ts:139-157`) and already accepts `string \| null`.

## States

This field rides entirely on the existing product fetch/save lifecycle — it introduces no new
loading, error, or async state of its own:

- **Empty**: `null` → blank `Textarea`, placeholder text shown, no validation error (field is optional).
- **Populated**: pre-filled from `product.description` on edit-mode mount, same as every other scalar field (`deriveScalarValues`).
- **Error**: handled by the form's existing `submitError` / field-error machinery — a >500-char value fails `produitSchema.safeParse` and reports through the existing invalid-field summary, no new error path.
- **Saving**: covered by the existing `isSaving` / mutation flow — no per-field saving state.

## Tests

- `test/unit/produit-schema.test.ts` — extend with: accepts `description: null`; accepts a
  500-char string; rejects a 501-char string (`validation.tooLong`, same assertion shape as the
  existing `slug` case at line 106); accepts the field being omitted entirely (optional).
- `test/nuxt/products-detail-form.test.ts` — extend with: a product with `description` set renders
  it pre-filled in the new textarea; editing it marks the form dirty; submitting sends the trimmed
  value (and `null` when cleared) in the payload.
- **Required edit, not new coverage**: `test/nuxt/products-detail-form.test.ts:160-161` currently
  asserts `caracteristiques` bullet inputs carry `aria-label="Description {index}"`. Once the
  relabel lands, this must become the renamed key's text (e.g. `"Caractéristique {index}"`) or the
  existing test starts asserting the bug rather than the fix.
- No test currently pins the literal `"Description :"` title text (verified by search), so the
  relabel itself needs no other test updates beyond the one above.
- TDD applies as usual: the tester role writes these as failing tests against the plan before any
  implementation line lands, per the repo's mandatory red→green rule.

## Risks

- **Naming asymmetry**: the existing bullet-list component stays named `OverviewDescriptions.vue`
  (plural) even after its *label* is renamed to "Caractéristiques" — renaming the file too would
  ripple into its auto-imported name (`ProductsOverviewDescriptions`) everywhere it's referenced.
  Out of scope here; flagging so the mismatch between file name and UI label doesn't read as an
  oversight later. The new component is named `OverviewDescription.vue` (singular) to stay
  distinct.
- **i18n key reuse**: freeing up `products.overview.descriptionTitle` /
  `descriptionInputLabel` for the new field (rather than picking fresh key names) means a diff that
  touches the same keys for two different reasons (rename target *and* new content) — slightly
  denser to review than all-new keys, but avoids leaving dead keys behind.
- **Immediate customer visibility** (decision 2): there is no draft/publish gate — whatever an
  admin types and saves is live on the vitrine right away, same as every other product field today.
  Not a new risk this feature introduces, but worth the implementer double-checking against the
  live catalogue query during manual QA before calling it done.

## Open questions

None outstanding — the five decisions above were resolved in the requirements discussion preceding
this plan.

## Phases

### Phase 1 — Data contract

**What**: Add `description` to the `ProductDetail` type and to `produitSchema`.

**Where**:
- `app/types/api/produits.ts:73` — add `description: string | null` inside `ProductDetail`
  (alongside `caracteristiques`). While touching this block, also fix the stale citation comment at
  line 68 (`Mirrors ...administration.service.ts:171-224`) — `lireProduit()` is currently at
  `administration.service.ts:210-266` in `NowTech-backend-`.
- `app/schemas/produit.ts` — add `description: z.string().trim().max(500, { error: "validation.tooLong" }).nullable().optional()` to `produitSchema`, near `marque`/`url_source` (same nullable-capped-string shape).

**Done when**: `bun run typecheck` passes; `bunx vitest run test/unit/produit-schema.test.ts`
(with Phase 1's new cases, see Tests) passes.

### Phase 2 — Form state & payload

**What**: Wire `description` through `DetailForm.vue`'s local state, derivation, dirty-check, and
submit payload — no UI yet.

**Where** (`app/components/products/DetailForm.vue`):
- `FieldName` union (line 17) and `FIELD_NAMES` (line 19) — add `"description"`.
- `errorKeys` initial object (lines 81-92) — add `description: ""`.
- `values` reactive object (lines 55-65) — add `description: null as string | null`.
- `deriveScalarValues()` (lines 147-154) — add `description: current?.description ?? null`.
- `buildRawPayload()` (~line 366-388) — add `description: values.description?.trim() ? values.description.trim() : null,`.
- `FIELD_LABEL_KEYS` (lines 394-405) — add `description: "products.detailForm.description.label"`.

No change needed to `createFormSnapshot()` or `isDirty` — `description` is a scalar key already
covered by `values`'s spread (unlike `caracteristiques`/`images`, which need explicit array clones
because they're arrays).

**Done when**: `bun run typecheck` passes. Functional verification happens in Phase 3, once there's
a UI to drive it — this phase alone is reviewable by reading the diff against the `marque` pattern
it mirrors.

### Phase 3 — UI

**What**: New component for the real description field; relabel the existing (mislabeled)
caracteristiques UI; wire both into `OverviewDetails.vue` and `DetailForm.vue`'s template.

**Where**:
- New file `app/components/products/OverviewDescription.vue` — `Label` + `Textarea`
  (`maxlength="500"`), mirroring `WithdrawDialog.vue:78-85`. Props: `modelValue: string | null`,
  `id: string`, `disabled?: boolean`. Emits `update:modelValue`.
- `app/components/products/OverviewDescriptions.vue:34, 40, 56` — swap the three i18n calls from
  `products.overview.descriptionTitle` / `descriptionInputLabel` / `nextDescriptionLabel` to
  renamed keys (e.g. `caracteristiquesTitle` / `caracteristiqueInputLabel` /
  `nextCaracteristiqueLabel`).
- `i18n/locales/products/{fr,en}.json`:
  - Rename `overview.descriptionTitle` (fr "Description :" / en "Description:") →
    `overview.caracteristiquesTitle` (fr "Caractéristiques" / en "Characteristics").
  - Rename `overview.descriptionInputLabel` → `overview.caracteristiqueInputLabel` (fr
    "Caractéristique {index}" / en "Characteristic {index}").
  - Rename `overview.nextDescriptionLabel` → `overview.nextCaracteristiqueLabel` (fr "Ajouter une
    caractéristique" / en "Add a characteristic").
  - Add `overview.descriptionTitle` (fr "Description" / en "Description") for the new field's
    section heading — reusing the now-freed key name.
  - Add `detailForm.description.label` (fr "Description" / en "Description") for the
    invalid-field summary.
  - Add `detailForm.description.placeholder` — a short hint, e.g. fr "Résumé du produit visible
    par les clients" / en "Product summary shown to customers".
- `app/components/products/OverviewDetails.vue`:
  - Add `description: string | null` prop and `update:description` emit (lines 5-43).
  - Render `<ProductsOverviewDescription>` directly above the existing
    `<ProductsOverviewDescriptions>` block (line 105) — prose summary before bullet highlights.
- `app/components/products/DetailForm.vue` template (~lines 545-581): pass
  `:description="values.description"` and `@update:description="value => values.description = value"`
  to `ProductsOverviewDetails`.

**Done when**: `bunx vitest run test/nuxt/products-detail-form.test.ts` passes (including the
updated `aria-label` assertion, see Tests); `bun run lint` and `bun run typecheck` pass; manual QA
in a running dev server confirms: open an existing product, see "Description" textarea pre-filled
(or empty) above "Caractéristiques", edit and save, reload, value persists.

## Slug

`product-short-description` — reused verbatim by the walkthrough and the review.
