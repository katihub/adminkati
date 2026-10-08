# Orders date-range filter

## Requirement

Add a date-range filter to the orders workspace filter bar (`app/pages/orders.vue` toolbar → `OrdersFilterBar`) so staff can narrow the list to orders created in a chosen inclusive day range. Use the existing vuzeno Filters date-range input (`Field.DateField` + `Operator.Btw` → `FiltersInputDateRange`). Install any missing vuzeno registry pieces.

## Restated

The orders toolbar already has search, status, and sort as vuzeno chips. A fourth chip lets the user pick a start and end day. The list then only shows orders whose `creeLe` falls on a shop day inside that range. Clearing the chip, or Clear, removes the range.

## Reuse

- `app/components/orders/FilterBar.vue` — add a `Field.DateField` with `Operator.Btw` next to the existing text/select chips.
- `app/components/vuzeno/filters/FiltersInputDateRange.vue` — the date-range value editor already wired by `FiltersItemValue` when the field is a `DateField` and the operator `inputType` is `range`. The installed file is a stub (inline calendar, no chip trigger). Bring it in line with the registry item and with `FiltersInputDate.vue` (popover trigger + range calendar). Do **not** reinstall `@vuzeno/filters` wholesale — local Phosphor icons, accent-insensitive search, and the `removable` prop would be overwritten.
- `app/components/vuzeno/date-picker/*` and `app/components/vuzeno/popover/*` — already installed. No extra registry add is required (`bunx --bun shadcn-vue@latest add @vuzeno/date-picker` / `@vuzeno/filters` / `@vuzeno/popover` would only rewrite files we already have).
- `app/utils/date-field.ts` — `parseDateField` / `formatDateField` for `CalendarDate` ↔ `YYYY-MM-DD`.
- `app/utils/dates.ts` — `FUSEAU_BOUTIQUE` (`Africa/Douala`) is the shop day, not the browser timezone.
- `app/stores/order-workspace.ts` and `app/pages/orders.vue` `toolbarFilters` computed — same derived-view pattern as products: the chip array is a view onto the store, not its own source of truth.
- `app/utils/filter-caisses.ts` — precedent for a client-side list filter when the backend query cannot express the dimension.

## Data contracts

**Exist today**

`ListerCommandesEquipeQuery` (`app/types/api/commandes.ts`, mirrors `commandes.dto.ts:95-116`) is `{ statut?, q?, tri?, page?, taille? }`. `GET /commandes/equipe/annuaire` uses that DTO. The backend `ValidationPipe` is `forbidNonWhitelisted: true` (`NowTech-backend-/src/configurer-application.ts`). Sending a date query param would 400.

`CommandeAnnuaireItem.creeLe` is an ISO timestamptz string. That is the field the range applies to.

**Must not be created**

No new API query params. Date range is browser-only Pinia state and is never spread into `useOrders` / `prefetchOrders`.

**New (frontend only)**

```ts
type OrderDateRange = { start: string, end: string } // YYYY-MM-DD, inclusive, shop calendar days
```

Store it beside the API filters, not inside them.

## States

- **Unset** — chip present with a placeholder, list unfiltered by date (current behaviour).
- **Partial pick** — Ark range picker only commits when both ends exist (`FiltersInputDateRange` already waits for `start` and `end`). Until then the store stays unset.
- **Set** — list shows only loaded rows whose shop-local `creeLe` day is `start ≤ day ≤ end`.
- **No matches** — existing `InlineStateNotice` “No orders”. No new empty component.
- **Clear chip / Clear bar** — date range omitted again.
- **Loading / error** — unchanged; date filtering runs on already-fetched pages.

Limitation (in scope, documented): infinite query still pages the unfiltered backend. The range only applies to pages already loaded. True server-side date filtering needs a backend DTO change and is out of scope.

## Changes

