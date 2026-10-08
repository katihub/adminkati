# Audit: trivial / jargon tests in the Vitest suite — round 3 (post-caisse/team/users)

## Question

Which tests currently in `test/unit/` and `test/nuxt/` check something other than functionality,
business logic, robustness, or a security/authorization boundary — CSS classes, colors, fonts,
exact DOM positioning, icon presence, exact-but-unbranching counts, tautologies, or duplicate
assertions — and should be cut or trimmed per AGENTS.md's "What does not get tested" rule?

## Method

This is the third jargon audit. The [first](./2026-09-08-audit-test-suite-jargon.md) and
[second/stricter](./2026-09-08-audit-test-suite-jargon-strict.md) passes already read all 109 test
files that existed at commit `13a74cf` in full, cut everything they found, and both outcomes are
merged. Re-reading those 109 files from scratch a third time was judged low-value and out of
proportion to what changed, so this pass instead:

1. Diffed `test/` between `13a74cf` (the last audit's landing commit) and the working tree
   (`git diff --stat 13a74cf -- test/`, plus `git status --short -- test/` for untracked/deleted
   files) to find exactly what is new or changed and therefore **never audited**.
2. Spot-checked that the first two audits' cuts actually landed (grepped six previously-CUT test
   titles across the current tree — all six are gone).
3. Read every changed/new file directly and classified each `it()` case against the rubric used by
   the strict audit (exact counts with no branching, CSS-only assertions, tautologies, duplicates,
   "differs without saying how," icon/decoration-only checks, declared-initial-state checks with no
   computed decision behind them), cross-referencing the component/store/util each test drives.
4. **This report was re-run once, mid-session**, after the in-progress `caisse` and `team`
   workspace feature changed under it (`caisse-workspace.test.ts`, `caisse-workspace-store.test.ts`,
   `team-workspace.test.ts` were all edited again; `admin-profile-menu.test.ts` and
   `inline-tag-selector.test.ts` were added; `caisse-encours-strip.test.ts` and
   `caisse-status-filter-pills.test.ts` were deleted). Every finding below reflects the file
   contents as they exist on disk at the time this report was written — every line number was
   `grep`-verified against the current file, not carried over from the mid-session state.

**Not examined:** the 109 files from the first two audits (only spot-checked, not re-read); whether
the CUT/BORDERLINE items below are the only tests covering their underlying rule; coverage deltas;
whether the suite currently passes (not run this pass).

## Summary

