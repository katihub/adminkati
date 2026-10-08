# Audit: test suite pruned against the Testing criteria

Date: 2026-10-05. Kind: audit. Raw per-shard manifests (including the 122 borderline tests that were kept): [appendix B](2026-10-05-audit-test-suite-pruning-manifests.md).

## At a glance

| | Before | After | Change |
| :-- | --: | --: | --: |
| Tests (`it`/`test` declarations) | 1,851 | 1,617 | −234 (12.6%) |
| Spec lines (`test/unit` + `test/nuxt`) | 35,961 | 32,710 | −3,251 (9.0%) |
| Spec files | 238 | 237 | −1 |
| Failing unit tests | 12 | 9 | −3 (broken tests among the removals) |
| Unit suite wall time | ≈6.3 s (median of 5 runs, range 3.5–9.0 s) | ≈5.7 s (median of 5 runs, range 3.2–10.7 s) | within noise |
| Nuxt suite wall time | 179 s | 159 s | −20 s (−11%) |

No test that passed before now fails: the failures that do not depend on timing are identical before and after (see Findings).

## Gains

- **Less to maintain.** 234 fewer tests and about 3,250 fewer lines of spec, plus the imports, helpers, fixtures and empty `describe` blocks that only those tests used (for example the unused `BAR` constant in the action-bar spec, the `makeBanner` helper in `banner-info-tips`, the `STATUS` const in `banner-form-layout`, and the `serveFlow` helper and its imports in `stock-import-run`).
- **Fewer false alarms on restyles.** 27 markup tests and several static-copy tests failed whenever layout or wording changed, without catching a behaviour bug.
- **A more honest suite.** 31 tautologies and the vacuous tests cannot fail for a reason that matters; they only raised the pass count. Three removed tests were already failing.
- **Faster runs, modestly.** The Nuxt suite went from 179 s to 159 s (one run each). The unit suite takes about 6 s either way and the difference is within run-to-run noise, so no unit speed-up is claimed.
- **Costs, stated plainly.** 80 of the removals are composable tests. Retry, idempotency-key and cache-invalidation behaviour in `useStockImportRun`, `useStockExport` and the order/quote hooks now rests on one test each. That is what `composables.md` asks for, but it is less protection than before.

## What was removed, and what those tests were for

| Category | Removed | What these tests were | Examples |
| :-- | --: | :-- | :-- |
| `composable-limit` | 80 | Tests that drove data-fetching and mutation hooks (`useX`) through their branches: retries, refreshes, pagination walks, cache invalidation. They guarded real glue code, but `composables.md` allows one test per composable, on request only. Largest cuts: `useStockImportRun` 35 → 1, `useStockExport` 12 → 1, `orders-api` 7, `banner-mutations` 6, `useTaxonomyMutations` 5, `useObjectUrl` 4. | `stock-import-run.test.ts`: “is ignored when idle”; `stock-export-run.test.ts`: “starts idle with no error”; `use-object-url.test.ts`: “has no url while there is no file” |
| `duplicate` | 74 | Extra cases that reach a branch another test already covers, so they add a name to the suite but no new way to fail. Typical: href cases repeated from the standalone `hrefSchema` suite, one-line template variants of the same path builder, a second assertion of the same `activeTab` condition. | `tooltip-icon-button.test.ts`: “can be disabled”; `ai-product-copy-schema.test.ts`: “rejects a blank name %j”; `ai-config.test.ts`: “accepts a positive integer” |
| `tautology` | 31 | Tests that can only agree with themselves: constant and lookup-table mirrors, a mock returning X and the test asserting X came back, and absence checks for features already deleted from `app/` (they cannot fail). | `periode.test.ts`: “maps %s to jour”; `ai-product-copy-client.test.ts`: “keeps a null price null”; `products-history-entry.test.ts`: “labels the %s field as %s” |
| `markup` | 27 | Tests pinned to DOM structure rather than behaviour: test-id existence, element counts, CSS custom properties, slot position, skeleton layout, badge variants. They break on a restyle and catch no user-visible bug. | `taxonomy-products-infinite.test.ts`: “has no load-more button”; `products-filter-bar.test.ts`: “renders one chip per filter inline”; `banner-form-layout.test.ts`: “sits above the text box, in the field's header” |
| `framework` | 10 | Tests of what Nuxt, Zod, vue-query, Intl or the language already guarantee, not of a rule this repo wrote. | `admin-profile-menu.test.ts`: “starts closed”; `ai-product-copy-schema.test.ts`: “rejects wrong field types”; `delai-livraison-schema.test.ts`: “rejects a non-boolean actif” |
| `passthrough` | 7 | Constant-equality checks, e.g. a ceiling constant `toBe(20_000)` whose boundary the behaviour tests already exercise. | `order-workspace-store.test.ts`: “updates the sort filter”; `stock-import-files.test.ts`: “mirrors the backend limits”; `produit-schema.test.ts`: “exposes a 20000-character ceiling” |
| `coverage` | 5 | Tests that exist to touch code rather than check an outcome: `expectTypeOf`-only tests (runtime no-ops here, since vitest typecheck is not configured) and “renders without a Vue warning”. | `ai-product-copy-schema.test.ts`: “never throws, even on deeply malformed input”; `stock-import-views.test.ts`: “resolves every child component without a Vue warning”; `catalogue-caisse-api.test.ts`: “models the bounded catalogue ingestion and proposal query contracts” |

