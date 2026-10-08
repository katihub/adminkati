# Orders hydration stability

## What changed

- Corrected the shared Ark date-picker trigger composition so it renders a single button rather than a nested button. The range picker now lazy-mounts its positioner/calendar only after opening.
- Extracted the order-line thumbnail into `OrdersLineImage.vue`. It renders the same placeholder on the server and during hydration, then reveals the cached/fetched image after mount.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Correct date-picker trigger composition | Done | `app/components/vuzeno/date-picker/DatePickerTrigger.vue` |
| Lazy-mount the closed range picker popup | Done | `app/components/vuzeno/filters/FiltersInputDateRange.vue` |
| Defer order-line image branch until mounted | Done | `app/components/orders/LineImage.vue`, `app/components/orders/LineRow.vue` |
| Regression coverage | Done | `test/nuxt/orders-hydration.test.ts`, `test/nuxt/date-picker-context.test.ts` |

## Verification

- `bunx vitest run test/nuxt/orders-hydration.test.ts test/nuxt/date-picker-context.test.ts test/nuxt/orders-filter-bar.test.ts test/nuxt/orders-detail-workspace.test.ts test/nuxt/products-image-rendering.test.ts -t "orders hydration|date picker context|orders filter bar|orders detail workspace|order line"` — 22 passed, 7 skipped.
- `bun run typecheck`, targeted `bun run lint`, targeted `bun run format:check`, `bun run i18n:check`, `git diff --check`, and `bun run fallow` — passed.
- A broader run including all of `products-image-rendering.test.ts` had 2 unrelated environment failures: the test catalogue host is not in the IPX domain list, so its host assertion and banner IPX assertion fail. The targeted order-line case passed.

## Notes

- The old date-picker trigger output contained an outer Ark trigger button and the custom button child, which is invalid nested button markup and caused Vue's hydration cursor to become misaligned before the positioner.
- The order-line image can be present in the hydrated query cache while the server has no authorized product session; mounting-gating the thumbnail prevents that cache/session timing from changing the first client render.
- No API, translation, or order state behavior changed.