1. **`app/utils/order-date-range.ts`** (new) — pure helpers:
   - `shopDay(iso: string): string | undefined` — `creeLe` → `YYYY-MM-DD` in `FUSEAU_BOUTIQUE`. Invalid ISO → `undefined`.
   - `isCreeLeInRange(creeLe: string, range: OrderDateRange): boolean` — inclusive, both ends required.
   - `filterOrdersByDateRange<T extends { creeLe: string }>(orders: T[], range: OrderDateRange | undefined): T[]` — no-op when range is missing.
   - `toOrderDateRange(value: FilterValue): OrderDateRange | undefined` / `toDateRangeFilterValue(range: OrderDateRange | undefined)` — `CalendarDate` chip ↔ store strings, using `isFilterRangeValue` + `date-field`. Swap if start > end.
   Done when: unit tests below pass.

2. **`app/stores/order-workspace.ts`** — `dateRange` ref, `setDateRange`, include it in `$reset`. Keep `filters` strictly the API query (`q`/`statut`/`tri`/`taille`). Done when: existing store tests still pass and new cases prove date range never appears on `filters`.

3. **`app/components/orders/FilterBar.vue`** — add
   ```ts
   Field.DateField({
     key: "creeLe",
     label: t("orders.filterBar.dateLabel"),
     icon: () => h(PhCalendarBlank),
     operators: [Operator.Btw({ label: t("orders.filterBar.dateOperatorBetween"), default: true })],
   })
   ```
   Always listed so the chip is inline like status/sort, not behind “Add filter”. Done when: the bar renders a fourth chip.

4. **`app/pages/orders.vue`** — extend `toolbarFilters` get/set with `creeLe` (`operator: "btw"`, value from `toDateRangeFilterValue`). `hasActiveToolbarFilters` true when a range is set. `clearToolbarFilters` calls `setDateRange(undefined)`. Pass `dateRange` into `OrdersListPanel`. Do not put it on `filters` / `useOrders`. Done when: picking a range does not change the annuaire query string.

5. **`app/components/orders/ListPanel.vue`** — accept `dateRange?: OrderDateRange` and run `filterOrdersByDateRange` on the flattened pages before render. Done when: a seeded list of two days shows only the in-range row.

6. **`app/components/vuzeno/filters/FiltersInputDateRange.vue`** — replace the stub with a chip trigger + popover calendar in `selection-mode="range"`, matching `FiltersInputDate.vue` (Phosphor icons, `filtersControlVariants`, `injectFiltersContext`). Show the selected start/end (or a placeholder) on the trigger. Commit only when both ends are `CalendarDate`. Done when: the orders date chip opens a range calendar instead of an inline month grid.

7. **`i18n/locales/orders/en.json`** and **`fr.json`** — `orders.filterBar.dateLabel`, `orders.filterBar.dateOperatorBetween`. Done when: `bun run i18n:check` is clean.

## Tests

Seams (behaviour, not markup):

| Seam | Kind | Why |
| :-- | :-- | :-- |
| `order-date-range` helpers | unit | Inclusive range, shop TZ (a UTC evening that is the next Douala day), invalid ISO, missing range is a no-op, start>end still matches after swap |
| `useOrderWorkspaceStore` date range | unit | Set/clear/reset; `filters` stays `{ tri, taille, … }` with no date keys |
| `OrdersFilterBar` | nuxt | Date chip is inline (one more removable chip than today); an active range shows both days, not a raw object |
| `OrdersListPanel` | nuxt | Seeded pages + a range hide out-of-range rows; unset range shows all |

Do **not** test Ark/vuzeno calendar internals, class names, or that Pinia is reactive.

## Risks

- Reinstalling `@vuzeno/filters` would clobber local filter customizations. Edit only `FiltersInputDateRange.vue`.
- Putting the range on `CommandesFilters` would 400 the list. Keep it off the query object; a store test must lock that.
- Client-side filtering of an infinite list can look empty when matching orders are on later pages. Acceptable until the backend grows date params; record it in the walkthrough.
- `FiltersInputDateRange` currently types `@update:model-value` as if Ark emitted `{ start, end }`; Ark range mode emits `DateValue[]`. The rewrite must use the array.

## Open questions

None that change shape. Assumed: filter by created-at (`creeLe`), inclusive shop days, chip always inline, client-side only.

## Out of scope

Quotes tab, backend DTO, URL-serializing the range, fetching extra pages to satisfy the range.
