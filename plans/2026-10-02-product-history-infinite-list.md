# Product history: infinite list

Cross-repo: `NowTech-backend-` (`/Users/michaelnji/Projects/nvc/NowTech-backend-`) and `nowtech-admin`.
Slug: `product-history-infinite-list`. TDD throughout: failing spec first, minimum code after.

## 1. Problem

`GET /catalogue/administration/produits/:id` embeds `historique` with a hard `limit 20`
(`src/catalogue/administration.service.ts:485-491`). A product with more than 20 proposals silently
loses the rest. The History tab (`HistoryTab.vue` → `HistoryPanel.vue`) renders that embedded array and
the tab badge counts it (`DetailForm.vue:79`, `historyCount`), so the badge also caps at 20.
`HistoryPanel` additionally re-sorts client-side, which is wrong once pages arrive separately.

## 2. Decisions (settled)

| Decision | Choice | Why |
| :-- | :-- | :-- |
| Pagination style | Page number (`page`, `taille`), not cursor | Same contract as `GET produits/:id/inventaire` (`lireInventaire`, service `:756-789`) and `useProductInventory`; the index `arbitrage.propositions (produit_id, detectee_le desc)` (`sql/arbitrage.sql:104`) already serves the order. |
| Roles | **Same as `GET produits/:id`: `Role.direction`, `Role.comptoir`** | User decision. Matches `administration.controller.ts:167`. |
| Order | `detectee_le desc, id desc` | `id` tie-break makes offset pages deterministic. |
| Seam drift | Client dedupes by `id` | A new proposal landing mid-scroll shifts offsets by one and can repeat a row at a page seam. |
| Embedded `historique` | Kept in `lireProduit` for this change | Additive backend; frontend migrates first. Removed in a separate follow-up. |
| Fetch timing | Only once the History tab has been opened | The tab is `v-show` (always mounted). The backend has a shared 10 req/s ceiling; History is not above the fold, so no SSR prefetch either. |

## 3. Backend (`NowTech-backend-/src/catalogue/`)

Language rule for this repo: identifiers and comments follow the surrounding French style; API field
names stay French (`historique`, `taille`, `pages`).

### 3.1 DTO — `administration.dto.ts`

`ListerMouvementsDto` (`:238-244`) already is `page >= 1` and `taille 1..200`. Do not duplicate it.
Introduce `PaginationDto` with those two fields, make `ListerMouvementsDto` extend it unchanged
(`class ListerMouvementsDto extends PaginationDto {}`) so existing validation specs keep passing, and
add `export class ListerHistoriqueDto extends PaginationDto {}` for the new route. Default `taille` is
applied in the service (20), as `lireInventaire` does.

### 3.2 Service — `administration.service.ts`

Add `lireHistorique(id: number, filtres: ListerHistoriqueDto = {})`:

1. `await this.exigerProduit(id)` first, so an unknown product is a 404 and not an empty page.
2. `page = filtres.page ?? 1`, `taille = filtres.taille ?? 20`.
3. Two raw queries in `Promise.all`:
   - count: `select count(*)::int as total from arbitrage.propositions where produit_id = $1`
   - page: the same column list as `lireProduit` (`id::int, lot_id::int, type, statut, champs,
     detectee_le, decidee_le, decidee_par, motif`), `order by detectee_le desc, id desc`,
     `limit $2 offset $3`.
4. Keep the `id::int` / `lot_id::int` casts and carry the existing BigInt comment (`:478-484`) by
   reference: both columns are `bigserial` and `JSON.stringify` throws on BigInt. Add a count cast
   `::int` for the same reason (`count(*)` is bigint).
5. Return `{ historique, page, taille, pages: Math.ceil(total / taille), total }`, the same envelope
   as `lireInventaire`.
6. Extract the shared column list into a constant used by both `lireProduit` and `lireHistorique`, so
   the two cannot drift. In `lireProduit`, also add `historique_total` (a `count(*)::int`), so the
   badge shows the real number. Fold it into the existing query batch if one exists; do not add a
   sequential round trip.

Use `$queryRawUnsafe` with positional parameters only (no string interpolation of `id`, `taille`,
`offset`), same as the current query.

### 3.3 Controller — `administration.controller.ts`

```ts
@ApiOperation({
  summary: 'Decision history of a product, paginated',
  description: 'Newest first, every change made here and every proposal accepted from the WooCommerce sync, with the value before and after and who decided. Page size capped at 200.',
})
@Roles(Role.direction, Role.comptoir)
@Get('produits/:id/historique')
lireHistorique(@Param('id', ParseIntPipe) id: number, @Query() filtres: ListerHistoriqueDto) {
  return this.service.lireHistorique(id, filtres)
}
```

Place it next to `lireProduit`. Route ordering: `produits/:id/historique` has two segments, so it
cannot be shadowed by `produits/:id`, and `produits/inventaire/export` is unaffected.

### 3.4 Backend tests (red first)

