# Audit: trivial / jargon tests in the Vitest suite

## Question

Which tests in `test/unit/` and `test/nuxt/` check something other than functionality, business
logic, robustness, or a security/authorization boundary — i.e. CSS classes, colors, fonts, exact
DOM positioning, icon presence, snapshot-shaped markup, or tautological/no-op assertions — and
should be cut per AGENTS.md's "What does not get tested" rule?

## Method

This audit ran twice. Both passes read every `*.test.ts` file under `test/unit/` and `test/nuxt/`
in full (100 files, no sampling) via independent, parallel read-only passes, classifying every
`it()`/`test()` case as KEEP, CUT, or BORDERLINE. The second pass did not reuse the first pass's
conclusions — it re-read the files cold and also checked for assertion-free (BROKEN) tests.

The two passes disagreed on roughly a dozen boundary cases — mostly tests that mix a real state/
decision assertion with a presentational one (e.g. "shows the correct filter chip" bundled with an
icon-presence check). Every disagreement, plus every case either pass flagged, was resolved by
reading the actual test file directly rather than trusting either pass's summary. That direct read
reversed several calls from the first draft of this report — see **Corrections from the first
draft** below. The rule applied throughout the reconciliation:

> A test earns CUT when the thing it verifies is **how something looks or sits** (a color, an
> icon's presence, an inline style, exact DOM placement, an exact placeholder count) rather than
> **what the code decided to do** with a given input — even when that decision happens to be simple
> or is only observable through the DOM (which is how Vue components are tested here). A test that
> is a byte-for-byte duplicate of another test's assertion is also CUT, for redundancy rather than
> triviality.

**Not examined:** whether removing the CUT items affects a coverage threshold in CI config; whether
tests exist for currently-uncovered code; `check-translations.test.ts`'s own design (only whether it
tests real logic, not whether the script it tests is well-designed).

## Summary

