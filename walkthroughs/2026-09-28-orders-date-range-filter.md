## What I built

Orders now has a created-at date-range chip (`creeLe` / `Operator.Btw` → `FiltersInputDateRange`). The range lives in Pinia beside the API filters and only filters already-loaded list rows by shop-local `creeLe` day (`Africa/Douala`). The filter bar sits under the title/tabs row, not in `AdminPageHeader`’s toolbar.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Shop-day helpers, chip ↔ store conversion | Done | `app/utils/order-date-range.ts` |
| Store `dateRange` / `setDateRange`, never on API `filters` | Done | `app/stores/order-workspace.ts` |
| Inline `creeLe` DateField chip | Done | `app/components/orders/FilterBar.vue` |
| Toolbar mapping, clear, pass range to list | Done | `app/pages/orders.vue` |
| Client-side list filter | Done | `app/components/orders/ListPanel.vue` |
| Rewrite stub `FiltersInputDateRange` as popover range chip | Done | `app/components/vuzeno/filters/FiltersInputDateRange.vue` |
| EN/FR labels | Done | `i18n/locales/orders/en.json`, `fr.json` |
| Unit + nuxt tests from the plan | Done | `test/unit/order-date-range.test.ts`, `test/unit/order-workspace-store.test.ts`, `test/nuxt/orders-filter-bar.test.ts`, `test/nuxt/orders-list-panel.test.ts` |

## Deviations

- **No vuzeno import in `order-date-range.ts`.** The unit env cannot resolve `@/` into the filters barrel (Vue SFC / missing package). Chip values are duck-typed (`start`/`end`), then passed through `formatDateField` / `parseDateField`.
- **“Add filter” assertion dropped.** With search, status, date, and sort all listed, vuzeno has nothing left to hide behind the menu, so the bar has no Add-filter control. The test now asserts the menu is absent and “Created” is visible.
- **Filters moved below title/tabs.** Not in the original plan. After the chip landed, the toolbar slot still sat on the same wrap row as the heading and tabs. The bar is now a sibling under `AdminPageHeader` (`data-testid="orders-filter-row"`), still `v-if="activeTab === 'orders'"`. `AdminPageHeader` itself was not rewritten.
- **Full-bleed filter row.** The first move left the bar inside the padded header column, so `bg-background` could not span the workspace. The row is now a sibling of that padded header, with `w-full bg-background px-4 py-3 sm:px-6 lg:px-10`. Measured at 1280×577: `x: 0`, `width: 1280`, padding `40px / 12px`.
- **Range chip keeps a local draft.** Ark’s picker emits `DateValue`s that fail `instanceof CalendarDate`, and a controlled empty model discarded the first click. `toCalendarDate` / `toCalendarDates` / `toDateRangeValue` convert duck-typed days; the chip only writes the store when both ends exist.

## Tests

```
bunx vitest run test/unit/order-date-range.test.ts test/unit/order-workspace-store.test.ts test/nuxt/orders-filter-bar.test.ts test/nuxt/orders-list-panel.test.ts
```

Watched: `order-date-range.test.ts` 11 passed, `order-workspace-store.test.ts` 7 passed, `orders-filter-bar.test.ts` 4 passed, list-panel suite passed. Process exited 0. Vue still warns that `DatePickerContext` cannot inherit `class` / `data-slot` (pre-existing vuzeno fragment root).

```
bunx vitest run test/nuxt/orders-page-tabs.test.ts
```

Red first: `renders the orders filters below the title and tabs, not in the header toolbar` failed because the bar was still inside `[data-testid='admin-page-header']`. After the move, all 3 cases passed (exit 0).

```
bun run lint:fix -- app/pages/orders.vue test/nuxt/orders-page-tabs.test.ts
```

```
bunx vitest run test/unit/date-field.test.ts test/nuxt/orders-page-tabs.test.ts test/nuxt/orders-list-panel.test.ts
```

Watched: `date-field.test.ts` 9 passed, `orders-list-panel.test.ts` 4 passed, `orders-page-tabs.test.ts` passed. Exit 0.

Live on `http://localhost:3000/orders` (10 fixture orders, `FIX-CMD-01` created `2026-09-08T10:49:16.000Z`): picking **9/1/2026 – 9/8/2026** left only `FIX-CMD-01`. Clear restored all 10 and the chip to “Select dates”.

Exit 0.

```
bun run i18n:check
```

Exit 0 (ran in the earlier chained command; typecheck was the only failure in that chain).

```
bun run typecheck
```

Failed on files this change did not touch:

- `test/nuxt/inline-tag-selector.test.ts(43,12): Property 'click' does not exist on type 'Element'.`
- `test/nuxt/users-orders-tab.test.ts(115,70): Property 'handler' does not exist on type 'EventHandler<...> | { handler: ... }'.`
- `test/nuxt/users-orders-tab.test.ts(139,18)` and `(215,18)`: Parameter `event` implicitly has an `any` type.

```
bunx vitest run test/nuxt/date-picker-context.test.ts test/nuxt/orders-filter-bar.test.ts test/nuxt/orders-page-tabs.test.ts
```

Watched: 3 files, 8 tests passed, exit 0.

Live `/orders` after a hard reload: chip text is `Created` / `between` / `Select dates`. Filter bar is a sibling of the header (`filterRow: true`, `inHeader: false`). Opening the calendar left `agent-browser errors` and `console` empty.

```
bun run lint:fix -- test/nuxt/date-picker-context.test.ts test/nuxt/orders-filter-bar.test.ts app/components/vuzeno/date-picker/DatePickerContext.vue
```

Exit 0. Vuezeno file is eslint-ignored; tests formatted.

Not covered: clicking days in the range calendar (happy-dom + Ark date picker), infinite-query pages still arriving unfiltered from the backend.

## Console dump follow-up

The pasted `/orders` console was mixed.

- **`orders.filterBar.dateLabel` / `dateOperatorBetween` missing.** Keys were already in `i18n/locales/orders/en.json` and `fr.json`, wired through `nuxt.config.ts` `files`. Live chip after reload showed `Created` / `between`. The dump was a stale i18n/HMR cache, not a missing key.
- **`DatePickerContext` fragment warning.** Real. Ark’s `DatePicker.Context` is a slot-only fragment; the vuzeno wrapper forwarded `class` and `data-slot`. That is the warning, and it is a plausible parent of the later `parentNode` crash during HMR/navigation. Wrapper now has `inheritAttrs: false` and no attrs on the fragment. Test: `test/nuxt/date-picker-context.test.ts` (red, then green).
- **Out of scope in the dump.** `en_remise` listing 500, catalogue image CORS, Team `Skeleton` warning, assistant 404. Not touched.

## Not done

- Backend date query params. `ListerCommandesEquipeDto` still has no date fields; extra keys would 400 under `forbidNonWhitelisted`.
- Walkthrough-time `BACKEND_TODO.md` note. Optional in the plan; left for a reviewer/follow-up.
- Unrelated typecheck failures above.

## Notes for the reviewer

- Date filtering is client-side on loaded pages only. Staff can still miss in-range orders that have not been fetched yet.
- `FiltersInputDateRange` is shared vuzeno. The rewrite is the chip trigger + range picker the registry already expected; watch other date-range consumers if any appear.
- Layout change is orders-only. Products still puts its filter bar beside the header; content already puts BannerFilterBar under the header.
