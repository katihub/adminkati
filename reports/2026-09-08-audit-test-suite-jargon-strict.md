# Audit: trivial / jargon tests in the Vitest suite — stricter re-pass

## Question

The suite grew from 100 to 109 files (69 `test/nuxt/`, 40 `test/unit/`; 521 top-level `it`/`test`
occurrences) between the [first jargon audit](./2026-09-08-audit-test-suite-jargon.md) — whose
findings are already implemented and merged — and this request. The user asked for the same
question re-run with a **stricter, less charitable** bar: which tests check something other than
functionality, business logic, robustness, or a security/authorization boundary, now also treating
as CUT-worthy: exact DOM/element counts, kitchen-sink tests bundling one real assertion with three
or more incidental ones (when the real assertion is covered elsewhere), tautologies that recompute
an expected value via the same source data or the same app function the component itself uses,
tests that check only that two renders "differ" without asserting what differs, and CSS-observable
decisions even when they are data-driven.

## Method

Six parallel read-only subagents each covered ~18 files (all 109), applying the stricter rubric
above and one added instruction: unit-test groups were told to flag pure happy-path schema tests as
BORDERLINE when stronger edge-case tests already exist, and the group covering
session/proxy/auth/supabase files was told to apply the opposite scrutiny — do not cut a real
authorization or leak-prevention test because it looks simple.

As in the first audit, **no subagent output was trusted at face value.** Every group's own
summary-line count disagreed with its own itemized list in at least one place (example: Group A's
trailing summary read "CUT 9" while only 8 lines were actually itemized as CUT — the itemized list,
cross-checked against the file, was the one used). Every single flagged CUT/BORDERLINE line across
all six groups was independently re-verified by this pass: `grep -n` for the file's real `it(...)`
line numbers (which differed from the subagent-reported numbers by 1–4 lines in most files), then
reading the actual test body and judging it against the rule below, not the subagent's stated
reason.

> A test earns CUT when what it verifies is **how something looks or sits**, an **exact count** with
> no branching logic behind it, a **duplicate** of an assertion already made elsewhere, a check that
> two things merely **differ** without saying how, or a **tautology** — recomputing the expected
> value from the same fixture array or the same app function the component itself calls. A test
> survives when it exercises a **decision** — permission gating, conditional fallback, a ranking or
> pricing algorithm, data-to-display mapping, pagination/lazy-loading gating, or a regression guard
> against a previously-removed feature reappearing — even if that decision is only observable
> through a DOM attribute, a semantic `data-*` value, or a short string.

This pass **overturned roughly as many subagent CUT/BORDERLINE calls as it confirmed** — see
"Overturned" below. The most common reason for reversal: the subagent classified a conditional
decision exposed via a `data-*` attribute (severity ranking, primary-action gating, non-reactive
title, removed-feature guard) as "presentational" because the attribute happens to also drive
styling, when the actual thing under test was the decision logic, not the styling.

## Summary