| | Count |
| :-- | --: |
| Files reviewed | 100 (61 `test/nuxt/`, 39 `test/unit/`) |
| Test cases confirmed CUT | 18 (17 below, plus 1 caught during implementation — see Outcome) |
| Test cases confirmed BROKEN (no assertion) | 1 |
| Test cases confirmed BORDERLINE (trim, don't delete) | 18 |
| Files with zero findings | 76 |

`test/unit/` (pure functions, schemas, stores, proxy/session logic) is almost entirely clean — 2
cases out of 39 files. The jargon is concentrated in `test/nuxt/` component tests, in a recognizable
set of files (banners, products, admin nav/shell, stats-blocks).

## Confirmed CUT — delete these

| # | File : line | Test title | Why |
| --: | :-- | :-- | :-- |
| 1 | `test/nuxt/banner-artwork-preview.test.ts:30` | "defaults to a centered crop when no focus point is given" | asserts an exact inline `object-position` CSS value |
| 2 | `test/nuxt/banner-card.test.ts:87` | "renders the banner's label" | trivial prop-to-text pass-through, no transformation |
| 3 | `test/nuxt/banner-filter-bar.test.ts:71` | "keeps search permanently inline" | byte-for-byte duplicate of the assertion already made at line 63 |
| 4 | `test/nuxt/products-filter-bar.test.ts:58` | "keeps search permanently inline" | byte-for-byte duplicate of the assertion already made at line 50 |
| 5 | `test/nuxt/banner-grid-states.test.ts:64` | "shows four skeleton placeholders while the list is pending" | asserts an exact placeholder/`article` count, not a state anything reacts to |
| 6 | `test/nuxt/banner-panel-form-footer.test.ts:49` | "renders the save and cancel controls in the panel's footer, not inline in the scrollable form" | DOM placement only |
| 7 | `test/nuxt/products-detail-form.test.ts:172` | "keeps edit actions in the same top rail as the overview and history triggers" | DOM placement only |
| 8 | `test/nuxt/products-detail-form.test.ts:197` | "keeps add actions in the same top rail as the overview and history triggers" | DOM placement only |
| 9 | `test/nuxt/products-detail-form.test.ts:327` | "shows an icon alongside every edit action label" | icon decoration, unconditional |
| 10 | `test/nuxt/products-filter-combobox.test.ts:18` | "lets a caller's class override the trigger's own default width" | asserts CSS classes |
| 11 | `test/nuxt/products-filter-combobox.test.ts:28` | "keeps its own default width when the caller passes no class" | asserts a CSS class |
| 12 | `test/nuxt/products-image-gallery.test.ts:139` | "shows bg-card on the hero preview only when there is no image to show" | asserts a CSS class |
| 13 | `test/nuxt/orders-status-filter-pills.test.ts:78` | "renders the pill row inside a stable scroll container" | re-checks a pill count already covered elsewhere in the file; asserts container existence, never actually tests scrolling despite the name |
| 14 | `test/nuxt/pill-tabs.test.ts:26` | "renders an item's icon only when one is given" | icon presence only |
| 15 | `test/unit/dark-theme.test.ts:32` | "lifts every action and status color above its light-theme counterpart" | parses `main.css` and asserts OKLCH color-lightness values — pure theme/color test |
| 16 | `test/unit/admin-navigation.test.ts:62` | "names a Phosphor icon for every destination" | icon metadata, no behavior |
| 17 | `test/nuxt/login-page.test.ts:41` | "mounts app.vue at /login with exactly one language switcher" | DOM count only |
| 18 | `test/nuxt/products-detail-form.test.ts:448` | "renders the 2-column overview with product media, pricing, and taxonomy" | missed in the original count (see Outcome); 5 of its 6 assertions are pure existence checks for major layout sections, already covered structurally by the other product-form tests that exercise those elements directly |

## Confirmed BROKEN — fix or delete, separately from the cleanup

- `test/nuxt/products-detail-form.test.ts:470` — **"recalculates price when reference price or
  discount is updated"**. Read directly, this test sets the reference-price and discount inputs and
  calls `flushPromises()` — and contains **no `expect()` call at all**. It passes regardless of what
  the pricing logic does. This is a coverage gap wearing a passing test's clothes, not a style
  problem; either give it a real assertion on the recalculated price/discounted-price output, or
  delete it.

## Confirmed BORDERLINE — trim the presentational half, keep the rest

Each of these bundles one assertion worth keeping with one that isn't. Recommendation: delete the
listed assertion from the test body; keep the test and its remaining assertions.

| File : line | Test title | Keep | Drop |
| :-- | :-- | :-- | :-- |
| `test/nuxt/admin-navigation.test.ts:83` | "shows direction every destination, each carrying its own icon" | permission-filtered destination list/order | the `for (item of adminNavigationItems) expect(icon).exists()` loop |
| `test/nuxt/admin-navigation.test.ts:112` | "offers the same filtered destinations in the mobile menu, each with its icon" | same filtering, mobile menu | icon-presence checks |
| `test/nuxt/admin-profile-menu.test.ts:19` | "starts closed and exposes a named profile trigger" | menu starts closed | the aria-label wording check |
| `test/nuxt/admin-shell.test.ts:77` | "opens mobile navigation with the Overview link and dismisses it with Escape" | Escape-key dismissal | the exact CSS-class assertion |
| `test/nuxt/banner-card.test.ts:44` | "renders a resized IPX thumbnail of the large image, not the full artwork" | correct image source selected (large vs full) | the `alt`-attribute check |
| `test/nuxt/banner-card.test.ts:68` | "crops the thumbnail at the banner's focus point, not a default center crop" | the focus point is real per-banner data reaching the component | verified only via inline `object-position`; consider asserting a prop/computed value instead of style |
| `test/nuxt/banner-artwork-field.test.ts:143` | "crops the large preview at the focus picker's current value, updating live as it's adjusted" | live update on focus-picker change | same CSS-only verification issue as above |
| `test/nuxt/banner-artwork-preview.test.ts:24` | "crops at the given focus point instead of the browser's default center crop" | non-default focus points are honored | CSS-only verification |
| `test/nuxt/banner-panel-artwork.test.ts:52` | "shows only the large artwork, cropped at the banner's focus point — no mobile preview" | the no-mobile-preview business rule | the focus-point CSS assertion bundled in |
| `test/nuxt/content-page.test.ts:7` | "marks banners as the active tab by default, each tab carrying an icon" | default active-tab behavior | icon-presence check |
| `test/nuxt/orders-page-tabs.test.ts:7` | "marks orders as the active tab by default, each tab carrying an icon" | default active-tab behavior | icon-presence check |
| `test/nuxt/products-filter-bar.test.ts:50` | "renders one chip per filter inline, with no dialog wrapper" | chip count matches non-search filters | the `products-filter-dialog-content` absence check — a stale-implementation guard with no current behavior behind it |
| `test/nuxt/products-list-panel.test.ts:60` | "renders each row with only its image, name, status pill, and category pill" | status/category content is real output | assertion is tightly coupled to exact child test-IDs; low-effort to keep as is, but brittle |
| `test/nuxt/proposal-workspace.test.ts:139` | "uses semantic badge variants for proposal types and statuses" | status-to-variant mapping (a real decision) | asserting the literal variant *string* is closer to snapshotting than behavior |
| `test/nuxt/proposal-workspace.test.ts:347` | "uses the catalogue proposal query prefix for invalidation" | — | tests only the shape of an array a key-builder returns; never exercises actual cache invalidation. Weak, but not harmful — either strengthen it to assert real invalidation happens on a mutation, or drop it |
| `test/nuxt/stats-blocks.test.ts:59` | "shows a card-shaped skeleton while the overview is initially loading" | `aria-busy="true"` while pending | exact `article`/skeleton-node counts (4, 6, 2, >12) |
| `test/nuxt/stats-blocks.test.ts:90` | "places categories beneath profit while keeping the other catalogue cards together" | the numeric values (46, 4,273, 101, 12) rendering correctly from the payload | the "beneath"/column-adjacency framing, which is DOM position |
| `test/nuxt/login-page.test.ts:6` | "renders the English heading, the login form and the showcase panel at /login" | correct components mount at the `/login` route | the exact heading-copy assertion |

## Corrections from the first draft of this report

Re-reading the files directly on rerun overturned several calls from the first pass. Recorded here
per the now-tech "accuracy over completeness" rule, since the first draft was already shared:

- **`test/nuxt/banner-filter-bar.test.ts:46,63,78,84`** and the equivalent chip tests were
  originally called CUT. On direct reading they assert which *field label* renders for an active
  filter and whether a remove control is offered — a real decision (search is not removable, status
  is), not decoration. Reclassified **KEEP**. Only the literal duplicate at line 71 stays CUT.
- **`test/nuxt/banner-grid-states.test.ts:128`** ("renders one banner card per banner once data has
  loaded") was originally CUT. This is a standard list-rendering-count assertion, the same pattern
  used throughout the KEEP-rated `orders-status-filter-pills.test.ts`. Reclassified **KEEP**.
- **`test/nuxt/spinner.test.ts`** (all 4 cases) was originally CUT as "a11y attributes with no
  logic." On reflection, conditionally exposing `role`/`aria-hidden`/`aria-label` based on a `label`
  prop, and showing/hiding during a pending sign-in, *is* this component's entire functional
  contract — not a stylistic detail. Reclassified **KEEP**.
- **`test/nuxt/language-switcher.test.ts:7`** was originally BORDERLINE. It asserts the menu shows
  the current language and the real supported-locale list — state, not styling. Reclassified
  **KEEP**.
- **`test/nuxt/category-toolbar.test.ts`** — the second pass proposed 2 new CUT candidates ("keeps
  search permanently inline", "hides the add-filter control when every field is rendered inline")
  not flagged in the first pass. Direct reading confirms both encode real UI-capability rules
  (search cannot be removed; the "add filter" menu is pointless with nothing left to add) — the same
  pattern as the KEEP-rated role-gating tests in the same file. Confirmed **KEEP**, no change.
- **`test/nuxt/products-detail-form.test.ts:470`** was called CUT in the first draft. Read directly,
  it has no assertion at all. Reclassified **BROKEN** (worse than jargon), separate from the cleanup.

## Clean files (no findings, either pass, confirmed on spot read)

All of `test/unit/` except the two lines above, plus the large majority of `test/nuxt/` —
every `*-api.test.ts`, every `*-mutations.test.ts`, every schema test, every store test, and
component files such as `banner-focus-picker`, `banner-href-picker`, `banner-list-robustness`,
`banner-mutations`, `banner-edit-save`, `banner-role-gating`, `banner-reorder-request`,
`banner-publish-toggle`, `category-toolbar`, `customers-api`, `taxonomy-*`, `products-workspace`,
`products-lifecycle`, `produit-mutations`, `stats-partial-contract`, `team-api`,
`orders-status-filter-pills` (minus line 78), `language-switcher`, `spinner`. These assert on
emitted events, computed values, request payloads, filtered/derived state, or permission
boundaries — the model for what a test in this suite should look like.

## Recommendation

1. **Delete the 17 confirmed CUT cases.** None of them assert anything a user or another part of the
   app depends on.
2. **Fix or delete `products-detail-form.test.ts:470` first, on its own** — a silently-passing no-op
   is a correctness bug in the suite, not a style issue.
3. **Trim, don't delete, the 18 BORDERLINE cases** — remove the listed presentational assertion,
   keep the test and its behavioral assertion.
4. Where a CUT case was the *only* test covering a real underlying rule (the focus-point-affects-crop
   family, and the search-filter-is-not-removable rule), that rule is now only tested through the
   BORDERLINE cases that remain after trimming — no rule loses coverage entirely once the trims are
   applied.
5. No file should be deleted wholesale — every flagged file also has KEEP-worthy cases.

## Outcome — implemented

The user authorized the cuts after reviewing this report. All three actions below landed in this
pass:

1. **Deleted all 18 confirmed CUT cases**, including one caught only while editing
   `products-detail-form.test.ts` ("renders the 2-column overview...", added to the CUT table
   above as #18 — it should have been counted in the original pass and wasn't). Two files ended up
   with zero remaining tests once their CUT cases were removed and were deleted outright, which
   revises recommendation #5 below: `test/unit/dark-theme.test.ts` and
   `test/nuxt/products-filter-combobox.test.ts`.
2. **Fixed the BROKEN test** at `products-detail-form.test.ts:470` instead of deleting it. Reading
   `DetailForm.vue`'s pricing logic (`updateReferencePrice`/`updateDiscount`/
   `computeDiscountedPrice`) showed the recalculation is real, testable business logic with no
   coverage at all. Replaced the no-op test with two: "recalculates the displayed price when the
   reference price changes" and "recalculates the displayed price when the discount changes," each
   asserting the actual formatted price (`"85 000"`, `"47 920"`) that
   `products-detail-overview-price-input` shows after the corresponding input changes — computed
   independently from the component's fixture values (`prix_reference: 59_900`, `remise_pct: 15`),
   not copied from its formula.
3. **Trimmed all 18 BORDERLINE cases** except three left as-is because no clean sub-assertion could
   be removed without gutting the test's only signal: `banner-card.test.ts:68`,
   `banner-artwork-field.test.ts:143`, and `banner-artwork-preview.test.ts:24` (all three verify a
   focus-point crop, and the CSS `object-position` check *is* the only way that decision is
   observable — there is no separate non-styling assertion to keep). `products-list-panel.test.ts:60`
   was also left unchanged: its "only" claim is a real conditional-rendering check (no category pill
   when `categorie` is `null`), not decoration. `proposal-workspace.test.ts:139` (badge variants) was
   left unchanged for the same reason — the variant string is the only observable form of that
   decision. `proposal-workspace.test.ts:347` ("uses the catalogue proposal query prefix for
   invalidation") was deleted rather than trimmed or strengthened: rewriting it to assert a real
   invalidation on mutation was out of scope for a cleanup pass, and the existing assertion tested
   only a key-builder's shape.

Every other BORDERLINE case was trimmed to drop the presentational assertion and keep the
behavioral one, per the Keep/Drop table above; several test titles were renamed to match what the
trimmed test now actually asserts (e.g. "shows direction every destination, each carrying its own
icon" → "shows direction every destination").

**Validation:**

- `bunx vitest run` — 109 test files, 551 tests, all passing.
- `bunx eslint <every edited file>` — clean (a repo-wide `bun run lint` separately fails on an
  unrelated `.worktrees/now-tech-website/eslint.config.mjs`, pre-existing and untouched by this
  work).
- `bun run typecheck` — clean.
- `bun run fallow` — audit gate passes on all 175 changed files in this branch; the one advisory
  complexity finding it reports (`BannerForm.vue`'s `onSubmitCreate`) predates this pass and is
  unrelated to test files.

## Scope limits

- Judged by reading test source, not by running the suite; no flaky-test analysis, and no coverage
  delta was measured for the proposed deletions.
- No test file was edited in this pass — findings only, per the user's request to audit first.
- The BORDERLINE trims are recommendations on which specific `expect()` lines to remove; actually
  editing each test body was left for a follow-up implementation pass.