New file `administration.historique.spec.ts`, modelled on `administration.inventaire.spec.ts`
(`construire…` helper, `methode()` dynamic access so the suite compiles before the implementation):

- Route: path `produits/:id/historique`, verb GET, roles exactly `[Role.direction, Role.comptoir]`.
- DTO: rejects `page: 0`, `taille: 0`, `taille: 201`, non-integer, unknown property
  (`forbidNonWhitelisted`); accepts empty.
- Service:
  - default window: `limit 20 offset 0`, `page 1`;
  - `page: 2, taille: 20` → offset 20; params passed positionally, never interpolated;
  - `pages` = `ceil(total / taille)` (e.g. 45 rows, taille 20 → 3); 0 rows → `pages: 0`, empty array;
  - page beyond the end → empty `historique`, correct `total` (the inventaire suite has this case);
  - unknown product → `NotFoundException`, queries never run;
  - ordering clause is `detectee_le desc, id desc` (assert the SQL text);
  - JSON round-trip of the result does not throw (BigInt regression guard: feed bigint-typed
    `id`/`lot_id` through the mock and assert the casts are in the SQL, since the mock cannot
    cast).
- `lireProduit`: returns `historique_total` and still returns the 20-row `historique`.

Run: `pnpm jest src/catalogue/administration.historique.spec.ts` then the whole catalogue folder.

### 3.5 Backend docs

Swagger is generated from `@ApiOperation`. If the repo keeps an endpoint list under `documents/`,
add the route there (check first; do not create a new doc).

## 4. Frontend (`nowtech-admin`)

### 4.1 Types — `app/types/api/produits.ts`

```ts
/** Mirrors `lireHistorique()` (`administration.service.ts:<lines>`), served by `administration.controller.ts:<line>`. */
export interface ProductHistoryPage {
  historique: ProductHistoryEntry[]
  page: number
  taille: number
  pages: number
  total: number
}
```

Fill the real line numbers after the backend lands (AGENTS.md: every exported type cites file and
line). Add `historique_total?: number` to `ProductDetail`, optional so a payload from a backend that
predates the field still satisfies the type (same reasoning as `delai_livraison_id`).

### 4.2 Query key — `app/utils/api-query-keys.ts`

Add `history: (id) => [...products, "historique", id] as const` under `products`. It sits below the
`products` prefix, so `invalidateQueries({ queryKey: apiQueryKeys.products.all })` already refreshes
it after any product write. Extend `test/unit/api-query-keys.test.ts` with the same three assertions
used for `inventory` (shape, distinct per product, below the prefix).

### 4.3 Composable — `app/composables/useProductHistory.ts`

Mirror `useProductInventory`:

```ts
const HISTORY_PAGE_SIZE = 20
useInfiniteQuery<ProductHistoryPage>({
  queryKey: computed(() => apiQueryKeys.products.history(id.value)),
  queryFn: ({ pageParam }) =>
    useApiFetch()<ProductHistoryPage>(`/catalogue/administration/produits/${id.value}/historique`, {
      query: { page: pageParam, taille: HISTORY_PAGE_SIZE },
    }),
  initialPageParam: 1,
  getNextPageParam: last => (last.page < last.pages ? last.page + 1 : undefined),
  enabled,
})
```

Signature `useProductHistory(productId: MaybeRefOrGetter<number | null>, enabled: MaybeRefOrGetter<boolean> = true)`,
the `useProductCosts` shape: disabled while the id is null or the tab was never opened. No BFF work:
the `/api/v1/**` catch-all proxy already forwards it, and the new route is read-only.

### 4.3b Pure helper — `app/utils/history-entries.ts`

`flattenHistoryPages(pages: ProductHistoryPage[]): ProductHistoryEntry[]`: concatenates pages in
order and drops later duplicates by `id` (first occurrence wins, so server order is preserved). One
function, one job; no sorting. Also filter out entries with no visible diff? **No**: that needs the
value formatter (composable), so it stays in the panel (see 4.4).

### 4.4 Panel — `HistoryPanel.vue`

Props change from `historique: ProductHistoryEntry[]` to `productId: number | null` plus
`enabled: boolean`. The panel owns the query (as `InventoryPanel` owns its own).

- Entries = `flattenHistoryPages(data.pages)`. Delete the local `sortedEntries` sort and its comment:
  server order is the single truth once paging exists.
- Empty-diff entries: `HistoryEntry` currently hides itself with `v-if="diffLines.length"`. With
  paging that can leave a page rendering zero rows while `hasNextPage` is true. The footer re-checks
  its sentinel after a page lands (`shouldLoadMore` watcher, `flush: "post"`), so it still advances,
  but "No changes yet" would be wrong if every loaded entry is hidden. Fix by moving the emptiness
  decision up: expose a small `hasVisibleDiff(entry)` from the formatter composable (or a sibling
  `useHistoryDiff`), filter in the panel, and drop the `v-if` from `HistoryEntry` (it then always
  renders what it is given). One responsibility each: panel decides what to list, entry renders one.