| | Count |
| :-- | --: |
| Files covered | 109 (69 `test/nuxt/`, 40 `test/unit/`) |
| New test cases confirmed CUT | 19 |
| New test cases confirmed BORDERLINE (trim, don't delete) | 2 |
| Subagent-flagged CUT/BORDERLINE calls independently overturned back to KEEP | 17 |
| New BROKEN tests found | 0 (not independently re-verified across all 109 files — see Scope limits) |

Of the 19 CUT, 6 are in `test/unit/` (schema/store/util tests) and 13 are in `test/nuxt/`. Three of
the six `test/unit/` items are inside a single file (`banniere-schema.test.ts`), all variations on
the same problem: a nested `describe("href")` block duplicates the standalone `hrefSchema` tests,
and two tests assert nothing beyond Zod's own boolean acceptance.

## Confirmed CUT — delete these

| # | File : line | Test title | Why |
| --: | :-- | :-- | :-- |
| 1 | `test/nuxt/banner-artwork-field.test.ts:143` | "crops the large preview at the focus picker's current value, updating live as it's adjusted" | asserts only an inline `object-position` CSS value; no non-styling observable exists in this test |
| 2 | `test/nuxt/banner-artwork-preview.test.ts:24` | "crops at the given focus point instead of the browser's default center crop" | same — inline CSS value only |
| 3 | `test/nuxt/banner-card.test.ts:67` | "crops the thumbnail at the banner's focus point, not a default center crop" | same — inline CSS value only |
| 4 | `test/nuxt/banner-filter-bar.test.ts:71` | "shows the plural result count for multiple matching banners" | a numeric prop rendered into text; no pluralization logic, just pass-through |
| 5 | `test/nuxt/banner-filter-bar.test.ts:77` | "shows the zero-result copy when nothing matches" | literal UI copy, same prop-to-text pass-through as #4 |
| 6 | `test/nuxt/banner-grid-states.test.ts:103` | "gives the no-results state different copy from the zero-banners empty state" | only asserts the two renders are *not equal*; doesn't say what differs, so two wrong strings would also pass |
| 7 | `test/nuxt/banner-grid-states.test.ts:121` | "renders one banner card per banner once data has loaded" | exact `v-for` count with no identity check (a banner/card mismatch wouldn't be caught by count alone) — reverses this exact test's "keep for consistency" call in the first audit; see note below |
| 8 | `test/nuxt/banner-panel-artwork.test.ts:52` | "shows only the large artwork — no mobile preview" | unconditional layout fact — no prop varies in this test, it's a fixed DOM-shape check |
| 9 | `test/nuxt/orders-detail-workspace.test.ts:277` | "keeps the header a slim bar — reference, status, and actions only, not the summary fields" | same — unconditional DOM-shape/placement check, no prop varies |
| 10 | `test/nuxt/quotes-detail-workspace.test.ts:179` | "keeps the header a slim bar — reference, status, and actions only" | same pattern as #9, same file family |
| 11 | `test/nuxt/products-image-gallery.test.ts:66` | "opens an add-image dialog with a decorative drag-and-drop file picker alongside the URL input" | only checks the dialog's children exist after opening; no file/URL interaction exercised (the next test in the file already covers the real add-via-URL behavior) |
| 12 | `test/nuxt/orders-filter-bar.test.ts:59` | "scrolls the status option list instead of overflowing the popover" | asserts a Tailwind `.overflow-y-auto` class exists — a CSS class check, despite the explanatory comment above it |
| 13 | `test/nuxt/products-list-panel.test.ts:60` | "renders each row with only its image, name, status pill, and category pill" | imports and calls `deriveProductStatus` — the app's own status-derivation function — to compute the expected `data-status`; a textbook tautology per AGENTS.md's own rule |
| 14 | `test/unit/banner-filters.test.ts:53` | "matches the search term regardless of the case it was typed in" | duplicate of line 49's case-insensitivity assertion (same fixture, same expected output, only the input's casing differs) |
| 15 | `test/unit/customer-workspace-store.test.ts:28` | "returns search and selection to defaults on full reset" | tests Pinia's own `$reset()` mechanism against the store's declared initial state, not app logic |
| 16 | `test/unit/local-storage.test.ts:30` | "returns null for a key storage has never seen" | tests the native `Storage.getItem` contract (already null for a missing key); the adjacent tests cover the wrapper's actual added logic (absent global, throwing storage) |
| 17 | `test/unit/banniere-schema.test.ts:73` | "accepts an internal category path" (nested inside `banniereSchema`'s `href` describe) | byte-for-byte duplicate of the standalone `hrefSchema` test at line 27; the nested block's own reject-case tests already prove the field is wired to `hrefSchema` |
| 18 | `test/unit/banniere-schema.test.ts:189` | "accepts active: true" | tests Zod's own boolean acceptance on a plain optional boolean field — no business constraint involved |
| 19 | `test/unit/banniere-schema.test.ts:195` | "accepts active: false" | same — complementary branch of #18, same issue |

**Note on #7:** the first audit's report explicitly reclassified this exact test from CUT to KEEP,
reasoning it was "a standard list-rendering-count assertion, the same pattern used throughout the
KEEP-rated `orders-status-filter-pills.test.ts`." This pass reverses that call because the stricter
rubric explicitly targets exact-count assertions with no identity/correspondence check, and the
user asked for a tougher bar this round. **This is a deliberate policy change for this pass, not an
oversight** — `orders-status-filter-pills.test.ts`'s own count-based tests were not independently
re-verified in this round (no subagent flagged them) and are therefore not touched here, which is an
inconsistency the user should be aware of before deciding whether to apply this reasoning suite-wide.

## Confirmed BORDERLINE — trim, don't delete

| File : line | Test title | Keep | Drop |
| :-- | :-- | :-- | :-- |
| `test/nuxt/admin-profile-menu.test.ts:30` | "opens with the static Admin identity and a nested language dropdown" | clicking the trigger opens the nested language dropdown, revealing both locale options | the literal "Admin" text check, and the existence-only checks for the preferences container and the theme-toggle/language-switcher-trigger nodes |
| `test/nuxt/products-workspace.test.ts:195` | "keeps search inside the inline filter bar and synchronizes it with the list query" | `useProductListStore().filters.q` reflects the typed search term | the DOM-containment checks (`filterRow.element.contains(...)`, `workspaceSidebar.element.contains(...)`) and the negative-text checks ("not Department", "not Brand") — layout/positioning, not the store-sync decision the title names |

## Overturned — subagent flagged, this pass disagrees and keeps as-is

Each of these was flagged CUT or BORDERLINE by a subagent. Direct reading of the test body found a
real decision behind the DOM/attribute observable, not styling:

| File : line | Test title | Why it stays |
| :-- | :-- | :-- |
| `test/nuxt/admin-navigation.test.ts:83` | "shows direction every destination" | establishes the unfiltered baseline (full navigation list, in order) that the adjacent role-restricted tests are relative to; `desktopIds()` reads real rendered DOM, it isn't recomputed via the component's own filtering function |
| `test/nuxt/category-toolbar.test.ts:63` | "keeps search permanently inline" | tests that the search filter's remove control is intentionally absent — the same non-removable-search business rule kept elsewhere in `banner-filter-bar.test.ts` |
| `test/nuxt/orders-action-bar.test.ts:19` | "colors the same target status differently depending on what else is on offer in the current status" | `data-severity` encodes a real contextual ranking algorithm (documented in the test's own comment) — the same target transition is destructive in one context and downgrades to warning in another; the attribute happens to drive color, but the decision under test is the ranking, not the color |
| `test/nuxt/orders-detail-workspace.test.ts:201` | "falls back to the placeholder icon when the product has no photo" | the complementary branch of the adjacent kept test ("shows the product's photo… once it loads") — testing both sides of a conditional is exactly the coverage this suite wants |
| `test/nuxt/orders-payment-dialog.test.ts:24` | "is the primary action only at the money-changes-hands stages…" | `data-variant` encodes when the payment action should out-rank or defer to the order's real primary transition — a business rule, not a styling choice |
| `test/nuxt/orders-filter-bar.test.ts:36` | "renders the status filter inline alongside search and sort, not tucked behind a menu" | asserts every non-search filter is individually removable/inline rather than hidden behind an overflow menu — an architecture/discoverability guarantee, not decoration |
| `test/nuxt/products-filter-bar.test.ts:50` | "renders one chip per filter inline" | same pattern and same reasoning as the row above; kept for consistency with it |
| `test/nuxt/products-workspace.test.ts:128` | "keeps the page header title static even when a product with its own name is selected" | selects a specific named product and asserts the title does *not* reflect it — a real non-reactivity regression guard, not a fixed/unconditional layout fact |
| `test/nuxt/quotes-detail-workspace.test.ts:190` | "renders the Basic Details bar with the quote's real fields" | thin (one assertion) but real: confirms the panel is bound to the actual `quote` prop rather than a stale or hardcoded value |
| `test/nuxt/stats-blocks.test.ts:76` | "does not render the removed monthly-goal feature" | a regression guard against a previously-removed feature reappearing — explicitly not styling, not a tautology |
| `test/nuxt/stats-blocks.test.ts:86` | "renders the catalogue summary's numeric values, with categories under the profit column" | verifies real fixture numbers (46, 4,273, 101, 12) reach the correct testids, including a specific data-relocation fix (categories moved under profit); not a CSS/position-only check |
| `test/nuxt/stats-blocks.test.ts:101` | "renders every tier from the payload rather than from fixed markup" | asserts specific fixture values (order number, product name, top-seller name) reach the render — the "from payload, not fixed markup" framing is exactly the data-vs-hardcoded regression this file is guarding |
| `test/nuxt/taxonomy-components.test.ts:152` | "lazily fetches every category product page and renders the required card details" | rich functional coverage: lazy-load gating (no request before the tab is opened), request query params, data-to-card mapping, `href` navigation construction, and pagination — none of this is jargon |
| `test/nuxt/products-detail-form.test.ts:95` and `:137` | "renders the overview inputs empty in add mode" / "…populated…in edit mode" | large (12–15 expects) but not a kitchen sink in the banned sense — nearly every assertion maps real product data to a form value (price formatting, category-exclusion logic, image thumbnail count, slug visibility); the "8+ expect ⇒ split" heuristic doesn't apply when almost all the expects are independently meaningful |
| `test/unit/banniere-schema.test.ts:67` | "accepts a complete valid payload" | the file's baseline/anchor: every subsequent boundary test mutates this exact payload, so this is not redundant — it's the precondition the other tests' meaning depends on |
| `test/unit/categorie-schema.test.ts:20` | "accepts a root category with its department" | same anchor reasoning as the row above |
| `test/unit/produit-schema.test.ts:13` | "accepts a minimal payload carrying only the required nom and prix" | tests the app's own choice of which fields are required — a real schema-shape decision, not something Zod gives you for free |

## Files reviewed clean (0 CUT/BORDERLINE, this pass or subagent-flagged)

All of `test/unit/`'s session, proxy, auth, and supabase files — the group covering them was told to
apply *extra* scrutiny in favor of keeping real authorization/leak-prevention tests, and none came
back flagged. The remainder of both groups' 109 files not named above returned no findings from any
subagent and were not independently re-opened by this pass (see Scope limits).

## Recommendation

1. **Delete the 19 confirmed CUT cases** listed above.
2. **Trim the 2 BORDERLINE cases** per the Keep/Drop table — remove the listed incidental
   assertions, keep the test and its behavioral assertion, rename titles that no longer match after
   the trim.
3. **Do not act on any of the 17 "Overturned" rows** — they were flagged by the raw subagent output
   but every one held up on direct reading as a real decision, not jargon.
4. **Decide on the `banniere-schema.test.ts` nested-`describe("href")` duplication as a separate,
   larger question**, not resolved by this pass: only the "accepts an internal category path" case
   inside the nested block was flagged (and is in the CUT list), but the same nested block also
   repeats all 5 of `hrefSchema`'s other boundary/reject cases verbatim. A full de-duplication
   (keep one reject case to prove wiring, drop the rest) would remove more lines than this audit
   flagged; that's a restructuring decision, not a single-line jargon cut, so it's surfaced here but
   left to the user.
5. **Note the `orders-status-filter-pills.test.ts` inconsistency** flagged under CUT #7 above before
   treating "exact DOM count" as a blanket rule for this codebase — it wasn't re-verified this round.
6. This report adds to, not replaces, the first audit's cuts — none of the first audit's already
   -implemented deletions are revisited here except CUT #7, which is called out explicitly above.

## Outcome — implemented

The user authorized this pass's findings after reviewing the report. Both actions landed:

1. **Deleted all 19 confirmed CUT cases.** No file ended up with zero remaining tests, so unlike the
   first audit's outcome, no file was deleted outright this time.
2. **Trimmed both BORDERLINE cases** per the Keep/Drop table, and renamed both titles to match what
   the trimmed test now actually asserts:
   - `admin-profile-menu.test.ts` — "opens with the static Admin identity and a nested language
     dropdown" → "opens the nested language dropdown, revealing both locale options."
   - `products-workspace.test.ts` — "keeps search inside the inline filter bar and synchronizes it
     with the list query" → "synchronizes the inline filter bar's search input with the list query."
3. **Removed now-unused test scaffolding** left behind by CUT #13: `products-list-panel.test.ts`'s
   `deriveProductStatus` import and its local `expectedTestIds` helper were both used only by the
   deleted test, so both were deleted with it.

None of the 17 "Overturned" rows were touched, per the report's own recommendation.

**Validation:**

- `bunx vitest run` — 109 test files, 544 tests, all passing.
- `bunx eslint <every edited file>` — one `style/padded-blocks` error surfaced in
  `orders-filter-bar.test.ts` (a blank line left before the closing `describe`'s `})` after deleting
  the file's last test); fixed, then clean.
- `bun run typecheck` — clean.
- `bunx fallow audit` — passes on 192 changed files; the one above-threshold finding it reports
  (`KpiCard.vue`'s `badgeText`, pre-existing) is excluded from the gate as inherited, unrelated to
  this pass.

## Scope limits

- Judged by reading test source directly; the suite was not run, and no flaky-test or coverage-delta
  analysis was performed.
- Every subagent-flagged CUT/BORDERLINE/BROKEN line across all six groups was independently
  re-verified against the actual file. Files that came back with **zero** findings from their
  assigned subagent were **not** independently re-opened by this pass — a genuinely stricter,
  from-scratch read of all 109 files (as opposed to re-verifying what six parallel reads already
  surfaced) was out of scope for one pass and would need its own round.
- No new BROKEN (assertion-free) test was reported by any of the six groups. This wasn't
  independently re-confirmed across all 109 files the way the CUT/BORDERLINE items were, so absence
  of a BROKEN finding here is weaker evidence than the CUT list above.
- No test file has been modified in this pass. This is findings only, per the same audit-first
  pattern as the first report — implementation requires a separate go-ahead.
