# Orders hydration stability

## Requirement

Resolve the Vue hydration mismatches reported on `/orders` for the created-at range picker and the product image in order lines.

## Restated

The first client render must match server HTML for both controls. The range picker should mount its popup only when opened; order-line images should remain behind the same placeholder through hydration and appear afterward when product data is available.

## Reuse

- `app/components/vuzeno/date-picker/DatePickerTrigger.vue` and `FiltersInputDateRange.vue` — shared Ark date-picker wrappers used by the orders filter.
- `app/components/orders/LineRow.vue` — order-line product image and existing placeholder.
- `test/nuxt/date-picker-context.test.ts`, `test/nuxt/orders-filter-bar.test.ts`, and `test/nuxt/orders-detail-workspace.test.ts` — current component-level coverage.

## Data contracts

No API, query-key, or translation contract changes. Product detail remains best-effort data for roles allowed to view products.

## States

- Closed date picker: render only the stable trigger during SSR and initial hydration.
- Open date picker: mount the calendar popup when the user opens it.
- Order line before client mount or while product data is absent: show the placeholder icon.
- Order line after client mount with product image data: show the image.

## Changes

1. **Date-picker control composition** — update `app/components/vuzeno/date-picker/DatePickerTrigger.vue` to render a normal date-picker control around its trigger instead of relying on nested `as-child` composition; set lazy mounting for the range picker in `app/components/vuzeno/filters/FiltersInputDateRange.vue`. Done when SSR-to-client hydration produces no Vue mismatch warnings and opening the trigger still mounts the calendar.
2. **Order-line image readiness** — update `app/components/orders/LineRow.vue` so the server and initial client render both use the placeholder, then allow the product image query/render after mount. Done when a warm product cache does not change the image branch before hydration and the image still appears after mount.
3. **Regression coverage** — add focused hydration and component coverage in `test/nuxt/` at the rendered picker and order-line seams. Done when tests fail against the current behavior and pass with the fix.

## Tests

- SSR-render and hydrate the closed date-range picker, assert no hydration mismatch warning, then confirm its trigger can open the calendar.
- Mount an order line with a cached product image; assert the placeholder is retained for the initial render and the product image becomes visible after mount.
- Run the relevant orders/date-picker/image Nuxt specs and lint/typecheck for changed source.

## Risks

- Ark's date-picker presence and polymorphic wrappers can make a test harness behave differently from the full filter bar; exercise the real wrapper composition.
- Delaying the order-line image until mount adds a brief placeholder during hydration, which is preferable to mismatched SSR markup.

## Open questions

None. The expected initial state is explicit in the reported server/client markup.