- States, per the Error and empty states table in AGENTS.md (wide panel):
  - first load: 3 skeleton rows (reuse the loading idiom of `InventoryPanel`);
  - first-load error: `ApiErrorCard` with retry (`refetch`);
  - no entries and no next page: existing `products.historyPanel.empty` text (kept, it is inline in a
    card, not a page);
  - next-page error: `InfiniteListFooter` already shows the retry strip and stops auto-loading.
- `<InfiniteListFooter>` after the `<ol>` with `sentinel-test-id="products-history-sentinel"` and
  `failed-test-id="products-history-load-failed"`; labels from new i18n keys.

### 4.5 Wiring — `HistoryTab.vue`, `DetailForm.vue`

- `DetailForm.vue`: add `historyOpened` beside `stockOpened` (`:66-76`) with the same two watchers
  (set on tab click, reset when `product.id` changes). Pass `productId` and `enabled` down via
  `HistoryTab`. Fixing the reset matters: without it, switching products would keep the previous
  product's query flagged open.
- `historyCount` becomes `product.value?.historique_total ?? product.value?.historique?.length ?? 0`.
- `HistoryTab.vue` forwards `product.id` and `enabled`; `ProductsCostHistoryPanel` unchanged.

### 4.6 i18n

`i18n/locales/products/{en,fr}.json`, under `products.historyPanel`: `loadingMore`, `loadFailed`,
`loadError` (first-load card, only if `ApiErrorCard` needs a custom title; otherwise reuse its
status-derived title). Keep the French backend detail untouched. Run `bun run i18n:check`.

### 4.7 Frontend tests (red first)

Unit (`test/unit/`):
- `history-entries.test.ts`: concatenates in order; drops a duplicate `id` at a page seam keeping the
  first; empty pages array; empty page in the middle.
- `api-query-keys.test.ts`: the three `history` assertions.

Nuxt (`test/nuxt/product-history-paging.test.ts`), modelled on
`product-inventory-history-paging.test.ts` and its `delivery-fixture` / `inventory-fixture` helpers:
- does not call the endpoint until `enabled`; calls it once enabled with `page=1&taille=20`;
- renders entries in server order, no client re-sort (serve a deliberately non-chronological page and
  assert order is preserved);
- sentinel intersecting loads page 2 and appends; stops when `page === pages`;
- a duplicate entry across the seam renders once;
- page 2 failure shows the retry strip, does not auto-retry, and retry appends page 2;
- first-load failure shows the error card and retry works;
- all-empty-diff entries on page 1 with page 2 available: list is not declared empty and page 2 loads;
- zero entries: shows the empty text;
- comptoir role can read (read-only role, no write UI involved).

Update existing specs touched by the prop change: `products-history-entry.test.ts` (entry no longer
self-hides: move that case to the panel spec), `products-lifecycle.test.ts` and
`statistics-management.test.ts` where they mount the panel or read `historique`.

### 4.8 Quality gates

`bun run lint`, `bun run format` (only on touched files; never reformat untouched code),
`bun run i18n:check`, `bun run typecheck`, `bunx vitest run`, `bun run fallow` (the commit gate).

## 5. Order of work

1. Backend: DTO + failing spec → service → controller → green; run the catalogue test folder.
2. Frontend types + query key + helper + composable (unit tests first).
3. Panel + wiring + i18n (nuxt specs first).
4. Fix existing specs affected by the prop change.
5. Full gates in both repos.
6. Separate follow-up change: remove the embedded `historique` from `lireProduit` and the optional
   fallback in `historyCount`, once no client reads it.

Deploy order: backend first (additive, safe alone), frontend second.

## 6. Risks and open points

- **Rate ceiling.** One extra request per opened History tab, plus one per scrolled page; well under
  the shared 10 req/s limit. The tab-opened gate prevents the always-mounted `v-show` cost.
- **Offset drift** at page seams: covered by dedupe. A row can also be skipped if one is deleted
  mid-scroll; history is append-only audit data, so accepted.
- **Rollout skew.** A new frontend against an old backend gets 404 on the history route. Backend ships
  first; there is no frontend fallback to the embedded array by design (it would hide the problem).
- **`historique_total` optional** until the backend is deployed everywhere; the fallback covers it.
- **Empty-diff filtering** needs the formatter's resolved values (category and delivery-interval
  lookups), which can still be loading. An entry whose only change is an unresolved id still has a
  diff (the raw id is shown), so filtering never hides a real change. Confirm in the panel spec.
- **Out of scope:** cursor pagination, server-side search/filter of history, the cost-history panel,
  and removing the embedded array.

## 7. Deliverables

- This plan (`plans/`), then on completion a walkthrough at
  `walkthroughs/2026-10-02-product-history-infinite-list.md` and a review at
  `reviews/2026-10-02-product-history-infinite-list.md`.