The complete list, one line per test, is in [Appendix A](#appendix-a-every-removed-test).

## Findings

1. **`composable-limit` is the largest and most contestable category (80 of 234).** `composables.md`
   allows at most one test per composable, and only on request. Applied literally, `useStockImportRun`
   went from 35 tests to 1 (kept: a retry after a 502 apply reuses the same key) and `useStockExport`
   from 12 to 1. Thirty composables kept exactly one test; none kept more than one across shards.
   The agents counted `useTeam` and `useTeamMember` as one composable because they share a file.
2. **Nothing the pruning did broke the suite.** Unit: 9 failing, all in four AI specs, down from 12
   (three of the old failures were among the removed tests). Nuxt: the non-timeout failures are the
   same ten at baseline and after pruning; only timeouts vary with load.
3. **Tests that were already broken, not caused by this work.**
   - `ai-product-copy-schema.test.ts`: `productCopySuggestionSchema` requires eight fields but the
     `suggestion()` fixture builds four. The two "accepts…" tests fail, and the "rejects…" tests pass
     only because keys are missing, not because of the rule they name.
   - `ai-product-copy-service` and `ai-product-copy-api` assert that provider detail never reaches
     the thrown error, but `server/utils/ai/errors.ts` documents that a sanitised `providerDetail`
     travels to the operator on purpose. Either the specs or the design is stale, and it concerns
     secret leakage.
   - Nuxt, deterministic: IPX URL assertions (`banner-artwork-preview`, `banner-panel-artwork`,
     `products-image-rendering`), `products-delivery-picker`, `products-detail-form`,
     `products-image-rendering` and `products-local-preview` expectations, a missing test id in
     `products-detail-form`, and `overview-date-field`.
   - Load-dependent timeouts: `operations-page`, the 2000-row render tests in `stock-import-views`,
     `products-overview-stock-indicator`.
4. **122 tests were kept as borderline** and are listed per shard in the appendix. The ones the agents
   singled out: the loading-skeleton test in `orders-detail-skeleton`, which mixes real a11y
   assertions with skeleton-count and class assertions, and the department-selector edit test in
   shard 6, which passes vacuously if its option click finds nothing.

## Method

- 238 spec files (96 unit, 142 nuxt, 1851 `it`/`test` declarations) were split alphabetically into
  eight shards of about 4,500 lines each and given to eight agents with one shared rubric.
- The rubric's decision test: name the concrete regression the test would catch. No answer, remove it.
  Removal tags: `framework`, `tautology`, `markup`, `passthrough`, `coverage`, `composable-limit`,
  `duplicate`. Doubtful cases were kept and listed as borderline.
- Agents edited tests only, cleaned the imports, helpers and empty blocks the removals left behind,
  and ran `oxlint` plus the unit specs of their shard. They did not run `test/nuxt` (concurrent Nuxt
  environments collide).
- Afterwards: full unit and Nuxt runs, a baseline comparison for the failing Nuxt files (original
  `HEAD` versions of the six edited ones against the pruned versions), typecheck, lint of `test/`,
  and the `fallow` gate.

## Recommendation

- Review the `composable-limit` removals first; the appendix names every one, and they can be
  restored from the diff without touching the other categories.
- Fix or delete the stale AI specs in finding 3, starting with the provider-detail ones.
- Make the timing-sensitive Nuxt tests deterministic or give them explicit timeouts.

## Scope limits

- Criteria were applied by reading each spec and the code it covers, not by mutation testing; "can
  fail for a reason that matters" is a judgment, and eight agents judged independently.
- Only `test/unit/` and `test/nuxt/` were audited; `test/setup/` and `test-docs/` were not.
- Coverage was not measured before or after.
- Timings come from the original tests swapped into `test/` temporarily (unit: 5 runs per side; Nuxt: one run per side), with coverage disabled. A first Nuxt “after” run took 259 s while other work was running; it was discarded and the 159 s figure is from a clean re-run. Machine load moves these numbers by several seconds.
- `test/nuxt` was verified by one full run and a targeted baseline comparison, not by repeated runs,
  so flakiness is characterised, not quantified.
- Nothing is committed; the changes are in the working tree.

## Appendix A: every removed test

Grouped by file. Each line is the test's title (what it checked), the category it was removed under, and the reason. Counts after each file name are test declarations before → after. Titles come from the git diff, categories and reasons from the pruning manifests.

| File | Tests before → after | Removed | Mostly |
| :-- | :-- | --: | :-- |
| `test/nuxt/admin-navigation.test.ts` | 6 → 5 | 1 | duplicate |
| `test/nuxt/admin-profile-menu.test.ts` | 7 → 5 | 2 | framework |
| `test/nuxt/admin-shell.test.ts` | 5 → 4 | 1 | framework |
| `test/nuxt/ai-generation-launcher.test.ts` | 42 → 41 | 1 | markup |
| `test/nuxt/banner-artwork-preview.test.ts` | 2 → 1 | 1 | tautology |
| `test/nuxt/banner-card.test.ts` | 11 → 10 | 1 | duplicate |
| `test/nuxt/banner-editor-pill.test.ts` | 20 → 19 | 1 | duplicate |
| `test/nuxt/banner-filter-bar.test.ts` | 8 → 7 | 1 | tautology |
| `test/nuxt/banner-form-layout.test.ts` | 21 → 14 | 7 | tautology |
| `test/nuxt/banner-info-tips.test.ts` | 4 → 3 | 1 | tautology |
| `test/nuxt/banner-mutations.test.ts` | 8 → 2 | 6 | composable-limit |
| `test/nuxt/banner-panel-details.test.ts` | 8 → 4 | 4 | markup |
| `test/nuxt/catalogue-caisse-api.test.ts` | 6 → 4 | 2 | coverage |
| `test/nuxt/category-product-card.test.ts` | 5 → 4 | 1 | markup |
| `test/nuxt/customers-api.test.ts` | 4 → 2 | 2 | composable-limit |
| `test/nuxt/delivery-interval-mutations.test.ts` | 5 → 4 | 1 | composable-limit |
| `test/nuxt/delivery-interval-query.test.ts` | 2 → 1 | 1 | composable-limit |
| `test/nuxt/download-file.test.ts` | 4 → 3 | 1 | passthrough |
| `test/nuxt/info-tip.test.ts` | 3 → 2 | 1 | duplicate |
| `test/nuxt/message-avatar.test.ts` | 6 → 5 | 1 | duplicate |
| `test/nuxt/orders-api.test.ts` | 10 → 3 | 7 | composable-limit |
| `test/nuxt/orders-confirm-conflict-names.test.ts` | 5 → 4 | 1 | duplicate |
| `test/nuxt/orders-detail-skeleton.test.ts` | 2 → 1 | 1 | markup |
| `test/nuxt/orders-filter-bar.test.ts` | 4 → 3 | 1 | markup |
| `test/nuxt/orders-list-panel.test.ts` | 4 → 3 | 1 | duplicate |
| `test/nuxt/orders-page-tabs.test.ts` | 3 → 2 | 1 | markup |
| `test/nuxt/overview-pricing.test.ts` | 3 → 2 | 1 | markup |
| `test/nuxt/points-of-sale-api.test.ts` | 3 → 1 | 2 | tautology |
| `test/nuxt/points-of-sale-form.test.ts` | 10 → 9 | 1 | markup |
| `test/nuxt/product-inventory-action-bar.test.ts` | 19 → 18 | 1 | markup |
| `test/nuxt/product-inventory-panel.test.ts` | 20 → 12 | 8 | duplicate |
| `test/nuxt/products-ai-suggestions.test.ts` | 28 → 27 | 1 | duplicate |
| `test/nuxt/products-delivery-dialog.test.ts` | 14 → 13 | 1 | duplicate |
| `test/nuxt/products-delivery-picker.test.ts` | 12 → 11 | 1 | duplicate |
| `test/nuxt/products-detail-form-stock-refetch.test.ts` | 8 → 7 | 1 | duplicate |
| `test/nuxt/products-detail-form-stock-tab.test.ts` | 15 → 11 | 4 | duplicate |
| `test/nuxt/products-detail-form.test.ts` | 39 → 38 | 1 | duplicate |
| `test/nuxt/products-filter-bar.test.ts` | 7 → 6 | 1 | markup |
| `test/nuxt/products-history-entry.test.ts` | 13 → 12 | 1 | tautology |
| `test/nuxt/products-list-panel.test.ts` | 9 → 8 | 1 | duplicate |
| `test/nuxt/products-local-preview.test.ts` | 3 → 2 | 1 | duplicate |
| `test/nuxt/products-overview-stock-indicator.test.ts` | 12 → 10 | 2 | framework |
| `test/nuxt/products-taxonomy-ssr.test.ts` | 1 → 0 | 1 | framework |
| `test/nuxt/products-workspace.test.ts` | 11 → 10 | 1 | duplicate |
| `test/nuxt/produit-mutations.test.ts` | 6 → 1 | 5 | composable-limit |
| `test/nuxt/proposal-workspace.test.ts` | 9 → 8 | 1 | markup |
| `test/nuxt/quotes-api.test.ts` | 4 → 2 | 2 | tautology |
| `test/nuxt/quotes-detail-skeleton.test.ts` | 2 → 1 | 1 | markup |
| `test/nuxt/spinner.test.ts` | 6 → 4 | 2 | markup |
| `test/nuxt/stats-blocks.test.ts` | 6 → 5 | 1 | markup |
| `test/nuxt/stock-export-run.test.ts` | 12 → 1 | 11 | composable-limit |
| `test/nuxt/stock-import-page.test.ts` | 7 → 5 | 2 | markup |
| `test/nuxt/stock-import-run.test.ts` | 35 → 1 | 34 | composable-limit |
| `test/nuxt/stock-import-views.test.ts` | 17 → 16 | 1 | coverage |
| `test/nuxt/taxonomy-api.test.ts` | 7 → 2 | 5 | composable-limit |
| `test/nuxt/taxonomy-products-infinite.test.ts` | 16 → 15 | 1 | markup |
| `test/nuxt/taxonomy-recalculate-action.test.ts` | 4 → 3 | 1 | markup |
| `test/nuxt/team-api.test.ts` | 4 → 2 | 2 | composable-limit |
| `test/nuxt/tooltip-icon-button.test.ts` | 4 → 3 | 1 | duplicate |
| `test/unit/ai-audit.test.ts` | 9 → 8 | 1 | duplicate |
| `test/unit/ai-config.test.ts` | 9 → 8 | 1 | duplicate |
| `test/unit/ai-generation-store.test.ts` | 48 → 42 | 6 | tautology |
| `test/unit/ai-product-context.test.ts` | 18 → 15 | 3 | duplicate |
| `test/unit/ai-product-copy-api.test.ts` | 29 → 25 | 4 | duplicate |
| `test/unit/ai-product-copy-client.test.ts` | 24 → 18 | 6 | duplicate |
| `test/unit/ai-product-copy-policy.test.ts` | 3 → 2 | 1 | tautology |
| `test/unit/ai-product-copy-schema.test.ts` | 60 → 48 | 12 | duplicate |
| `test/unit/ai-rate-limit.test.ts` | 10 → 9 | 1 | duplicate |
| `test/unit/api-proxy.test.ts` | 8 → 7 | 1 | duplicate |
| `test/unit/api-query-keys.test.ts` | 9 → 5 | 4 | tautology |
| `test/unit/banner-artwork.test.ts` | 15 → 13 | 2 | markup |
| `test/unit/banniere-schema.test.ts` | 30 → 25 | 5 | duplicate |
| `test/unit/caisse-duty.test.ts` | 13 → 11 | 2 | duplicate |
| `test/unit/dates.test.ts` | 6 → 5 | 1 | duplicate |
| `test/unit/delai-livraison-schema.test.ts` | 16 → 14 | 2 | tautology |
| `test/unit/delivery-interval.test.ts` | 33 → 27 | 6 | duplicate |
| `test/unit/delta.test.ts` | 7 → 6 | 1 | duplicate |
| `test/unit/money.test.ts` | 7 → 6 | 1 | duplicate |
| `test/unit/order-workspace-store.test.ts` | 7 → 5 | 2 | tautology |
| `test/unit/periode-bounds.test.ts` | 12 → 11 | 1 | tautology |
| `test/unit/periode.test.ts` | 10 → 4 | 6 | tautology |
| `test/unit/product-form-values.test.ts` | 10 → 9 | 1 | tautology |
| `test/unit/product-list-store.test.ts` | 4 → 3 | 1 | tautology |
| `test/unit/product-status.test.ts` | 4 → 1 | 3 | tautology |
| `test/unit/produit-schema.test.ts` | 25 → 24 | 1 | passthrough |
| `test/unit/proxy-target.test.ts` | 4 → 2 | 2 | duplicate |
| `test/unit/resolve-member-name.test.ts` | 4 → 3 | 1 | duplicate |
| `test/unit/stock-export.test.ts` | 28 → 26 | 2 | passthrough |
| `test/unit/stock-import-files.test.ts` | 8 → 7 | 1 | passthrough |
| `test/unit/use-object-url.test.ts` | 5 → 1 | 4 | composable-limit |

### Unit specs (`test/unit/`)

#### `test/unit/ai-audit.test.ts` — 9 → 8

- **the default console.info output never carries polluted marker fields** — _duplicate_: same toAuditRecord path as the polluted-input test; default-sink JSON shape already covered

#### `test/unit/ai-config.test.ts` — 9 → 8

- **accepts a positive integer** — _duplicate_: the fully valid production config test already proves each field accepts a valid value

#### `test/unit/ai-generation-store.test.ts` — 48 → 42

- **starts idle with no target, language, result, history, or open panel** — _tautology_: mirrors initial ref values
- **allows a new begin from error** — _duplicate_: same single `status === "loading"` guard as "allows a new begin from ready"
- **settling an already-absent field is a harmless no-op** — _framework_: object-rest destructuring semantics
- **retryLast does not throw when idle and no retry has ever been registered** — _coverage_: bare not.toThrow; the guard is covered by "retryLast does nothing while ready" and the restore test
- **labels a run with an empty string when the caller gives none** — _tautology_: asserts the default parameter value
- **setPanelOpen reopens a closed panel** — _passthrough_: plain setter

#### `test/unit/ai-product-context.test.ts` — 18 → 15

- **never lets the persisted url_source leave the function** — _duplicate_: the `toEqual` in "keeps only images (rang, url) and fiche_pdf" already fails on any extra key
- **exposes only the images and fiche_pdf keys on the mapped product** — _duplicate_: same `toEqual` as above
- **defaults a missing fiche_pdf to null** — _duplicate_: subsumed by "defaults a non-string fiche_pdf to null" (same typeof branch)

#### `test/unit/ai-product-copy-api.test.ts` — 29 → 25

- **rejects an unknown draft.url_source field** — _duplicate_: handler has one parseRequest path; url_source is a row in the schema spec's strict-draft it.each and the top-level unknown-field test proves the 400/no-model-call wiring
- **rejects an unknown draft.images field** — _duplicate_: subsumed by "rejects a browser-supplied draft.images field before any persisted-asset lookup"
- **rejects a missing language** — _duplicate_: rule lives in the request schema (covered by the "rejects language" it.each); handler wiring covered elsewhere
- **rejects an unsupported language** — _duplicate_: same as above

#### `test/unit/ai-product-copy-client.test.ts` — 24 → 18

- **keeps a null price null** — _tautology_: identity on null; cannot fail for a reason that matters
- **reads a known reason from the server's nested Nitro error body** — _duplicate_: the known-reasons it.each already uses the nested Nitro shape
- **maps a non-string reason to unknown** — _duplicate_: same fall-through branch as the unrecognised-reason test; Set.has handles non-strings
- **accepts a plain-object retry-after header with a get method** — _duplicate_: same `headers.get` path as the Headers-instance test
- **does not use a retry-after header for a reason other than quota_exceeded** — _duplicate_: same ternary branch as "never honours retryAfterSeconds for a reason other than quota_exceeded"
- **maps a readable status (not statusCode) with no usable reason to unknown** — _duplicate_: same behaviour as the statusCode variant; the property name is getStatus's concern

#### `test/unit/ai-product-copy-policy.test.ts` — 3 → 2

- **keeps the baseline low-reasoning allowance for every scope until measured tuning changes a cap** — _tautology_: equal caps in, equal value out; the max-of-selected test covers the logic

#### `test/unit/ai-product-copy-schema.test.ts` — 60 → 48

- **accepts a request carrying a positive integer productId** — _duplicate_: handler tests send productId 42 through the real schema
- **rejects a non-object body %j** — _framework_: strictObject rejecting non-objects is Zod's own behaviour
- **accepts brand, department and primaryCategory as null** — _duplicate_: the draft() fixture already carries nulls in every accepting test
- **rejects a department past the 120-character ceiling** — _duplicate_: same optionalLabel helper and same 120 limit as the brand ceiling test
- **rejects a secondaryCategories entry past the 300-character ceiling** — _duplicate_: same required(300) helper as the draft-name ceiling test
- **accepts a well-formed suggestion** — _duplicate_: every other accept assertion in the block, and the parseProductCopyOutput happy path, cover it
- **rejects an extra top-level key** — _duplicate_: covered through the real pipeline by parseProductCopyOutput "returns null when an extra key is present"
- **rejects a missing %s field** — _duplicate_: covered by parseProductCopyOutput "returns null when a required field is missing"
- **rejects wrong field types** — _framework_: Zod type checking; pipeline behaviour covered by parseProductCopyOutput wrong-type test
- **rejects a blank name %j** — _duplicate_: covered by parseProductCopyOutput "returns null when name is blank after trimming"
- **is false when the name is whitespace only** — _tautology_: no brand/category signal either, so it returns false with or without the trim; "ab" with every signal is the discriminating case
- **never throws, even on deeply malformed input** — _coverage_: bare not.toThrow; "returns null for invalid JSON" already asserts the null result

#### `test/unit/ai-rate-limit.test.ts` — 10 → 9

- **leaves the user able to acquire again immediately when release runs in a finally after the work throws** — _duplicate_: the limiter never sees the throw; "acquire, release, acquire again" is already covered by the first test and the stale-release test

#### `test/unit/api-proxy.test.ts` — 8 → 7

- **proxies a six megabyte multipart/form-data body instead of rejecting it** — _duplicate_: the stock-import test (5 MiB + 512 B, multipart) hits the same over-5 MB multipart branch and asserts more (target, headers, body)

#### `test/unit/api-query-keys.test.ts` — 9 → 5

- **gives taxonomy one shared key, distinct from unrelated resources** — _tautology_: asserts two distinct constants differ
- **gives banners one shared key, distinct from unrelated resources** — _tautology_: mirrors the literal array back at itself and asserts two constants differ
- **gives points of sale their own key, so a banner write never refetches them** — _tautology_: mirrors a literal and asserts "not equal"; it cannot catch the prefix collision its title is about
- **gives delivery intervals their own key, distinct from products** — _tautology_: mirrors a literal and asserts two constants differ

#### `test/unit/banner-artwork.test.ts` — 15 → 13

- **frames a main banner wide, as its card in the list does** — _markup_: asserts a Tailwind class string against the same constant
- **frames a promo banner squarer, as its card in the list does** — _markup_: same, class-name lookup mirror (describe block and import removed)

#### `test/unit/banniere-schema.test.ts` — 30 → 25

- **rejects an absolute external URL** — _duplicate_: `href` is `hrefSchema`, already covered by the standalone `hrefSchema` suite
- **rejects a path missing its leading slash** — _duplicate_: same as the `hrefSchema` case
- **rejects a 301-character path as too long** — _duplicate_: same as the `hrefSchema` case
- **accepts a path of exactly 300 characters, the inclusive boundary** — _duplicate_: same as the `hrefSchema` case
- **accepts a path of exactly 1 character** — _duplicate_: same as the `hrefSchema` case (the single open-redirect case kept in `banniereSchema > href` is the field-wiring check)

#### `test/unit/caisse-duty.test.ts` — 13 → 11

- **allows a third person to validate it** — _duplicate_: same predicate and code path as the kept "lets whoever counted it validate it" case (only the id differs)
- **gives no reason for a qualified second person** — _duplicate_: already asserted by the `COUNTER -> null` line of the preceding test

#### `test/unit/dates.test.ts` — 6 → 5

- **tells the three granularities apart** — _duplicate_: fully implied by the exact-value assertions of "reads instants in Douala time rather than the host's"

#### `test/unit/delai-livraison-schema.test.ts` — 16 → 14

- **caps values at 999 and lists the six units** — _tautology_: mirrors two exported constants back at themselves
- **rejects a non-boolean actif** — _framework_: `z.boolean()` rejecting a string is Zod's own behaviour

#### `test/unit/delivery-interval.test.ts` — 33 → 27

- **turns a single 4320 minutes into 72 hours** — _duplicate_: same `displayBound` path as "single 60 -> 1 hour" and the 30..4320 default range
- **keeps a 30..45 minutes range in minutes** — _duplicate_: same failure mode as the `minutes` row of the range `it.each` and the kept 45..90 case
- **leaves a 5..10 jours ouvres range unchanged** — _duplicate_: the range `it.each` already covers `jours_ouvres`
- **uses count 1 for a single value of one so the singular form is picked** — _duplicate_: `count` is the value with no special case for 1; the single `it.each` asserts count
- **collapses a 1-1 range to a single with count 1** — _duplicate_: same collapse as the kept "range whose max equals min" case
- **uses the upper bound as the plural count for a 1-2 range** — _duplicate_: the range `it.each` already asserts `count` equals max

#### `test/unit/delta.test.ts` — 7 → 6

- **always returns a finite pct whenever the previous value is non-zero** — _duplicate_: same input (-100, -50) as the kept negative-baseline case, which already asserts a non-null negative pct

#### `test/unit/money.test.ts` — 7 → 6

- **keeps every digit of the exact figure in fr, uncompacted by notation** — _duplicate_: identical assertion to the en case; formatMontant has no locale branch, so the locale adds no failure mode.

#### `test/unit/order-workspace-store.test.ts` — 7 → 5

- **starts with a recent sort and the fixed page size, and no search or status filter** — _tautology_: mirrors the store's default constants; every other test in the file asserts the same `{ tri: "recent", taille: 50 }` shape with toStrictEqual.
- **updates the sort filter** — _passthrough_: setter then getter with no logic (the one real branch, `?? "recent"`, is not what it tests).

#### `test/unit/periode-bounds.test.ts` — 12 → 11

- **reports granularite %s -> %s** — _tautology_: mirrors the GRANULARITES lookup table; heure, jour and mois are already asserted in the aujourdhui, 7j and 12mois tests.

#### `test/unit/periode.test.ts` — 10 → 4

- **falls back to 30j for an empty string, which is what ?periode= produces** — _duplicate_: same code path as the "bogus" string case (no empty-string special case).
- **falls back to 30j for undefined, a missing query parameter** — _duplicate_: same code path as the null case (no nullish special case).
- **maps aujourdhui to heure** — _tautology_: mirrors the GRANULARITES lookup.
- **maps %s to jour** — _tautology_: mirrors the lookup.
- **maps 12mois to mois** — _tautology_: mirrors the lookup.
- **yields a granularite for every member of PERIODES, so adding a preset without wiring it up fails here** — _tautology_: `Record<Periode, Granularite>` already enforces completeness at typecheck.

#### `test/unit/product-form-values.test.ts` — 10 → 9

- **blanks every scalar when adding a product** — _tautology_: asserts the `?? ""` / `?? null` constants back at themselves for a null product.

#### `test/unit/product-list-store.test.ts` — 4 → 3

- **starts with an all-items recent first page request** — _tautology_: asserts the store's initial constants; the full-reset test asserts the same shape after real mutations.

#### `test/unit/product-status.test.ts` — 4 → 1

- **reports an active, in-stock product as en-stock** — _tautology_: mirrors the STOCK_STATUS lookup table.
- **reports an active, out-of-stock product as rupture** — _tautology_: mirrors the STOCK_STATUS lookup table.
- **reports an active product awaiting restock as reapprovisionnement** — _tautology_: mirrors the STOCK_STATUS lookup table. (The withdrawn-overrides-stock `it.each` is the real logic and stays.)

#### `test/unit/produit-schema.test.ts` — 25 → 24

- **exposes a 20000-character ceiling** — _passthrough_: `expect(FICHE_TECHNIQUE_MAX_LENGTH).toBe(20_000)` is constant equality; the 20000 vs 20001 boundary test in the same block already enforces the limit. Also dropped the now-unused `FICHE_TECHNIQUE_MAX_LENGTH` import.

#### `test/unit/proxy-target.test.ts` — 4 → 2

- **composes a nested path correctly** — _duplicate_: same one-line template as the plain-path test, a longer path adds no failure mode.
- **adds nothing when there is no query string** — _duplicate_: the plain-path test already runs the no-query (default parameter) case.

#### `test/unit/resolve-member-name.test.ts` — 4 → 3

- **returns null against an empty roster (still loading, or truly empty)** — _duplicate_: `find` over an empty array is the same code path as the unknown-id test.

#### `test/unit/stock-export.test.ts` — 28 → 26

- **is the backend's 10,000 product ceiling** — _passthrough_: constant equality (`STOCK_EXPORT_MAX_ROWS` toBe 10000); `exportVolume` tests already cover the 10000/10001 boundary with literals. Empty describe and the `STOCK_EXPORT_MAX_ROWS` import removed.
- **never returns an empty string** — _duplicate_: weak `not.toBe("")` assertion on the same safeBasename-to-fallback path that "falls back when nothing safe remains" and the `falls back when the header is %j` rows already pin exactly.

#### `test/unit/stock-import-files.test.ts` — 8 → 7

- **mirrors the backend limits** — _passthrough_: two constant-equality assertions (2000 rows, 5 MiB). Empty describe and the `STOCK_IMPORT_MAX_*` imports removed.

#### `test/unit/use-object-url.test.ts` — 5 → 1

- **has no url while there is no file** — _composable-limit_: subject is `useObjectUrl`; one kept
- **gives the file a url as soon as it is picked** — _composable-limit_: subject is `useObjectUrl`
- **lets go of the url and clears it when the file is dropped** — _composable-limit_: subject is `useObjectUrl`
- **lets go of the url when whoever asked for it goes away** — _composable-limit_: subject is `useObjectUrl`

### Component and composable specs (`test/nuxt/`)

#### `test/nuxt/admin-navigation.test.ts` — 6 → 5

- **gives preparation orders without the catalogue or customer destinations** — _duplicate_: same filter path and same expected ids as the livreur component test; unit spec already pins preparation's role set

#### `test/nuxt/admin-profile-menu.test.ts` — 7 → 5

- **starts closed** — _framework_: reka-ui dropdown's default closed state
- **opens the nested language dropdown, revealing both locale options** — _duplicate_: the "selects French" test opens the same nested dropdown and needs the fr option present

#### `test/nuxt/admin-shell.test.ts` — 5 → 4

- **opens mobile navigation with the Overview link and dismisses it with Escape** — _framework_: Escape dismissal is reka-ui's; opening the mobile menu is already covered in admin-navigation "offers the same filtered destinations in the mobile menu"

#### `test/nuxt/ai-generation-launcher.test.ts` — 42 → 41

- **opens a panel headed by the assistant's name and nothing else** — _markup_: header text/element; panel opening covered by the open/close test

#### `test/nuxt/banner-artwork-preview.test.ts` — 2 → 1

- **produces the same URL for two instances given the same source and no sizes prop** — _tautology_: mounting the same component twice with identical props in a layout-less env is deterministic regardless of the `sizes` regression it describes; the end-to-end version lives in banner-panel-artwork.test.ts

#### `test/nuxt/banner-card.test.ts` — 11 → 10

- **renders a resized IPX thumbnail of the large image, not the full artwork** — _duplicate_: the card delegates to BannerArtworkPreview, whose own spec asserts the same `/_ipx/` thumbnail; the card's "resizes proportionally" test still reads the same img src

#### `test/nuxt/banner-editor-pill.test.ts` — 20 → 19

- **leaves the crown out for other roles** — _duplicate_: the crown decision lives in BannerEditorCrown and is already covered by the pill's "no crown for any other role"

#### `test/nuxt/banner-filter-bar.test.ts` — 8 → 7

- **does not show a reorder hint when a filter narrows the grid** — _tautology_: asserts absence of `banner-filter-reorder-hint`, which no longer exists anywhere in app/; cannot fail

#### `test/nuxt/banner-form-layout.test.ts` — 21 → 14

- **has no status beside it: whether the banner is published is the footer switch's business** — _tautology_: asserts absence of `banner-form-status`, which no longer exists anywhere in app/; cannot fail (also removed the now-unused STATUS const)
- **is titled, so nobody has to guess what it is, and says it is optional** — _tautology_: static label copy mirrored from the locale file, no conditional logic
- **titles the %s field at its top as %s** — _tautology_: static label copy mirrored from the locale file
- **marks the large artwork as required, as the phone artwork is marked optional** — _tautology_: static "Required" copy mirrored from the locale file
- **is just the count and the limit** — _duplicate_: "follows what is typed" asserts the same `n/400` format after input
- **sits above the text box, in the field's header** — _markup_: DOM source order via compareDocumentPosition
- **speaks French on the new controls** — _framework_: i18n key lookups only; locale key parity is already gated by `bun run i18n:check` (also removed the now-dead `locale.value = "en"` reset in afterEach)

#### `test/nuxt/banner-info-tips.test.ts` — 4 → 3

- **adds no drag instructions under the heading, even when the group can be reordered** — _tautology_: asserts absence of the text "Drag a banner by its handle", which exists nowhere in app/ or i18n/; second assertion duplicates the hint-hidden check of the it.each test (also removed the now-unused makeBanner helper)

#### `test/nuxt/banner-mutations.test.ts` — 8 → 2

- **creates a promo banner from the large artwork alone, sending no mobile part** — _composable-limit_: useBanniereMutations keeps its single create test; this behaviour is also covered at component level in banner-edit-save
- **removes the mobile artwork with DELETE on its image route, and invalidates the list** — _composable-limit_: second test of useBanniereMutations
- **sends only the given patch as JSON and invalidates the list** — _composable-limit_: third test of useBanniereMutations
- **sends the replacement file under field fichier to the variante-specific path, and invalidates the list** — _composable-limit_: fourth test of useBanniereMutations
- **sends { emplacement, ids } as JSON and invalidates the list** — _composable-limit_: fifth test of useBanniereMutations
- **sends DELETE and invalidates the list** — _composable-limit_: sixth test of useBanniereMutations (also removed the now-unused `readBody` import)

#### `test/nuxt/banner-panel-details.test.ts` — 8 → 4

- **names the editor and shows their initials on the avatar** — _duplicate_: the same assertions live in banner-editor-pill's "names the editor and shows their initials", and the "Last edit by" regex test already checks initials plus name in the rail
- **does not fetch a picture from anywhere: there is none to show, so initials it is** — _markup_: asserts no `<img>` element exists
- **speaks French when the panel does** — _framework_: i18n key lookups only (also removed the now-unused `flushPromises` import and the dead locale reset in afterEach)
- **sits at the end of the details, as their last row** — _markup_: DOM position (`lastElementChild`)

#### `test/nuxt/catalogue-caisse-api.test.ts` — 6 → 4

- **keeps caisse list, detail, and mutation response contracts independent** — _coverage_: only `expectTypeOf`, a runtime no-op (no vitest typecheck configured); matches hand-built literals against hand-written types
- **models the bounded catalogue ingestion and proposal query contracts** — _coverage_: same, type-level only, cannot fail at runtime

#### `test/nuxt/category-product-card.test.ts` — 5 → 4

- **puts the price and the stock badge on one row, price first** — _markup_: asserts DOM parent and document order only

#### `test/nuxt/customers-api.test.ts` — 4 → 2

- **fetches the customer annuaire with server filters, page one, and the fixed page size** — _composable-limit_: second test for `useCustomers`; kept the pagination test (real getNextPageParam logic)
- **fetches the selected customer account detail without exposing a legacy profile-only shape** — _composable-limit_: second test for `useCustomer`; also a mock echo; kept the enabled-only-when-selected test

#### `test/nuxt/delivery-interval-mutations.test.ts` — 5 → 4

- **rejects a 409 unchanged and invalidates nothing** — _composable-limit_: second test for `useCreateDeliveryInterval`; the error path is vue-query behaviour plus `toApiError`

#### `test/nuxt/delivery-interval-query.test.ts` — 2 → 1

- **goes into error state without data when the endpoint returns 500** — _composable-limit_: second test for `useDeliveryIntervals`; mostly vue-query's isError semantics

#### `test/nuxt/download-file.test.ts` — 4 → 3

- **keeps the order export download observable behaviour** — _passthrough_: `downloadOrderExport` only calls `downloadBlob`, which the first test covers

#### `test/nuxt/info-tip.test.ts` — 3 → 2

- **is an icon alone, named for assistive tech rather than by visible text** — _duplicate_: default aria-label already asserted by "names itself More information..."; the empty-text check is markup

#### `test/nuxt/message-avatar.test.ts` — 6 → 5

- **shows a human's initials from their email when present** — _duplicate_: email+name both give "AN", so it cannot tell the email path from the name path; the visiteur-initials component test and the initialsFromEmailOrName unit spec already cover it.

#### `test/nuxt/orders-api.test.ts` — 10 → 3

- **forwards q, tri, statut, and taille from the filters into the request query, together with the page** — _composable-limit_: useOrders keeps one test (pagination walk).
- **forwards clientId together with the normal first-page parameters when scoping the list to one customer** — _composable-limit_: same.
- **reports no next page and never issues a further request once the first page is already the last one** — _composable-limit_: same; the kept pagination walk already asserts hasNextPage flips to false on the last page.
- **surfaces a preparation-role order response with financier-only fields entirely absent** — _composable-limit_: same; also tautology, since the mock returns X and the test asserts X came back (no filtering logic in the composable).
- **fetches an order detail by reference** — _composable-limit_: useOrder keeps one test ("does not request order detail until a reference is selected"), which also asserts the fetch once selected.
- **refetches the order list when the store's filters change** — _composable-limit_: useOrders keeps one test; mostly vue-query key reactivity.
- **confirms and collects payment through their separate admin endpoints** — _composable-limit_: useOrderMutations keeps one test (advance).

#### `test/nuxt/orders-confirm-conflict-names.test.ts` — 5 → 4

- **shows the product name when the map has the slug and the slug otherwise** — _duplicate_: same props and assertions as the dialog test "falls back to the slug for a product the map does not name", one layer lower.

#### `test/nuxt/orders-detail-skeleton.test.ts` — 2 → 1

- **mirrors the 2-column Command Center operational layout** — _markup_: seven data-testid existence checks, pure DOM structure.

#### `test/nuxt/orders-filter-bar.test.ts` — 4 → 3

- **renders the status filter inline alongside search and sort, not tucked behind a menu** — _markup_: counts "Remove filter" elements and recomputes the expected count from the fixture length.

#### `test/nuxt/orders-list-panel.test.ts` — 4 → 3

- **shows every loaded order when no date range is set** — _duplicate_: "renders the annuaire rows and emits the selected reference" already shows every loaded row with no dateRange, and order-date-range.test.ts covers the no-range path in the util.

#### `test/nuxt/orders-page-tabs.test.ts` — 3 → 2

- **renders the orders filters below the title and tabs, not in the header toolbar** — _markup_: DOM position via compareDocumentPosition and absence of a toolbar element.

#### `test/nuxt/overview-pricing.test.ts` — 3 → 2

- **explains the optional discount window in a tooltip beside each date label, not in a paragraph** — _markup_: parent/child element placement and tooltip element count.

#### `test/nuxt/points-of-sale-api.test.ts` — 3 → 1

- **reads the administration list, closed counters included** — _tautology_: usePointsVente is a bare useQuery; the mock returns `rows` and the test asserts `rows` came back. Also composable-limit-adjacent: it is the only test for that composable and it has no logic to protect.
- **sends each write as JSON to its route and invalidates the list** — _composable-limit_: usePointVenteMutations keeps one test (the optimistic reorder, which is real logic: onMutate + sortByIds).

#### `test/nuxt/points-of-sale-form.test.ts` — 10 → 9

- **keeps step headings screen-reader-only and puts identity help behind muted label info buttons** — _markup_: asserts `sr-only` / `text-muted-foreground` classes and the presence of info buttons; no behavior.

#### `test/nuxt/product-inventory-action-bar.test.ts` — 19 → 18

- **carries the Stock movements heading and the adjust action** — _markup_: static heading text plus an adjust-button-exists check that every adjusting test already relies on and the "until the first page has loaded" test asserts after load. (Also removed the now-unused `BAR` constant.)

#### `test/nuxt/product-inventory-panel.test.ts` — 20 → 12

- **has exactly the columns Date, Type, Variation, Balance, Reason, By, Order, in that order** — _markup_: header-cell structure and count.
- **tells assistive tech the movement in words** — _duplicate_: "From 37 to 42" is already asserted on the row's balance cell in "renders one table row per movement".
- **carries the translated movement type** — _duplicate_: Reception / Correction are asserted in "renders one table row per movement" and Order confirmed in "shows the order reference of a movement caused by an order".
- **shows an em dash with no title when there is no reason** — _duplicate_: the em dash for a missing reason is asserted in "shows an em dash for a missing reason and a missing order reference"; the extra "no title" check is attribute markup.
- **puts the system pill in the By cell for a system movement** — _passthrough_: prop forwarding to the actor pill; system vs team behavior is covered in product-inventory-actor-pill.test.ts.
- **renders no arrow character in any row** — _duplicate_: same `not.toMatch(/→|->/)` check as "balance cell > shows before and after with an icon instead of an arrow character", on a second row.
- **carries no quantity, status, updated text, skeleton, action or heading of the old summary** — _markup_: absence of removed testids; the comptoir test already asserts no adjust/restocking control.
- **says how many of the total movements are shown** — _duplicate_: "Showing 3 of 3 movements." is asserted after load-more in the paging spec ("counts the loaded movements against the total").

#### `test/nuxt/products-ai-suggestions.test.ts` — 28 → 27

- **shows the AI generate control to a direction user** — _duplicate_: ~25 other tests in the file `get(GENERATE)` as direction and click it; the non-direction test remains as the authorization check.

#### `test/nuxt/products-delivery-dialog.test.ts` — 14 → 13

- **locks a single-value option that is in use** — _duplicate_: lock is a single `utilise_par > 0` computed, identical for single and range; "explains and locks the value fields of an option products already use" covers every locked control. (Also removed the now-unused `IN_USE_OPTION` import.)

#### `test/nuxt/products-delivery-picker.test.ts` — 12 → 11

- **offers add and manage actions in the opened list** — _duplicate_: only checks the two buttons exist plus a truthy aria-label; the next two tests ("opens the manage dialog", "creates an option from the add button") click those exact buttons and assert the outcome.

#### `test/nuxt/products-detail-form-stock-refetch.test.ts` — 8 → 7

- **stays on the Stock tab when only the stock fields change** — _duplicate_: same assertions (panel visible, overview hidden) are made by "keeps a pending name edit when a stock movement is posted..." and the sibling History-tab "stays on the tab the operator switched to" test exercises the identical watcher.

#### `test/nuxt/products-detail-form-stock-tab.test.ts` — 15 → 11

- **shows no action bar before the Stock tab is opened** — _duplicate_: same `activeTab === "stock"` condition is asserted by "removes the action bar when switching to Overview or History and brings it back on Stock", and "does not mount the inventory panel or request inventory while on Overview" covers the lazy-mount concern.
- **has no action bar in create mode** — _duplicate_: create mode has no Stock tab / no panel (asserted by "has no Stock tab in create mode and keeps the History tab"), so the bar cannot exist; adds no failure mode.
- **carries no quantity or status summary on the Stock tab** — _markup_: asserts absence of four data-testid elements; a design-removal pin with no behavior behind it.
- **renders the bar slot content inside the sticky header, below the tabs** — _markup_: DOM containment and `compareDocumentPosition` ordering of a slot; pure structure. Its describe block, its afterEach and the unused `ProductsDetailHeader` import were removed with it.

#### `test/nuxt/products-detail-form.test.ts` — 39 → 38

- **offers the Stock tab, and its inventory panel, for a saved product only** — _duplicate_: products-detail-form-stock-tab.test.ts already asserts tab list per mode ("orders the tabs...", "has no Stock tab in create mode...") and panel visibility ("shows the panel and hides the overview once the Stock tab is opened").

#### `test/nuxt/products-filter-bar.test.ts` — 7 → 6

- **renders one chip per filter inline** — _markup_: counts "Remove filter" elements and checks the wrapper testid exists; every other test in the file already depends on the bar rendering. Its explanatory JSDoc removed with it.

#### `test/nuxt/products-history-entry.test.ts` — 13 → 12

- **labels the %s field as %s** — _tautology_: mirrors the i18n label table (`products.historyEntry.fields.*`) back at itself; the logic we own (fallback to the raw key) stays covered by "falls back to the raw key for a field it has no label for".

#### `test/nuxt/products-list-panel.test.ts` — 9 → 8

- **emits updated filters when clicking quick status buttons** — _duplicate_: strict subset of the `it.each` "scopes the %s pill to its own lifecycle state", whose "In stock" row clicks the same pill and asserts the emitted filters (and uses optional chaining that could make this one vacuous).

#### `test/nuxt/products-local-preview.test.ts` — 3 → 2

- **renders a data: preview as a plain image too** — _duplicate_: same `provider="none"` path as the blob: test; the test's own comment says the form never produces a data: URL, so it pins an input that does not occur.

#### `test/nuxt/products-overview-stock-indicator.test.ts` — 12 → 10

- **formats the quantity for the current locale** — _framework_: component is `new Intl.NumberFormat(locale).format(n)`; the test only checks that Intl groups 1234 as "1,234".
- **is read-only for direction: the switch is always disabled** — _duplicate_: the switch has a hardcoded `disabled`; "never writes when the %s switch is clicked" asserts the real outcome (no write, state unchanged) and the comptoir test asserts the disabled attribute again.

#### `test/nuxt/products-taxonomy-ssr.test.ts` — 1 → 0 (file deleted)

- **has the category picker's taxonomy available for its first render** — _framework_: seeds the vue-query cache and asserts `useTaxonomie()` returns it synchronously (vue-query behavior; it cannot exercise SSR), then asserts the picker shows "Office", which products-overview-pickers.test.ts already covers. File had one test, so the file was deleted (nothing imports a *.test.ts).

#### `test/nuxt/products-workspace.test.ts` — 11 → 10

- **shows Restocking in the list for a product awaiting restock** — _duplicate_: products-list-panel.test.ts "badges a non-withdrawn product awaiting restock as Restocking" asserts the same row text on the same component.

#### `test/nuxt/produit-mutations.test.ts` — 6 → 1

- **invalidates every product list on create, since a new product can appear in any of them** — _composable-limit_: useProduitMutations already has one kept test.
- **invalidates both the product's own detail and every list on withdraw** — _composable-limit_: one test per composable.
- **invalidates both the product's own detail and every list on restore** — _composable-limit_: one test per composable.
- **invalidates both the product's own detail and every list after an image upload** — _composable-limit_: one test per composable.
- **invalidates both the product's own detail and every list after an image delete** — _composable-limit_: one test per composable. (The unused imports useCreateProduit, useDeleteProduitImage, useRestoreProduit, useUploadProduitImage, useWithdrawProduit were removed.)

#### `test/nuxt/proposal-workspace.test.ts` — 9 → 8

- **uses semantic badge variants for proposal types and statuses** — _markup_: asserts `data-variant` values and which container holds the badge (DOM placement); the disparition/destructive and status/warning variants are still asserted incidentally in the history-page test.

#### `test/nuxt/quotes-api.test.ts` — 4 → 2

- **loads a quote detail by reference** — _tautology_: endpoint returns `detail`, test asserts `detail` came back; it only exercises TanStack Query. Dropped the `useQuote` and `RefreshQuoteResult` imports.
- **refreshes a quote without inventing a write payload** — _composable-limit_: useQuoteMutations keeps its single higher-value test (archive + invalidation).

#### `test/nuxt/quotes-detail-skeleton.test.ts` — 2 → 1

- **mirrors the 2-column Command Center operational layout** — _markup_: six `data-testid` existence checks on a skeleton, pure DOM structure.

#### `test/nuxt/spinner.test.ts` — 6 → 4

- **is driven by one size variable that grows from xs to lg, so every part scales with it** — _markup_: inspects the `--ld-size` CSS custom property.
- **keeps four dots in the ring and carries no pixel sizes of its own** — _markup_: counts `<i>` elements and inspects inline style. The now-empty `describe("spinner sizing")` was removed.

#### `test/nuxt/stats-blocks.test.ts` — 6 → 5

- **does not render the removed monthly-goal feature** — _markup_: pins the absence of text and a test id for a deleted feature; no behavior behind it.

#### `test/nuxt/stock-export-run.test.ts` — 12 → 1

- **starts idle with no error** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **makes exactly one GET carrying the filters, mode and format** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **strips page and taille even when the passed filters carry them** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **saves the file under the name from Content-Disposition** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **falls back to stock-<mode>.<format> when the response names no file** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **does not save a file named by a path-traversal Content-Disposition** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **explains the 10,000 product ceiling in the UI's language and returns false without saving** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **surfaces the backend's message from a Blob-encoded error body** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **gives a non-empty error for a 403 without a message** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **gives a non-empty error for a 500 and does not retry it** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.
- **clears the previous error at the start of the next export** — _composable-limit_: `useStockExport` keeps one test (a second export is ignored while the first is pending); the others exercised the same composable and were over the one-test-per-composable limit.

#### `test/nuxt/stock-import-page.test.ts` — 7 → 5

- **places product filters below the title and action buttons** — _markup_: parentElement / nextElementSibling layout assertions.
- **lets direction open a stock export from the products header, before the import button** — _markup_: DOM order via `compareDocumentPosition` and row containment; the export button's presence for direction is exercised by the "exports the list's current filters" test, and its absence for comptoir by its own test.

#### `test/nuxt/stock-import-run.test.ts` — 35 → 1

- **sends one keyless multipart preview request and lands on the preview without a result** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **reports previewing while the request is in flight** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **does nothing for a session without the direction role** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **invalidates nothing after a successful preview, because nothing was written** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **classifies a file-level 400 as a rejected preview failure, with no invalidation and no retry** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **aborts the in-flight request and returns to idle** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **is still a no-op while an apply is submitting** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **is a no-op before any preview and while idle** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **is a no-op when the preview has nothing to apply** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **is a no-op after a failed preview** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **sends the same file, mode and motif without apercu=true and with a fresh uuid key, then yields the result** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **ignores a second apply while the first is in flight** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **invalidates products and overview exactly once, and only after the apply** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **does not invalidate after a rejected apply, and keeps no result** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **keeps a 429 on apply retryable with nothing invalidated** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **invalidates once after a retryable 503 apply because rows may have been committed** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **treats a 409 importation_en_cours as in progress and lets retry reuse the key** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **retry is a no-op after a rejected apply** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **retry is a no-op when nothing failed** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **uses a new key for each review+apply pair, including after reset** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **starts with the flag off: neither the first preview nor the apply carries inclure_stock_modifie** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **re-previews once with the flag, apercu and the same file, mode and motif, then stays in preview** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **applies with the flag, no apercu and a fresh uuid key** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **retries a failed apply with the same key and the same flag** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **stops sending the flag once toggled back off** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **makes no request when the value is already in effect** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **is ignored while previewing** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **is ignored while submitting** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **is ignored when idle** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **is ignored once a result exists** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.
- **lands in failed (preview phase) when the re-preview errors, and retry re-sends the preview with the flag** — _composable-limit_: `useStockImportRun` keeps one test (a retry after a 502 apply re-sends the same file and the SAME idempotency key); the others exercised the same composable and were over the one-test-per-composable limit.

Three more removals from this file have templated titles and are not listed individually.

#### `test/nuxt/stock-import-views.test.ts` — 17 → 16

- **resolves every child component without a Vue warning** — _coverage_: weak "no console message contains 'Failed to resolve component'" check; the row test already fails if a child component does not render. Dead code removed with it: `logged` array, `beforeEach` console spies, `afterEach(vi.restoreAllMocks)`, and the `afterEach`/`beforeEach`/`vi` imports.

#### `test/nuxt/taxonomy-api.test.ts` — 7 → 2

- **patches only changed category fields and invalidates shared taxonomy and products** — _composable-limit_: subject is `useTaxonomyMutations`; one kept (create category)
- **deletes a category through the BFF and invalidates shared data** — _composable-limit_: subject is `useTaxonomyMutations`
- **creates a department through the BFF and invalidates shared data** — _composable-limit_: subject is `useTaxonomyMutations`
- **deletes a department through the BFF and invalidates shared data** — _composable-limit_: subject is `useTaxonomyMutations`
- **sends the %s command and invalidates taxonomy and products after success** — _composable-limit_: subject is `useTaxonomyMutations`

#### `test/nuxt/taxonomy-products-infinite.test.ts` — 16 → 15

- **has no load-more button** — _markup_: asserts `findAll("button")` has length 0, an element count with no behavior behind it

#### `test/nuxt/taxonomy-recalculate-action.test.ts` — 4 → 3

- **renders the design-system button, so its variant actually applies** — _markup_: asserts the `data-slot="button"` attribute, a DOM detail; emit, disabled and error behavior are covered by the other tests

#### `test/nuxt/team-api.test.ts` — 4 → 2

- **fetches the team annuaire with search, role, activity, sort, page, and size** — _composable-limit_: subject is `useTeam` (useTeam.ts); the pagination-walk test is kept. Also removed the now-unused `useTeamMember` import.
- **fetches a selected member detail independently from the directory** — _composable-limit_: subject is `useTeamMember`, exported from the same file `useTeam.ts` that already keeps one test

#### `test/nuxt/tooltip-icon-button.test.ts` — 4 → 3

- **can be disabled** — _duplicate_: same `v-bind="$attrs"` forwarding as "hands attributes and clicks to the button itself", no new failure mode