| | Count |
| :-- | --: |
| Files in scope (new/changed since `13a74cf`) | 20 (`caisse-encours-strip.test.ts` and `caisse-status-filter-pills.test.ts`, both in-scope earlier this session, no longer exist and are dropped from scope) |
| Confirmed CUT | 7 |
| Confirmed BORDERLINE (trim, don't delete) | 12 |
| Confirmed BROKEN (no assertion) | 0 |
| Files with zero findings | 15 of 20 |

## Confirmed CUT — delete these

| # | File : line | Test title | Why |
| --: | :-- | :-- | :-- |
| 1 | `test/unit/caisse-workspace-store.test.ts:8` | "starts with no status filter, no search term, no selected porteur" | pure declared-initial-state check (`ref(undefined)`/`ref("")`/`ref(null)`) — the store no longer has a special non-trivial default (an earlier version defaulted `statusFilter` to `"attention"`, which would have been a real product decision worth keeping; that default has since been removed, and "no filter" needs no test to prove) |
| 2 | `test/unit/caisse-workspace-store.test.ts:16` | "sets and clears the search term" | pure Pinia setter pass-through — assigns a string to a ref and reads it back, no trim/validate/branch |
| 3 | `test/unit/caisse-workspace-store.test.ts:26` | "sets the status filter to a real status, and back to all (undefined)" | pure setter pass-through; the meaning of `undefined` (all) vs a real status is a `filterCaisses` decision, already tested in `filter-caisses.test.ts` |
| 4 | `test/unit/caisse-workspace-store.test.ts:36` | "sets and clears the selected porteur" | pure setter pass-through |
| 5 | `test/unit/caisse-workspace-store.test.ts:46` | "returns every filter to its default on reset" | tests Pinia's own `$reset()` restoring declared initial state — the exact pattern the first audit already cut once from `customer-workspace-store.test.ts` (that store and its test file are since deleted entirely) |
| 6 | `test/unit/caisse-ecart-motifs.test.ts:5` | "exposes exactly six unique motif codes" | exact length assertion (`toHaveLength(6)`) on a static handwritten array, no branching logic; the accompanying uniqueness check (`Set` size) is too weak on its own to justify keeping the test |
| 7 | `test/nuxt/products-image-gallery.test.ts:299` | "still removes a local URL-only image by a plain local splice, without calling the delete endpoint" | byte-for-byte duplicate of the scenario and assertion already at line 50; the test's own unique claim — "without calling the delete endpoint" — is never asserted, no DELETE spy exists in this test |

**`test/unit/caisse-workspace-store.test.ts` loses all 5 of its tests** (#1–5 above are the entire
file). Delete the file outright rather than leaving an empty `describe` block — same outcome as the
first audit's removal of `dark-theme.test.ts` and `products-filter-combobox.test.ts` once every test
in each was cut.

## Confirmed BORDERLINE — trim the incidental assertion(s), keep the rest

| File : line | Test title | Keep | Drop |
| :-- | :-- | :-- | :-- |
| `test/nuxt/customers-api.test.ts:124` | "fetches the selected customer account detail without exposing a legacy profile-only shape" | `toEqual(detail)` — proves the real endpoint was hit and its shape reached the caller | `toHaveProperty("client.id", "client-42")` — same fixture, duplicate check |
| `test/nuxt/products-image-gallery.test.ts:29` | "switches the hero preview to a clicked thumbnail without reordering the list" | hero `src`, thumbnail order preserved, no `update:modelValue` emitted | `thumbnails[2].attributes("data-active")` — duplicates the hero-selection fact already proven by the `src` check |
| `test/nuxt/products-image-gallery.test.ts:79` | "adds the image from the URL input on confirm and closes the dialog" | the emitted image payload (`rang`/`url`/`chemin_local: null`) | the dialog-closed check — incidental UI state |
| `test/nuxt/products-image-gallery.test.ts:131` | "cancels the dialog without emitting" | the no-emit assertion | the dialog-closed check |
| `test/nuxt/products-image-gallery.test.ts:149` | "uploads a staged file and closes the dialog once the backend confirms it" | `uploadCalled` only after confirm (not on stage) + the emitted server-returned images | the dialog-closed check |
| `test/nuxt/products-image-gallery.test.ts:252` | "disables the upload dropzone when there is no product id yet (add mode)" | `input.disabled` — the real add-mode gating decision | the hint-text `textContent.length > 0` check |
| `test/nuxt/quotes-detail-workspace.test.ts:112` | "refreshes prices on demand and renders the returned deltas" | `requestCount === 1` and the `"65,000"` delta rendering | `toContain("Riz parfumé 25kg")` — that row was already on screen before the refresh |
| `test/nuxt/quotes-detail-workspace.test.ts:140` | "archives after confirmation and reports completion to the parent" | confirm click → `emitted("archived")` | the two `.exists()` checks on the header/trigger — redundant with the preceding `wrapper.get(...)` on the same selector, which already throws if either is missing |
| `test/nuxt/team-api.test.ts:66` | "walks the team annuaire pages and exposes the canonical invitation timestamp" | the pagination walk (`requestedPages`, appended elements across two pages) | the `invitLe === member.invitLe` line — already implied by the preceding `toEqual`, a tautology on top of a real assertion |
| `test/nuxt/team-api.test.ts:121` | "sends nullable team updates, deactivation, and reactivation, then invalidates list and detail queries" | the observed `PATCH`/`DELETE`/`POST` calls and bodies, the `not.toHaveProperty("create")` removed-feature guard, and both cache invalidations | `reactivate.data.value` equaling the mock's own return value — a mock pass-through, not a decision the code makes |
| `test/nuxt/team-workspace.test.ts:69` | "lets direction edit profile details in place while keeping email read-only" | no `team-member-email-input` rendered (email genuinely not editable) + deactivate control present | the email `.text()` contains-check (display-only) and the save button's `disabled` attribute being `undefined` |
| `test/nuxt/team-workspace.test.ts:89` | "hides role and lifecycle controls when a director views their own member row" | roles control absent + deactivate control absent (the actual self-view gate) | the details-panel `.exists()` check and the email `.text()` check |

## Files reviewed clean (no findings)

New/changed files with zero findings, verified against their component/composable/store:

- `test/nuxt/caisse-count-dialog.test.ts` (5), `caisse-detail-panel.test.ts` (13),
  `caisse-list-panel.test.ts` (4), `caisse-validate-dialog.test.ts` (4),
  `caisse-workspace.test.ts` (4 — content changed since the mid-session version: the old
  encours-chip-filter test is gone along with the deleted `EncoursStrip` component, replaced by a
  new "auto-selects the first caisse in the list when nothing is explicitly selected" test; still
  entirely real state/routing decisions, no findings), `admin-ui-reset.test.ts` (1),
  `produit-mutations.test.ts` (6), `users-workspace.test.ts` (4),
  `admin-profile-menu.test.ts` (7 — new to this audit's scope; initials computation, locale
  persistence, logout on both success and failure, and light/dark toggle all reflect real state,
  none of it decorative), `inline-tag-selector.test.ts` (1 — new file; tests the real
  stage-then-confirm contract: a picked option is not emitted until the add action is confirmed)
- `test/unit/caisse-duty.test.ts` (14), `filter-caisses.test.ts` (7), `resolve-member-name.test.ts`
  (4), `product-image-file.test.ts` (4), `team-member-update.test.ts` (3), plus 2 of
  `caisse-ecart-motifs.test.ts`'s 3 cases (the backend-alert-sentinel and 60-character-cap tests)

## Recommendation

1. **Delete the 7 confirmed CUT cases**, and delete `test/unit/caisse-workspace-store.test.ts`
   outright once its 5 tests are gone (nothing survives in that file).
2. **Trim the 12 BORDERLINE cases** per the keep/drop table — remove only the listed incidental
   `expect()`(s), keep the test and its behavioral assertion.
3. No other file in scope needs any change — the two brand-new files this round
   (`admin-profile-menu.test.ts`'s new cases, `inline-tag-selector.test.ts`) and the two files that
   changed again mid-session (`caisse-workspace.test.ts`, `team-workspace.test.ts`) all came back
   clean or matching an already-listed BORDERLINE trim.
4. This is findings only — no test file has been edited in this pass.

## Scope limits

- The 109 files covered by the first two audits were not re-read from scratch this round — only
  spot-checked (6 previously-CUT titles, all confirmed gone).
- Judged by reading test and source files directly; the suite was not run this pass.
- No flaky-test analysis, no coverage-delta measurement.
- The codebase's `caisse`/`team` workspace feature is visibly still being iterated on in the working
  tree (three files changed again between this audit's first and second read). This report reflects
  a single snapshot in time; a file edited after this report was written would need its own check.

## Outcome — implemented

The user authorized the cuts after reviewing this report. Both actions landed:

1. **Deleted all 7 confirmed CUT cases.** `test/unit/caisse-workspace-store.test.ts` had nothing
   left once its 5 tests were removed, so the file was deleted outright rather than left with an
   empty `describe` block.
2. **Trimmed all 12 BORDERLINE cases** per the keep/drop table — removed only the listed incidental
   `expect()`(s) from each test, kept the test and its behavioral assertion. No title needed
   renaming; none of the trimmed titles overclaimed what remained.

**Validation:**

- `bunx vitest run` — 122 test files, 629 tests, all passing.
- `bunx eslint` on every edited file — clean.
- `bun run typecheck` — clean on every file this pass touched. One pre-existing, unrelated error
  surfaced (`test/nuxt/inline-tag-selector.test.ts(43,12): Property 'click' does not exist on type
  'Element'`) — that file is untracked, was never part of this audit's scope, and was not edited by
  this pass.
- `bunx fallow audit` — reports 2 above-threshold complexity findings, both pre-existing and outside
  this pass's edits: `app/components/team/MemberDetails.vue`'s `save` (untracked, part of the
  concurrent in-progress team feature) and `app/components/content/BannerForm.vue`'s
  `onSubmitCreate` (already flagged as pre-existing and unrelated to test files in both prior
  audits' outcomes). Neither file was touched by this pass.
