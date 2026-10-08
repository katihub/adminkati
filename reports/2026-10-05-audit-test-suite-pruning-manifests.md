# Test pruning manifests — appendix

Per-shard record of every removed test (file :: title :: category :: reason), the borderline tests that were kept, and the composables that kept a test. Written by the eight pruning agents; see [the audit](2026-10-05-audit-test-suite-pruning.md) for the method and findings.

## Shard 1 manifest

Counts are `it(` / `it.each(` declaration sites (an `it.each` and a loop-generated `it` each count as ONE).

| file | tests before | tests after | removed | file deleted |
| :-- | --: | --: | --: | :-- |
| test/unit/access.test.ts | 4 | 4 | 0 | no |
| test/nuxt/admin-navigation.test.ts | 6 | 5 | 1 | no |
| test/unit/admin-navigation.test.ts | 8 | 8 | 0 | no |
| test/nuxt/admin-profile-menu.test.ts | 7 | 5 | 2 | no |
| test/nuxt/admin-shell.test.ts | 5 | 4 | 1 | no |
| test/nuxt/admin-ui-reset.test.ts | 1 | 1 | 0 | no |
| test/unit/ai-audit.test.ts | 9 | 8 | 1 | no |
| test/unit/ai-config.test.ts | 9 | 8 | 1 | no |
| test/nuxt/ai-generation-launcher.test.ts | 44 | 43 | 1 | no |
| test/unit/ai-generation-store.test.ts | 48 | 42 | 6 | no |
| test/unit/ai-product-assets.test.ts | 12 | 12 | 0 | no |
| test/unit/ai-product-context.test.ts | 18 | 15 | 3 | no |
| test/unit/ai-product-copy-api.test.ts | 29 | 25 | 4 | no |
| test/unit/ai-product-copy-client.test.ts | 24 | 18 | 6 | no |
| test/unit/ai-product-copy-outcomes-api.test.ts | 3 | 3 | 0 | no |
| test/unit/ai-product-copy-policy.test.ts | 3 | 2 | 1 | no |
| test/unit/ai-product-copy-prompt.test.ts | 2 | 2 | 0 | no |
| test/unit/ai-product-copy-schema.test.ts | 60 | 48 | 12 | no |
| **total** | **292** | **253** | **39** | 0 files deleted |

By category: duplicate 25, framework 5, tautology 5, coverage 2, markup 1, passthrough 1, composable-limit 0.

## Removals
test/nuxt/admin-navigation.test.ts :: gives preparation orders without the catalogue or customer destinations :: duplicate :: same filter path and same expected ids as the livreur component test; unit spec already pins preparation's role set
test/nuxt/admin-profile-menu.test.ts :: starts closed :: framework :: reka-ui dropdown's default closed state
test/nuxt/admin-profile-menu.test.ts :: opens the nested language dropdown, revealing both locale options :: duplicate :: the "selects French" test opens the same nested dropdown and needs the fr option present
test/nuxt/admin-shell.test.ts :: opens mobile navigation with the Overview link and dismisses it with Escape :: framework :: Escape dismissal is reka-ui's; opening the mobile menu is already covered in admin-navigation "offers the same filtered destinations in the mobile menu"
test/unit/ai-audit.test.ts :: the default console.info output never carries polluted marker fields :: duplicate :: same toAuditRecord path as the polluted-input test; default-sink JSON shape already covered
test/unit/ai-config.test.ts :: accepts a positive integer (per positive-integer field, loop-generated) :: duplicate :: the fully valid production config test already proves each field accepts a valid value
test/nuxt/ai-generation-launcher.test.ts :: opens a panel headed by the assistant's name and nothing else :: markup :: header text/element; panel opening covered by the open/close test
test/unit/ai-generation-store.test.ts :: starts idle with no target, language, result, history, or open panel :: tautology :: mirrors initial ref values
test/unit/ai-generation-store.test.ts :: allows a new begin from error :: duplicate :: same single `status === "loading"` guard as "allows a new begin from ready"
test/unit/ai-generation-store.test.ts :: settling an already-absent field is a harmless no-op :: framework :: object-rest destructuring semantics
test/unit/ai-generation-store.test.ts :: retryLast does not throw when idle and no retry has ever been registered :: coverage :: bare not.toThrow; the guard is covered by "retryLast does nothing while ready" and the restore test
test/unit/ai-generation-store.test.ts :: labels a run with an empty string when the caller gives none :: tautology :: asserts the default parameter value
test/unit/ai-generation-store.test.ts :: setPanelOpen reopens a closed panel :: passthrough :: plain setter
test/unit/ai-product-context.test.ts :: never lets the persisted url_source leave the function :: duplicate :: the `toEqual` in "keeps only images (rang, url) and fiche_pdf" already fails on any extra key
test/unit/ai-product-context.test.ts :: exposes only the images and fiche_pdf keys on the mapped product :: duplicate :: same `toEqual` as above
test/unit/ai-product-context.test.ts :: defaults a missing fiche_pdf to null :: duplicate :: subsumed by "defaults a non-string fiche_pdf to null" (same typeof branch)
test/unit/ai-product-copy-api.test.ts :: rejects an unknown draft.url_source field :: duplicate :: handler has one parseRequest path; url_source is a row in the schema spec's strict-draft it.each and the top-level unknown-field test proves the 400/no-model-call wiring
test/unit/ai-product-copy-api.test.ts :: rejects an unknown draft.images field :: duplicate :: subsumed by "rejects a browser-supplied draft.images field before any persisted-asset lookup"
test/unit/ai-product-copy-api.test.ts :: rejects a missing language :: duplicate :: rule lives in the request schema (covered by the "rejects language" it.each); handler wiring covered elsewhere
test/unit/ai-product-copy-api.test.ts :: rejects an unsupported language :: duplicate :: same as above
test/unit/ai-product-copy-client.test.ts :: keeps a null price null :: tautology :: identity on null; cannot fail for a reason that matters
test/unit/ai-product-copy-client.test.ts :: reads a known reason from the server's nested Nitro error body :: duplicate :: the known-reasons it.each already uses the nested Nitro shape
test/unit/ai-product-copy-client.test.ts :: maps a non-string reason to unknown :: duplicate (pre-existing FAILING) :: same fall-through branch as the unrecognised-reason test; Set.has handles non-strings
test/unit/ai-product-copy-client.test.ts :: accepts a plain-object retry-after header with a get method :: duplicate :: same `headers.get` path as the Headers-instance test
test/unit/ai-product-copy-client.test.ts :: does not use a retry-after header for a reason other than quota_exceeded :: duplicate :: same ternary branch as "never honours retryAfterSeconds for a reason other than quota_exceeded"
test/unit/ai-product-copy-client.test.ts :: maps a readable status (not statusCode) with no usable reason to unknown :: duplicate (pre-existing FAILING) :: same behaviour as the statusCode variant; the property name is getStatus's concern
test/unit/ai-product-copy-policy.test.ts :: keeps the baseline low-reasoning allowance for every scope until measured tuning changes a cap :: tautology :: equal caps in, equal value out; the max-of-selected test covers the logic
test/unit/ai-product-copy-schema.test.ts :: accepts a request carrying a positive integer productId :: duplicate :: handler tests send productId 42 through the real schema
test/unit/ai-product-copy-schema.test.ts :: rejects a non-object body (it.each) :: framework :: strictObject rejecting non-objects is Zod's own behaviour
test/unit/ai-product-copy-schema.test.ts :: accepts brand, department and primaryCategory as null :: duplicate :: the draft() fixture already carries nulls in every accepting test
test/unit/ai-product-copy-schema.test.ts :: rejects a department past the 120-character ceiling :: duplicate :: same optionalLabel helper and same 120 limit as the brand ceiling test
test/unit/ai-product-copy-schema.test.ts :: rejects a secondaryCategories entry past the 300-character ceiling :: duplicate :: same required(300) helper as the draft-name ceiling test
test/unit/ai-product-copy-schema.test.ts :: accepts a well-formed suggestion (pre-existing FAILING) :: duplicate :: every other accept assertion in the block, and the parseProductCopyOutput happy path, cover it
test/unit/ai-product-copy-schema.test.ts :: rejects an extra top-level key (suggestion schema) :: duplicate :: covered through the real pipeline by parseProductCopyOutput "returns null when an extra key is present"
test/unit/ai-product-copy-schema.test.ts :: rejects a missing %s field (it.each, suggestion schema) :: duplicate :: covered by parseProductCopyOutput "returns null when a required field is missing"
test/unit/ai-product-copy-schema.test.ts :: rejects wrong field types (suggestion schema) :: framework :: Zod type checking; pipeline behaviour covered by parseProductCopyOutput wrong-type test
test/unit/ai-product-copy-schema.test.ts :: rejects a blank name %j (it.each, suggestion schema) :: duplicate :: covered by parseProductCopyOutput "returns null when name is blank after trimming"
test/unit/ai-product-copy-schema.test.ts :: is false when the name is whitespace only :: tautology :: no brand/category signal either, so it returns false with or without the trim; "ab" with every signal is the discriminating case
test/unit/ai-product-copy-schema.test.ts :: never throws, even on deeply malformed input :: coverage :: bare not.toThrow; "returns null for invalid JSON" already asserts the null result

## Borderline (kept)
test/unit/admin-navigation.test.ts :: keeps destination ids, routes, and paths unique :: hand-written constant table; catches only a copy-paste mistake
test/unit/admin-navigation.test.ts :: derives every label from the admin navigation locale domain :: asserts a naming convention on a constant table (mirror-ish) but catches a wrong label on a copied entry
test/nuxt/admin-navigation.test.ts :: shows direction every destination :: overlaps "routes every navigation destination" which already finds each link
test/nuxt/admin-shell.test.ts :: renders the Overview route in the admin shell as the active navigation item :: overlaps the every-destination routing test; only adds the English label text
test/nuxt/admin-shell.test.ts :: renders the localized Overview route as active in French :: asserts a translation string, but it is the only check that the /fr/ path actually applies the French locale
test/nuxt/ai-generation-launcher.test.ts :: is not offered to anyone who cannot generate copy :: the shell it.each "comptoir -> 0 launchers" row asserts the same authorization at integration level
test/nuxt/ai-generation-launcher.test.ts :: lists Suggestions, Conversations and Settings in that order, with Suggestions current :: label text and order
test/nuxt/ai-generation-launcher.test.ts :: shows nothing when idle ; shows no warning line when the response reports none :: absence-only checks, weak individually
test/nuxt/ai-generation-launcher.test.ts :: states each request as a line of its own, naming the language and the product :: mostly an i18n interpolation string
test/nuxt/ai-generation-launcher.test.ts :: says why in plain words for %s (it.each) :: reason -> sentence table mirrors the translation file
test/unit/ai-config.test.ts :: per-field "throws naming <ENV_VAR>" loops and "accepts zero and a fractional positive value" :: the test field/env-var tables mirror the code's tables; they do pin each field's wiring and the >= 0 boundary
test/unit/ai-generation-store.test.ts :: never considers an error entry reusable :: passes by construction (fail() never records a fingerprint), so removing the status check would not break it
test/unit/ai-product-assets.test.ts :: drops all images and warns when every persisted image url is unsafe :: overlaps "skips an unsafe persisted image url and warns" (adds only the all-gone edge)
test/unit/ai-product-context.test.ts :: calls fetchJson exactly once with the administration read URL ; bounds the request with a short, positive timeout :: the first mirrors the URL literal in code, the second asserts a range on a constant
test/unit/ai-product-copy-prompt.test.ts :: makes structured product facts authoritative over incidental visual observations :: regexes over instruction prose; brittle to rewording but guards the anti-hallucination rules
test/unit/ai-product-copy-schema.test.ts :: rejects a primaryCategory past the 300-character ceiling ; accepts an empty existingShortDescription and rejects one past the 500-character ceiling :: same helper as sibling ceiling tests with different constants
test/unit/ai-product-copy-schema.test.ts :: trims the draft name in the parsed output :: Zod's trim, but our schema's choice and what reaches the prompt
test/unit/ai-product-copy-schema.test.ts :: is false when the only signal is department ; ... secondaryCategories :: same branch as "name alone", distinct documented non-anchor rules
test/unit/ai-product-copy-schema.test.ts :: productCopySuggestionSchema block (ceilings, features 12/13, blank feature entry) :: STALE fixture, see Notes

## Composables with a kept test
useAuthLogout -> test/nuxt/admin-ui-reset.test.ts :: clears session UI and query state after %s logout (single it.each, successful + failed logout)

No other composable (`app/composables/useX.ts`) is the subject of a test in this shard. `useAiGenerationStore` is a Pinia store in `app/stores/`, not a composable, so the composable-limit does not apply.

## Notes
- Edits were whole-test deletions only (Edit tool for nuxt specs and ai-config; small python block-cuts for the larger unit specs). No kept test was rewritten or reformatted. Dead imports cleaned: `AdminNavigation` import removed from test/nuxt/admin-shell.test.ts (no longer used). Nothing else became dead (checked by `bunx oxlint`, exit 0, no output).
- Verification: `bunx vitest run --project unit --coverage.enabled=false` on the 13 unit specs of this shard: before 10 failed / 357 passed (all pre-existing), after 7 failed / 312 passed. The 3 removed failing tests are listed above. The 7 remaining pre-existing failures: ai-product-copy-api (3: provider_unavailable, provider_timeout, provider_refused mapping), ai-product-copy-client (2: unrecognised reason string, statusCode-only), ai-product-copy-schema (2: suggestion ceilings, features 12/13). Left as-is per rubric.
- STALE FIXTURE in `ai-product-copy-schema.test.ts`: `productCopySuggestionSchema` is now an 8-field strict object (brand, department, primaryCategory, secondaryCategories added) but the `suggestion()` helper still builds the old 4-field package. Result: the two "accepts ..." tests fail, and every remaining *rejection* test in that block ("... one char over", "rejecting a 13th", "rejects a blank feature entry") passes vacuously because the input is rejected for the missing keys. I did not fix it (rubric); the user may want the block repaired or removed. The pipeline-level `parseProductCopyOutput` tests are unaffected and exercise the real behaviour.
- The ai-product-copy-client stale failures come from `toProductCopyFailure` now adding a `detail: "HTTP <status>"` field to the `unknown` result; the two tests still assert the old shape.
- test/nuxt specs were NOT run (per rubric); they were verified by reading plus `bunx oxlint` (clean). Nuxt edits: admin-navigation (-1), admin-profile-menu (-2), admin-shell (-1 and one unused import), ai-generation-launcher (-1).
- The working tree already showed other agents' modifications to unrelated test/nuxt files while I worked; I did not touch them.
- ai-product-assets, access, outcomes-api: reviewed in full, nothing removed (SSRF, authorization, leak and robustness coverage).

## Shard 2 manifest

Counts are `it` / `it.each` blocks (an `it.each` counts as one test, per the rubric).

| file | tests before | tests after | removed | file deleted |
| :-- | --: | --: | --: | :-- |
| test/unit/ai-product-copy-service.test.ts | 19 | 19 | 0 | no |
| test/unit/ai-rate-limit.test.ts | 10 | 9 | 1 | no |
| test/nuxt/apercu-fixture.ts | n/a (helper) | n/a | 0 | no (imported by stats-blocks, index-metadata, stats-partial-contract) |
| test/nuxt/api-error-card.test.ts | 3 | 3 | 0 | no |
| test/unit/api-error.test.ts | 4 | 4 | 0 | no |
| test/nuxt/api-mutations.test.ts | 3 | 3 | 0 | no |
| test/unit/api-proxy.test.ts | 8 | 7 | 1 | no |
| test/unit/api-query-keys.test.ts | 9 | 5 | 4 | no |
| test/unit/app-error.test.ts | 3 | 3 | 0 | no |
| test/nuxt/app-initialization.test.ts | 1 | 1 | 0 | no |
| test/unit/assistant-requests.test.ts | 6 | 6 | 0 | no |
| test/nuxt/assistant-workspace.test.ts | 11 | 11 | 0 | no |
| test/unit/auth-failure.test.ts | 2 | 2 | 0 | no |
| test/nuxt/auth-identity.test.ts | 1 | 1 | 0 | no |
| test/nuxt/banner-artwork-field.test.ts | 2 | 2 | 0 | no |
| test/nuxt/banner-artwork-preview.test.ts | 2 | 1 | 1 | no |
| test/unit/banner-artwork.test.ts | 15 | 13 | 2 | no |
| test/nuxt/banner-card.test.ts | 11 | 10 | 1 | no |
| test/nuxt/banner-edit-save.test.ts | 8 | 8 | 0 | no |
| test/nuxt/banner-editor-pill.test.ts | 20 | 19 | 1 | no |
| test/unit/banner-editor.test.ts | 5 | 5 | 0 | no |
| test/nuxt/banner-filter-bar.test.ts | 8 | 7 | 1 | no |
| test/unit/banner-filters.test.ts | 7 | 7 | 0 | no |
| test/nuxt/banner-focus-picker.test.ts | 4 | 4 | 0 | no |
| test/nuxt/banner-form-layout.test.ts | 21 | 14 | 7 | no |
| test/nuxt/banner-grid-states.test.ts | 7 | 7 | 0 | no |
| test/nuxt/banner-href-picker.test.ts | 2 | 2 | 0 | no |
| test/nuxt/banner-info-tips.test.ts | 4 | 3 | 1 | no |
| test/nuxt/banner-list-robustness.test.ts | 1 | 1 | 0 | no |
| test/nuxt/banner-mutations.test.ts | 8 | 2 | 6 | no |
| test/nuxt/banner-panel-artwork.test.ts | 1 | 1 | 0 | no |
| test/nuxt/banner-panel-details.test.ts | 8 | 4 | 4 | no |
| test/nuxt/banner-panel-form-footer.test.ts | 3 | 3 | 0 | no |
| test/nuxt/banner-panel-url-state.test.ts | 7 | 7 | 0 | no |
| **total** | **224** | **194** | **30** | **0 files deleted** |

By category: tautology 11, duplicate 6, composable-limit 6, markup 5, framework 2 (total 30).

## Removals

test/unit/ai-rate-limit.test.ts :: leaves the user able to acquire again immediately when release runs in a finally after the work throws :: duplicate :: the limiter never sees the throw; "acquire, release, acquire again" is already covered by the first test and the stale-release test
test/unit/api-proxy.test.ts :: proxies a six megabyte multipart/form-data body instead of rejecting it :: duplicate :: the stock-import test (5 MiB + 512 B, multipart) hits the same over-5 MB multipart branch and asserts more (target, headers, body)
test/unit/api-query-keys.test.ts :: gives taxonomy one shared key, distinct from unrelated resources :: tautology :: asserts two distinct constants differ
test/unit/api-query-keys.test.ts :: gives banners one shared key, distinct from unrelated resources :: tautology :: mirrors the literal array back at itself and asserts two constants differ
test/unit/api-query-keys.test.ts :: gives points of sale their own key, so a banner write never refetches them :: tautology :: mirrors a literal and asserts "not equal"; it cannot catch the prefix collision its title is about
test/unit/api-query-keys.test.ts :: gives delivery intervals their own key, distinct from products :: tautology :: mirrors a literal and asserts two constants differ
test/unit/banner-artwork.test.ts :: bannerFrameClass > frames a main banner wide, as its card in the list does :: markup :: asserts a Tailwind class string against the same constant
test/unit/banner-artwork.test.ts :: bannerFrameClass > frames a promo banner squarer, as its card in the list does :: markup :: same, class-name lookup mirror (describe block and import removed)
test/nuxt/banner-artwork-preview.test.ts :: produces the same URL for two instances given the same source and no sizes prop :: tautology :: mounting the same component twice with identical props in a layout-less env is deterministic regardless of the `sizes` regression it describes; the end-to-end version lives in banner-panel-artwork.test.ts
test/nuxt/banner-card.test.ts :: renders a resized IPX thumbnail of the large image, not the full artwork :: duplicate :: the card delegates to BannerArtworkPreview, whose own spec asserts the same `/_ipx/` thumbnail; the card's "resizes proportionally" test still reads the same img src
test/nuxt/banner-editor-pill.test.ts :: the card > leaves the crown out for other roles :: duplicate :: the crown decision lives in BannerEditorCrown and is already covered by the pill's "no crown for any other role"
test/nuxt/banner-filter-bar.test.ts :: does not show a reorder hint when a filter narrows the grid :: tautology :: asserts absence of `banner-filter-reorder-hint`, which no longer exists anywhere in app/; cannot fail
test/nuxt/banner-form-layout.test.ts :: label field > has no status beside it ... :: tautology :: asserts absence of `banner-form-status`, which no longer exists anywhere in app/; cannot fail (also removed the now-unused STATUS const)
test/nuxt/banner-form-layout.test.ts :: phone artwork block > is titled, so nobody has to guess what it is, and says it is optional :: tautology :: static label copy mirrored from the locale file, no conditional logic
test/nuxt/banner-form-layout.test.ts :: field labels > titles the %s field at its top as %s (it.each, 5 rows) :: tautology :: static label copy mirrored from the locale file
test/nuxt/banner-form-layout.test.ts :: field labels > marks the large artwork as required, as the phone artwork is marked optional :: tautology :: static "Required" copy mirrored from the locale file
test/nuxt/banner-form-layout.test.ts :: alt text counter > is just the count and the limit :: duplicate :: "follows what is typed" asserts the same `n/400` format after input
test/nuxt/banner-form-layout.test.ts :: alt text counter > sits above the text box, in the field's header :: markup :: DOM source order via compareDocumentPosition
test/nuxt/banner-form-layout.test.ts :: in French > speaks French on the new controls :: framework :: i18n key lookups only; locale key parity is already gated by `bun run i18n:check` (also removed the now-dead `locale.value = "en"` reset in afterEach)
test/nuxt/banner-info-tips.test.ts :: adds no drag instructions under the heading, even when the group can be reordered :: tautology :: asserts absence of the text "Drag a banner by its handle", which exists nowhere in app/ or i18n/; second assertion duplicates the hint-hidden check of the it.each test (also removed the now-unused makeBanner helper)
test/nuxt/banner-mutations.test.ts :: creates a promo banner from the large artwork alone, sending no mobile part :: composable-limit :: useBanniereMutations keeps its single create test; this behaviour is also covered at component level in banner-edit-save
test/nuxt/banner-mutations.test.ts :: removes the mobile artwork with DELETE on its image route, and invalidates the list :: composable-limit :: second test of useBanniereMutations
test/nuxt/banner-mutations.test.ts :: sends only the given patch as JSON and invalidates the list :: composable-limit :: third test of useBanniereMutations
test/nuxt/banner-mutations.test.ts :: sends the replacement file under field fichier to the variante-specific path, and invalidates the list :: composable-limit :: fourth test of useBanniereMutations
test/nuxt/banner-mutations.test.ts :: sends { emplacement, ids } as JSON and invalidates the list :: composable-limit :: fifth test of useBanniereMutations
test/nuxt/banner-mutations.test.ts :: sends DELETE and invalidates the list :: composable-limit :: sixth test of useBanniereMutations (also removed the now-unused `readBody` import)
test/nuxt/banner-panel-details.test.ts :: names the editor and shows their initials on the avatar :: duplicate :: the same assertions live in banner-editor-pill's "names the editor and shows their initials", and the "Last edit by" regex test already checks initials plus name in the rail
test/nuxt/banner-panel-details.test.ts :: does not fetch a picture from anywhere ... :: markup :: asserts no `<img>` element exists
test/nuxt/banner-panel-details.test.ts :: speaks French when the panel does :: framework :: i18n key lookups only (also removed the now-unused `flushPromises` import and the dead locale reset in afterEach)
test/nuxt/banner-panel-details.test.ts :: sits at the end of the details, as their last row :: markup :: DOM position (`lastElementChild`)

## Borderline (kept)

test/unit/api-error.test.ts :: maps status %s (it.each, 9 rows) :: mirrors the status-to-key lookup table, though 500/503 exercise the `>= 500` fallback branch
test/unit/api-error.test.ts :: never surfaces the raw error message, even when the caller provides one :: asserts `not.toHaveProperty("detail")`, a property toApiError no longer produces (it now returns `headline` from `data.message`), so it may be stale and unable to fail; kept because its title cites the no-leak requirement and the card spec covers the component side
test/unit/api-query-keys.test.ts :: keeps one customer's order history distinct ... :: same pattern as the products list test, but a different factory and guards cross-customer cache collision
test/unit/api-query-keys.test.ts :: keys one product's inventory below the products prefix ... :: partly a literal mirror, but guards that inventory is invalidated with the products prefix
test/unit/ai-rate-limit.test.ts :: supports the default 50-per-hour scenario ... :: expected value recomputed from the same constant, but it is the only test of the default window
test/nuxt/auth-identity.test.ts :: revalidates the seeded identity on mount and window focus :: exercises vue-query refetch behaviour, but it is our wiring for deactivated-account detection
test/nuxt/api-error-card.test.ts :: shows a human headline for a known status :: overlaps with the no-raw-message test, which also asserts a headline
test/nuxt/banner-artwork-preview.test.ts :: requests a resized IPX thumbnail, not the full artwork :: leans on @nuxt/image, but it is the only guard that our IPX config is wired and the host is trusted
test/unit/banner-artwork.test.ts :: storedMobileDimensions reads the stored phone artwork size :: near field-rename mapping; its null counterpart is real logic
test/nuxt/banner-card.test.ts :: renders a banner without a mobile artwork ... / keeps the wide frame ... :: assert Tailwind aspect classes next to real behaviour (large-image fallback, no-mobile warning text)
test/nuxt/banner-editor-pill.test.ts :: the card > puts the crown beside the name here too :: same crown logic as the pill tests; kept as the only check that the card renders the crown
test/nuxt/banner-editor-pill.test.ts :: the pill > can be reached from the keyboard :: asserts a `tabindex` attribute (a11y, but near markup)
test/nuxt/banner-editor-pill.test.ts :: the card > speaks French when the panel does :: mostly i18n lookups, but covers locale-aware month formatting passed to formatMonthYear
test/nuxt/banner-editor-pill.test.ts :: copying the email > is an icon-only button next to the address, named for assistive tech :: aria-label (a11y) mixed with an empty-text-content markup check
test/nuxt/banner-form-layout.test.ts :: artwork sizes > shows the size of the saved phone artwork next to what can be done with it :: aria-labels (a11y) mixed with an empty-text markup check
test/nuxt/banner-form-layout.test.ts :: phone artwork block > (5 remaining copy tests) :: sentence depends on state (has phone artwork, none, staged removal, no large artwork), but it is wording; reasonable people could call it copy-mirroring
test/nuxt/banner-panel-details.test.ts :: keeps the values other screens and tests read: title, placement and phone artwork :: reads as a leftover-refactor guard; basic display of banner fields (passthrough-ish)
test/nuxt/banner-grid-states.test.ts :: shows the zero-banners empty state ... / shows a distinct no-results state ... :: two halves of one branch (hasActiveFilters), kept as both sides are asserted
test/nuxt/banner-mutations.test.ts :: fetches the complete banner list :: mock returns X, test asserts X; sole guard of the useBannieres endpoint path and a thin single-useQuery wrapper

## Composables with a kept test

useBanniereMutations -> test/nuxt/banner-mutations.test.ts :: sends the create multipart body with every field and both artworks, and invalidates the list
useBannieres -> test/nuxt/banner-mutations.test.ts :: fetches the complete banner list (borderline, only test for this composable)
useApiWrite -> test/nuxt/api-mutations.test.ts :: keeps raw image bytes and caller headers while using the same-origin API path (the other two tests in that file exercise the shared query client's mutation-cache handling, not a composable)

## Notes

- Verification: `bunx oxlint` on all 12 edited files exits 0 with no output. `bunx vitest run --project unit --coverage.enabled=false` on the 11 unit specs in this shard: 98 passed, 2 failed. Both failures are pre-existing and left alone, both in ai-product-copy-service.test.ts:
  1. "sends one structured-output request shaped by the config and a strict closed schema" expects 4 required schema fields but the schema now requires 8 (brand, department, primaryCategory, secondaryCategories added). Stale expectation.
  2. "drops the original provider error so a leaked secret never reaches the thrown error": the secret `sk-live-SECRET` is absent, but the serialized error contains `providerDetail: "[key] upstream body"`, so the `not.toContain("upstream body")` assertion fails. The title is security-relevant, so someone should decide whether the test or the sanitizer is stale.
- test/nuxt specs were not run, per the rubric. They were verified by reading plus oxlint.
- No file was deleted. `test/nuxt/apercu-fixture.ts` is a helper, not a spec, and is still imported by three other specs (stats-blocks, index-metadata, stats-partial-contract).
- The removals I am least sure about, in case the coordinator wants to restore any: the static-label tests in banner-form-layout (3 tests, tagged tautology) and the two French-locale tests (form-layout, panel-details, tagged framework).
- Left in place: the unused `focus` override parameter of `mount()` in banner-artwork-preview and the unused `banners` / `canWrite` override parameter of `mountGroup()` in banner-info-tips. They were not made dead by my removals in the former, and are harmless in the latter.
- Files other agents are editing in the same working tree (`git status` shows many other test files modified) were not touched.

## Shard 3 manifest

Counts treat each `it.each(...)` as one test. Fixtures/helpers with no tests (`comptoirs-fixture.ts`, `delivery-fixture.ts`, `fake-intersection-observer.ts`) were read and left untouched: they are imported by many specs outside this shard.

| file | tests before | tests after | removed | file deleted |
| :-- | --: | --: | --: | :-- |
| test/nuxt/banner-publish-toggle.test.ts | 1 | 1 | 0 | no |
| test/nuxt/banner-reorder-request.test.ts | 4 | 4 | 0 | no |
| test/nuxt/banner-role-gating.test.ts | 2 | 2 | 0 | no |
| test/unit/banniere-schema.test.ts | 30 | 25 | 5 | no |
| test/nuxt/caisse-count-dialog.test.ts | 5 | 5 | 0 | no |
| test/nuxt/caisse-detail-panel.test.ts | 13 | 13 | 0 | no |
| test/unit/caisse-duty.test.ts | 13 | 11 | 2 | no |
| test/unit/caisse-ecart-motifs.test.ts | 2 | 2 | 0 | no |
| test/nuxt/caisse-list-panel.test.ts | 4 | 4 | 0 | no |
| test/nuxt/caisse-validate-dialog.test.ts | 4 | 4 | 0 | no |
| test/nuxt/caisse-workspace.test.ts | 4 | 4 | 0 | no |
| test/nuxt/catalogue-caisse-api.test.ts | 6 | 4 | 2 | no |
| test/unit/categorie-schema.test.ts | 6 | 6 | 0 | no |
| test/nuxt/category-product-card.test.ts | 5 | 4 | 1 | no |
| test/nuxt/category-toolbar.test.ts | 12 | 12 | 0 | no |
| test/unit/category-tree.test.ts | 4 | 4 | 0 | no |
| test/unit/check-translations.test.ts | 5 | 5 | 0 | no |
| test/nuxt/comptoirs-fixture.ts | n/a | n/a | 0 | no |
| test/unit/comptoirs.test.ts | 13 | 13 | 0 | no |
| test/nuxt/content-page.test.ts | 4 | 4 | 0 | no |
| test/nuxt/customers-api.test.ts | 4 | 2 | 2 | no |
| test/unit/date-field.test.ts | 10 | 10 | 0 | no |
| test/nuxt/date-picker-context.test.ts | 2 | 2 | 0 | no |
| test/unit/dates.test.ts | 6 | 5 | 1 | no |
| test/unit/delai-livraison-schema.test.ts | 16 | 14 | 2 | no |
| test/unit/delivery-draft.test.ts | 8 | 8 | 0 | no |
| test/nuxt/delivery-fixture.ts | n/a | n/a | 0 | no |
| test/nuxt/delivery-interval-mutations.test.ts | 5 | 4 | 1 | no |
| test/nuxt/delivery-interval-query.test.ts | 2 | 1 | 1 | no |
| test/unit/delivery-interval.test.ts | 33 | 27 | 6 | no |
| test/unit/delta.test.ts | 7 | 6 | 1 | no |
| test/nuxt/download-file.test.ts | 4 | 3 | 1 | no |
| test/unit/empty-value.test.ts | 2 | 2 | 0 | no |
| test/nuxt/fake-intersection-observer.ts | n/a | n/a | 0 | no |
| test/unit/filter-caisses.test.ts | 7 | 7 | 0 | no |
| test/unit/find-member-by-email.test.ts | 5 | 5 | 0 | no |
| test/unit/form-errors.test.ts | 3 | 3 | 0 | no |
| test/unit/gauge.test.ts | 3 | 3 | 0 | no |
| test/unit/history-image-value.test.ts | 4 | 4 | 0 | no |
| test/nuxt/index-metadata.test.ts | 1 | 1 | 0 | no |
| test/nuxt/info-tip.test.ts | 3 | 2 | 1 | no |
| test/nuxt/inline-tag-selector.test.ts | 1 | 1 | 0 | no |
| test/unit/inventaire-schema.test.ts | 10 | 10 | 0 | no |
| **Total** | **273** | **247** | **26** | **0 files** |

Removed by category: duplicate 16, composable-limit 4, coverage 2, markup 1, tautology 1, framework 1, passthrough 1.

## Removals
test/unit/banniere-schema.test.ts :: banniereSchema > href > rejects an absolute external URL :: duplicate :: `href` is `hrefSchema`, already covered by the standalone `hrefSchema` suite
test/unit/banniere-schema.test.ts :: banniereSchema > href > rejects a path missing its leading slash :: duplicate :: same as the `hrefSchema` case
test/unit/banniere-schema.test.ts :: banniereSchema > href > rejects a 301-character path as too long :: duplicate :: same as the `hrefSchema` case
test/unit/banniere-schema.test.ts :: banniereSchema > href > accepts a path of exactly 300 characters, the inclusive boundary :: duplicate :: same as the `hrefSchema` case
test/unit/banniere-schema.test.ts :: banniereSchema > href > accepts a path of exactly 1 character :: duplicate :: same as the `hrefSchema` case (the single open-redirect case kept in `banniereSchema > href` is the field-wiring check)
test/unit/caisse-duty.test.ts :: canValidateCaisse > allows a third person to validate it :: duplicate :: same predicate and code path as the kept "lets whoever counted it validate it" case (only the id differs)
test/unit/caisse-duty.test.ts :: validateDisabledReason > gives no reason for a qualified second person :: duplicate :: already asserted by the `COUNTER -> null` line of the preceding test
test/nuxt/catalogue-caisse-api.test.ts :: keeps caisse list, detail, and mutation response contracts independent :: coverage :: only `expectTypeOf`, a runtime no-op (no vitest typecheck configured); matches hand-built literals against hand-written types
test/nuxt/catalogue-caisse-api.test.ts :: models the bounded catalogue ingestion and proposal query contracts :: coverage :: same, type-level only, cannot fail at runtime
test/nuxt/category-product-card.test.ts :: puts the price and the stock badge on one row, price first :: markup :: asserts DOM parent and document order only
test/nuxt/customers-api.test.ts :: fetches the customer annuaire with server filters, page one, and the fixed page size :: composable-limit :: second test for `useCustomers`; kept the pagination test (real getNextPageParam logic)
test/nuxt/customers-api.test.ts :: fetches the selected customer account detail without exposing a legacy profile-only shape :: composable-limit :: second test for `useCustomer`; also a mock echo; kept the enabled-only-when-selected test
test/unit/dates.test.ts :: shop-time formatting > tells the three granularities apart :: duplicate :: fully implied by the exact-value assertions of "reads instants in Douala time rather than the host's"
test/unit/delai-livraison-schema.test.ts :: delai-livraison constants > caps values at 999 and lists the six units :: tautology :: mirrors two exported constants back at themselves
test/unit/delai-livraison-schema.test.ts :: delaiLivraisonPatchSchema > rejects a non-boolean actif :: framework :: `z.boolean()` rejecting a string is Zod's own behaviour
test/nuxt/delivery-interval-mutations.test.ts :: rejects a 409 unchanged and invalidates nothing :: composable-limit :: second test for `useCreateDeliveryInterval`; the error path is vue-query behaviour plus `toApiError`
test/nuxt/delivery-interval-query.test.ts :: goes into error state without data when the endpoint returns 500 :: composable-limit :: second test for `useDeliveryIntervals`; mostly vue-query's isError semantics
test/unit/delivery-interval.test.ts :: deliveryIntervalLabel > turns a single 4320 minutes into 72 hours :: duplicate :: same `displayBound` path as "single 60 -> 1 hour" and the 30..4320 default range
test/unit/delivery-interval.test.ts :: deliveryIntervalLabel > keeps a 30..45 minutes range in minutes :: duplicate :: same failure mode as the `minutes` row of the range `it.each` and the kept 45..90 case
test/unit/delivery-interval.test.ts :: deliveryIntervalLabel > leaves a 5..10 jours ouvres range unchanged :: duplicate :: the range `it.each` already covers `jours_ouvres`
test/unit/delivery-interval.test.ts :: deliveryIntervalLabel > uses count 1 for a single value of one so the singular form is picked :: duplicate :: `count` is the value with no special case for 1; the single `it.each` asserts count
test/unit/delivery-interval.test.ts :: deliveryIntervalLabel > collapses a 1-1 range to a single with count 1 :: duplicate :: same collapse as the kept "range whose max equals min" case
test/unit/delivery-interval.test.ts :: deliveryIntervalLabel > uses the upper bound as the plural count for a 1-2 range :: duplicate :: the range `it.each` already asserts `count` equals max
test/unit/delta.test.ts :: computeDelta > always returns a finite pct whenever the previous value is non-zero :: duplicate :: same input (-100, -50) as the kept negative-baseline case, which already asserts a non-null negative pct
test/nuxt/download-file.test.ts :: keeps the order export download observable behaviour :: passthrough :: `downloadOrderExport` only calls `downloadBlob`, which the first test covers
test/nuxt/info-tip.test.ts :: is an icon alone, named for assistive tech rather than by visible text :: duplicate :: default aria-label already asserted by "names itself More information..."; the empty-text check is markup

Dead code cleaned: `catalogue-caisse-api` (unused `expectTypeOf` import and the `@/types/api/caisse` and `@/types/api/catalogue` type imports), `delai-livraison-schema` (unused `DELAI_MAX_VALEUR`, `DELAI_UNITES` imports), `delivery-interval-mutations` (unused `toApiError` import), `download-file` (unused `downloadOrderExport` import).

## Borderline (kept)
test/nuxt/banner-reorder-request.test.ts :: shows an empty promo carousel rather than hiding it :: asserts user-visible empty-state copy; could be read as markup
test/nuxt/caisse-count-dialog.test.ts :: disables the trigger and carries the duty reason as a title when disabled :: the same disabled attr and title is asserted end-to-end in caisse-detail-panel, so it may be redundant
test/nuxt/caisse-validate-dialog.test.ts :: disables the trigger and carries the reason as a title when disabled :: same overlap with the caisse-detail-panel validate tests
test/nuxt/caisse-list-panel.test.ts :: filters by the given criteria, across every status / filters to one porteur when the criteria's selectedPorteurId is set :: the filtering logic is unit-tested in filter-caisses; these only prove the panel passes criteria through
test/unit/caisse-duty.test.ts :: countDisabledReason (both tests) :: thin wrapper over canCountCaisse; mostly asserts the reason key
test/unit/caisse-ecart-motifs.test.ts :: includes the exact non_explique sentinel the backend's alert logic matches on :: pins a constant against a literal, but guards a cross-repo contract
test/nuxt/catalogue-caisse-api.test.ts :: fetches a proposal directly by id for stable deep links :: mock echo; only proves the request path (the single test for useCatalogueProposal)
test/nuxt/category-toolbar.test.ts :: joins expand and collapse into one group of icon-only buttons, each named for assistive tech :: mixes markup (parent, data-slot, empty text) with a11y labels; the labels are not asserted elsewhere
test/nuxt/category-toolbar.test.ts :: renders a chip for an active visibility filter :: close cousin of the department-chip test, differs only by field config
test/nuxt/date-picker-context.test.ts :: does not render the date-range popup until the trigger opens it :: mostly Ark UI lazy-mount behaviour
test/unit/delai-livraison-schema.test.ts :: rejects a numeric string as required, without coercing it :: Zod parsing, but guards a switch to z.coerce
test/unit/delai-livraison-schema.test.ts :: delaiLivraisonPatchSchema > rejects an unknown unit :: z.enum behaviour with a weak assertion
test/unit/inventaire-schema.test.ts :: rejects an unknown type :: z.enum behaviour with a weak assertion
test/nuxt/index-metadata.test.ts :: provides localized SEO metadata :: re-states i18n copy from en.json (brittle), but would catch broken SEO wiring

## Composables with a kept test
useCatalogue -> test/nuxt/catalogue-caisse-api.test.ts :: fetches ingestion state and paginated proposals
useCatalogueProposal -> test/nuxt/catalogue-caisse-api.test.ts :: fetches a proposal directly by id for stable deep links
useCatalogueMutations -> test/nuxt/catalogue-caisse-api.test.ts :: sends proposal decisions and invalidates catalogue and product data only after success
useCaisse, useCaisses, useCaisseEncours, useCaisseMutations -> test/nuxt/catalogue-caisse-api.test.ts :: reads caisse surfaces and sends reconciliation commands (one test exercising all four)
useCustomers -> test/nuxt/customers-api.test.ts :: requests only the next annuaire page and appends its customer elements
useCustomer -> test/nuxt/customers-api.test.ts :: does not request customer detail until a route selection exists
useDeliveryIntervals -> test/nuxt/delivery-interval-query.test.ts :: fetches the delivery intervals array under the deliveryIntervals key
useCreateDeliveryInterval -> test/nuxt/delivery-interval-mutations.test.ts :: creates by POSTing the body as given, returning the created option and refreshing only the interval list
useUpdateDeliveryInterval -> test/nuxt/delivery-interval-mutations.test.ts :: updates by PATCHing the patch to the option's URL and refreshes intervals and products
useArchiveDeliveryInterval -> test/nuxt/delivery-interval-mutations.test.ts :: archives by PATCHing exactly { actif: false } and refreshes intervals and products
useRestoreDeliveryInterval -> test/nuxt/delivery-interval-mutations.test.ts :: restores by PATCHing exactly { actif: true } and leaves products alone

## Notes
- `bunx oxlint` on all 13 edited files: clean (exit 0, no output). Confirmed oxlint does flag unused imports on a throwaway probe file, so the empty output is real.
- `bunx vitest run --project unit --coverage.enabled=false` on the 6 edited unit specs (banniere-schema, caisse-duty, delai-livraison-schema, delivery-interval, delta, dates): 6 files, 104 tests, all pass. Nuxt specs were not run, per the rubric; they were verified by reading and oxlint.
- No pre-existing failures in this shard.
- `test/nuxt/delivery-interval-mutations.test.ts`: the `run()` helper still catches errors into `outcome.error`, but no kept test reads it now. Left as is, because rewriting helpers is out of scope; it could be simplified later.
- The CLAUDE/AGENTS rule "write a composable test only on request, at most one" is the reason the second test for `useCustomers`, `useCustomer`, `useCreateDeliveryInterval` and `useDeliveryIntervals` was dropped. Other shards may also test these composables; reconcile at the coordinator level.
- `git status` shows many other modified files from sibling shards; none of those were touched here.

## Shard 4 manifest

Totals: 255 tests before, 229 after, 26 removed. No file deleted. Per category: composable-limit 8, tautology 7, markup 4, duplicate 6, passthrough 1.

| file | tests before | tests after | removed | file deleted |
| :-- | --: | --: | --: | :-- |
| test/unit/inventory-actor.test.ts | 4 | 4 | 0 | no |
| test/nuxt/inventory-fixture.ts (helper, not a spec) | 0 | 0 | 0 | no |
| test/unit/inventory-movement.test.ts | 5 | 5 | 0 | no |
| test/nuxt/language-switcher.test.ts | 1 | 1 | 0 | no |
| test/unit/local-storage.test.ts | 5 | 5 | 0 | no |
| test/nuxt/login-form.test.ts | 6 | 6 | 0 | no |
| test/nuxt/login-page.test.ts | 2 | 2 | 0 | no |
| test/unit/login-schema.test.ts | 7 | 7 | 0 | no |
| test/nuxt/login-submit.test.ts | 3 | 3 | 0 | no |
| test/unit/logo-dev.test.ts | 2 | 2 | 0 | no |
| test/nuxt/message-avatar.test.ts | 6 | 5 | 1 | no |
| test/unit/message-avatar.test.ts | 5 | 5 | 0 | no |
| test/unit/money.test.ts | 7 | 6 | 1 | no |
| test/nuxt/operations-page.test.ts | 3 | 3 | 0 | no |
| test/unit/order-confirm-conflict.test.ts | 10 | 10 | 0 | no |
| test/unit/order-date-range.test.ts | 11 | 11 | 0 | no |
| test/unit/order-export-bff.test.ts | 1 | 1 | 0 | no |
| test/unit/order-export.test.ts | 3 | 3 | 0 | no |
| test/unit/order-transitions.test.ts | 7 | 7 | 0 | no |
| test/unit/order-workspace-store.test.ts | 7 | 5 | 2 | no |
| test/nuxt/orders-action-bar.test.ts | 3 | 3 | 0 | no |
| test/nuxt/orders-api.test.ts | 10 | 3 | 7 | no |
| test/nuxt/orders-comptoir-filter.test.ts | 7 | 7 | 0 | no |
| test/nuxt/orders-confirm-conflict-names.test.ts | 5 | 4 | 1 | no |
| test/nuxt/orders-detail-skeleton.test.ts | 2 | 1 | 1 | no |
| test/nuxt/orders-detail-workspace.test.ts | 14 | 14 | 0 | no |
| test/nuxt/orders-export-dialog.test.ts | 3 | 3 | 0 | no |
| test/nuxt/orders-filter-bar.test.ts | 4 | 3 | 1 | no |
| test/nuxt/orders-hydration.test.ts | 2 | 2 | 0 | no |
| test/nuxt/orders-list-panel.test.ts | 4 | 3 | 1 | no |
| test/nuxt/orders-livreur-visibility.test.ts | 8 | 8 | 0 | no |
| test/nuxt/orders-page-tabs.test.ts | 3 | 2 | 1 | no |
| test/nuxt/orders-payment-dialog.test.ts | 3 | 3 | 0 | no |
| test/nuxt/orders-perimetre.test.ts | 5 | 5 | 0 | no |
| test/nuxt/orders-quotes-tab-routing.test.ts | 1 | 1 | 0 | no |
| test/nuxt/orders-status-filter-pills.test.ts | 5 | 5 | 0 | no |
| test/nuxt/orders-transition-dialog.test.ts | 9 | 9 | 0 | no |
| test/nuxt/overview-date-field.test.ts | 5 | 5 | 0 | no |
| test/nuxt/overview-pricing.test.ts | 3 | 2 | 1 | no |
| test/unit/periode-bounds.test.ts | 12 | 11 | 1 | no |
| test/unit/periode.test.ts | 10 | 4 | 6 | no |
| test/unit/phosphor-icons.test.ts | 1 | 1 | 0 | no |
| test/nuxt/pill-tabs.test.ts | 2 | 2 | 0 | no |
| test/unit/point-of-sale.test.ts | 28 | 28 | 0 | no |
| test/unit/point-vente-schema.test.ts | 8 | 8 | 0 | no |
| test/nuxt/points-of-sale-api.test.ts | 3 | 1 | 2 | no |

(Counts are `it(` / `it.each(` entries; an `it.each` is one test.)

## Removals
test/nuxt/message-avatar.test.ts :: shows a human's initials from their email when present :: duplicate :: email+name both give "AN", so it cannot tell the email path from the name path; the visiteur-initials component test and the initialsFromEmailOrName unit spec already cover it.
test/unit/money.test.ts :: keeps every digit of the exact figure in fr, uncompacted by notation :: duplicate :: identical assertion to the en case; formatMontant has no locale branch, so the locale adds no failure mode.
test/unit/order-workspace-store.test.ts :: starts with a recent sort and the fixed page size, and no search or status filter :: tautology :: mirrors the store's default constants; every other test in the file asserts the same `{ tri: "recent", taille: 50 }` shape with toStrictEqual.
test/unit/order-workspace-store.test.ts :: updates the sort filter :: passthrough :: setter then getter with no logic (the one real branch, `?? "recent"`, is not what it tests).
test/nuxt/orders-api.test.ts :: forwards q, tri, statut, and taille from the filters into the request query, together with the page :: composable-limit :: useOrders keeps one test (pagination walk).
test/nuxt/orders-api.test.ts :: forwards clientId together with the normal first-page parameters when scoping the list to one customer :: composable-limit :: same.
test/nuxt/orders-api.test.ts :: reports no next page and never issues a further request once the first page is already the last one :: composable-limit :: same; the kept pagination walk already asserts hasNextPage flips to false on the last page.
test/nuxt/orders-api.test.ts :: surfaces a preparation-role order response with financier-only fields entirely absent :: composable-limit :: same; also tautology, since the mock returns X and the test asserts X came back (no filtering logic in the composable).
test/nuxt/orders-api.test.ts :: fetches an order detail by reference :: composable-limit :: useOrder keeps one test ("does not request order detail until a reference is selected"), which also asserts the fetch once selected.
test/nuxt/orders-api.test.ts :: refetches the order list when the store's filters change :: composable-limit :: useOrders keeps one test; mostly vue-query key reactivity.
test/nuxt/orders-api.test.ts :: confirms and collects payment through their separate admin endpoints :: composable-limit :: useOrderMutations keeps one test (advance).
test/nuxt/orders-confirm-conflict-names.test.ts :: shows the product name when the map has the slug and the slug otherwise (ConfirmConflict) :: duplicate :: same props and assertions as the dialog test "falls back to the slug for a product the map does not name", one layer lower.
test/nuxt/orders-detail-skeleton.test.ts :: mirrors the 2-column Command Center operational layout :: markup :: seven data-testid existence checks, pure DOM structure.
test/nuxt/orders-filter-bar.test.ts :: renders the status filter inline alongside search and sort, not tucked behind a menu :: markup :: counts "Remove filter" elements and recomputes the expected count from the fixture length.
test/nuxt/orders-list-panel.test.ts :: shows every loaded order when no date range is set :: duplicate :: "renders the annuaire rows and emits the selected reference" already shows every loaded row with no dateRange, and order-date-range.test.ts covers the no-range path in the util.
test/nuxt/orders-page-tabs.test.ts :: renders the orders filters below the title and tabs, not in the header toolbar :: markup :: DOM position via compareDocumentPosition and absence of a toolbar element.
test/nuxt/overview-pricing.test.ts :: explains the optional discount window in a tooltip beside each date label, not in a paragraph :: markup :: parent/child element placement and tooltip element count.
test/unit/periode-bounds.test.ts :: reports granularite %s -> %s (it.each) :: tautology :: mirrors the GRANULARITES lookup table; heure, jour and mois are already asserted in the aujourdhui, 7j and 12mois tests.
test/unit/periode.test.ts :: falls back to 30j for an empty string, which is what ?periode= produces :: duplicate :: same code path as the "bogus" string case (no empty-string special case).
test/unit/periode.test.ts :: falls back to 30j for undefined, a missing query parameter :: duplicate :: same code path as the null case (no nullish special case).
test/unit/periode.test.ts :: maps aujourdhui to heure :: tautology :: mirrors the GRANULARITES lookup.
test/unit/periode.test.ts :: maps %s to jour (it.each 7j, 30j, 3mois) :: tautology :: mirrors the lookup.
test/unit/periode.test.ts :: maps 12mois to mois :: tautology :: mirrors the lookup.
test/unit/periode.test.ts :: yields a granularite for every member of PERIODES, so adding a preset without wiring it up fails here :: tautology :: `Record<Periode, Granularite>` already enforces completeness at typecheck.
test/nuxt/points-of-sale-api.test.ts :: reads the administration list, closed counters included :: tautology :: usePointsVente is a bare useQuery; the mock returns `rows` and the test asserts `rows` came back. Also composable-limit-adjacent: it is the only test for that composable and it has no logic to protect.
test/nuxt/points-of-sale-api.test.ts :: sends each write as JSON to its route and invalidates the list :: composable-limit :: usePointVenteMutations keeps one test (the optimistic reorder, which is real logic: onMutate + sortByIds).

Dead code removed alongside: `storeToRefs` and `useOrderWorkspaceStore` imports plus the `preparationOrder` / `preparationAnnuaireOrder` fixtures in orders-api.test.ts; the `ConfirmConflict` import in orders-confirm-conflict-names.test.ts; the `periodeGranularite` import in periode.test.ts; the `H3Event` type, `getMethod` and `usePointsVente` imports in points-of-sale-api.test.ts.

## Borderline (kept)
test/nuxt/login-page.test.ts :: mounts the login form and showcase panel at /login :: close to a smoke test, and login-submit.test.ts also mounts the app at /login; kept because it asserts the English showcase copy.
test/nuxt/orders-comptoir-filter.test.ts :: offers the published counters as a repeatable choice :: only asserts the chip text "Akwa", and key and label are both "Akwa", so it cannot tell key from label; it does prove the comptoir field is registered.
test/nuxt/orders-detail-skeleton.test.ts :: renders a structured skeleton UI with accessible status and aria attributes :: mixed. The role=status, aria-busy and label assertions are a11y and worth keeping; the skeleton-count (`> 15`) and "no border class" assertions are markup. Left untouched under the "do not rewrite kept tests" rule. A coordinator may want to trim those lines.
test/nuxt/orders-filter-bar.test.ts :: renders the created-at range chip inline, not tucked behind a menu :: layout-flavoured (absence of "Add filter"), though it also asserts the visible "Created" label.
test/nuxt/orders-payment-dialog.test.ts :: is the primary action only at the money-changes-hands stages... :: asserts `data-variant` (a styling variant), but the underlying rule (which status gets the primary emphasis) is logic.
test/nuxt/orders-status-filter-pills.test.ts :: renders exactly one pill per status, labeled with the matching orders.status copy :: the label table is a hard-coded mirror of the en.json strings; the "one pill per status" half is a real guard.
test/nuxt/overview-pricing.test.ts :: no longer offers a manual in-stock switch, since stock follows the inventory movements :: absence-of-element test, but it encodes a business decision.
test/nuxt/orders-hydration.test.ts :: both tests :: assert no hydration warnings and count `<button` in SSR HTML. They guard a real SSR regression class on vendored vuzeno components, but it is partly DOM structure.
test/unit/phosphor-icons.test.ts :: every icon the app names exists in the installed set :: a static scan of source against node_modules, not a function or component test; it can fail for a reason that matters (empty icon boxes).
test/unit/order-date-range.test.ts :: places a late-UTC evening on the Douala day it actually falls on :: overlaps the shopDay test, but exercises the range predicate at the boundary.
test/unit/order-export.test.ts :: names the download after the reference, document, and locale :: the expected literal mirrors the one-line template.
test/unit/point-of-sale.test.ts :: links to the pin on Google Maps :: the hard-coded URL mirrors the one-line template; the only logic is lat/lng order.
test/unit/point-of-sale.test.ts :: point of sale wizard step validation (2 tests) :: partly overlap point-vente-schema.test.ts, but they exercise the separate step schemas.
test/nuxt/orders-confirm-conflict-names.test.ts :: names each unavailable product instead of showing only its slug :: same assertions as the DetailPanel test via a shorter path; kept so a dialog-to-ConfirmConflict prop break is caught without the heavier page setup.
test/unit/order-confirm-conflict.test.ts :: extracts totals nested under data.data :: same nesting as the stock case, but a different branch (drift).
test/unit/periode.test.ts :: parses the valid preset %s to itself :: iterates the same PERIODES constant the implementation checks against, but it is the only positive-path test for parsePeriode.
test/unit/money.test.ts :: preserves the sign in the exact figure without altering its digits :: leans on Intl negative-number formatting; guards a plausible Math.abs regression.

## Composables with a kept test
useOrders -> test/nuxt/orders-api.test.ts :: walks getNextPageParam forward, requesting the next page and flattening every page's elements
useOrder -> test/nuxt/orders-api.test.ts :: does not request order detail until a reference is selected
useOrderMutations -> test/nuxt/orders-api.test.ts :: advances an order with the backend transition payload
usePointVenteMutations -> test/nuxt/points-of-sale-api.test.ts :: shows the new order before the backend answers
usePointsVente -> none kept (its only test was removed as tautology)

## Notes
- All 18 unit specs in this shard pass: `bunx vitest run --project unit --coverage.enabled=false` gave 18 files and 127 tests, all green. None of the 12 known pre-existing failures belong to this shard.
- `bunx oxlint --format default` on all 13 edited files: 0 warnings, 0 errors. Plain `bunx oxlint` printed nothing when piped; the `--format default` run is the one that reports. I checked that oxlint flags an unused import by running it on a throwaway probe file, which I deleted.
- `test/nuxt/` specs were not run. Edits there were checked by reading the diffs and by oxlint.
- `test/nuxt/inventory-fixture.ts` is a shared helper with no tests. It is imported by 11 other specs and was not touched. None of my removals leave it with dead exports.
- `periodeGranularite` (app/utils/periode.ts) and `usePointsVente` now have no direct test; they are a typed lookup and a bare useQuery respectively.
- The composable-limit choice for useOrders (pagination walk over query forwarding) is a judgment call. Either could stand as the single test.
- git status shows many other modified files from sibling shards; I only touched files listed in shard-4.txt.

## Shard 5 manifest
| file | tests before | tests after | removed | file deleted |
| :-- | --: | --: | --: | :-- |
| test/nuxt/points-of-sale-form.test.ts | 10 | 9 | 1 | no |
| test/nuxt/points-of-sale-page.test.ts | 25 | 25 | 0 | no |
| test/unit/product-form-values.test.ts | 10 | 9 | 1 | no |
| test/unit/product-image-file.test.ts | 4 | 4 | 0 | no |
| test/unit/product-image-url.test.ts | 3 | 3 | 0 | no |
| test/nuxt/product-inventory-action-bar.test.ts | 19 | 18 | 1 | no |
| test/nuxt/product-inventory-actor-pill.test.ts | 14 | 14 | 0 | no |
| test/nuxt/product-inventory-history-paging.test.ts | 8 | 8 | 0 | no |
| test/nuxt/product-inventory-movement-row.test.ts | 3 | 3 | 0 | no |
| test/nuxt/product-inventory-panel.test.ts | 20 | 12 | 8 | no |
| test/unit/product-list-store.test.ts | 4 | 3 | 1 | no |
| test/unit/product-status.test.ts | 4 | 1 | 3 | no |
| test/nuxt/products-add-button-role.test.ts | 2 | 2 | 0 | no |
| test/nuxt/products-ai-suggestions.test.ts | 28 | 27 | 1 | no |
| test/nuxt/products-brand-logo.test.ts | 4 | 4 | 0 | no |
| test/nuxt/products-category-picker.test.ts | 2 | 2 | 0 | no |
| test/nuxt/products-datasheet.test.ts | 7 | 7 | 0 | no |
| test/nuxt/products-delivery-dialog.test.ts | 14 | 13 | 1 | no |
| test/nuxt/products-delivery-manage.test.ts | 10 | 10 | 0 | no |
| **total** | **191** | **174** | **17** | 0 files |

(`it.each` counted as one test. Counts via `grep -cE '^\s*it(\.each)?\('`.)

By category: markup 4, tautology 5, passthrough 1, duplicate 7, composable-limit 0, framework 0, coverage 0.

## Removals
test/nuxt/points-of-sale-form.test.ts :: keeps step headings screen-reader-only and puts identity help behind muted label info buttons :: markup :: asserts `sr-only` / `text-muted-foreground` classes and the presence of info buttons; no behavior.
test/unit/product-form-values.test.ts :: blanks every scalar when adding a product :: tautology :: asserts the `?? ""` / `?? null` constants back at themselves for a null product.
test/unit/product-list-store.test.ts :: starts with an all-items recent first page request :: tautology :: asserts the store's initial constants; the full-reset test asserts the same shape after real mutations.
test/unit/product-status.test.ts :: reports an active, in-stock product as en-stock :: tautology :: mirrors the STOCK_STATUS lookup table.
test/unit/product-status.test.ts :: reports an active, out-of-stock product as rupture :: tautology :: mirrors the STOCK_STATUS lookup table.
test/unit/product-status.test.ts :: reports an active product awaiting restock as reapprovisionnement :: tautology :: mirrors the STOCK_STATUS lookup table. (The withdrawn-overrides-stock `it.each` is the real logic and stays.)
test/nuxt/product-inventory-action-bar.test.ts :: layout > carries the Stock movements heading and the adjust action :: markup :: static heading text plus an adjust-button-exists check that every adjusting test already relies on and the "until the first page has loaded" test asserts after load. (Also removed the now-unused `BAR` constant.)
test/nuxt/product-inventory-panel.test.ts :: has exactly the columns Date, Type, Variation, Balance, Reason, By, Order, in that order :: markup :: header-cell structure and count.
test/nuxt/product-inventory-panel.test.ts :: balance cell > tells assistive tech the movement in words :: duplicate :: "From 37 to 42" is already asserted on the row's balance cell in "renders one table row per movement".
test/nuxt/product-inventory-panel.test.ts :: type cell > carries the translated movement type :: duplicate :: Reception / Correction are asserted in "renders one table row per movement" and Order confirmed in "shows the order reference of a movement caused by an order".
test/nuxt/product-inventory-panel.test.ts :: reason cell > shows an em dash with no title when there is no reason :: duplicate :: the em dash for a missing reason is asserted in "shows an em dash for a missing reason and a missing order reference"; the extra "no title" check is attribute markup.
test/nuxt/product-inventory-panel.test.ts :: actor cell > puts the system pill in the By cell for a system movement :: passthrough :: prop forwarding to the actor pill; system vs team behavior is covered in product-inventory-actor-pill.test.ts.
test/nuxt/product-inventory-panel.test.ts :: renders no arrow character in any row :: duplicate :: same `not.toMatch(/→|->/)` check as "balance cell > shows before and after with an icon instead of an arrow character", on a second row.
test/nuxt/product-inventory-panel.test.ts :: panel shows the table only > carries no quantity, status, updated text, skeleton, action or heading of the old summary :: markup :: absence of removed testids; the comptoir test already asserts no adjust/restocking control.
test/nuxt/product-inventory-panel.test.ts :: footer > says how many of the total movements are shown :: duplicate :: "Showing 3 of 3 movements." is asserted after load-more in the paging spec ("counts the loaded movements against the total").
test/nuxt/products-ai-suggestions.test.ts :: shows the AI generate control to a direction user :: duplicate :: ~25 other tests in the file `get(GENERATE)` as direction and click it; the non-direction test remains as the authorization check.
test/nuxt/products-delivery-dialog.test.ts :: locks a single-value option that is in use :: duplicate :: lock is a single `utilise_par > 0` computed, identical for single and range; "explains and locks the value fields of an option products already use" covers every locked control. (Also removed the now-unused `IN_USE_OPTION` import.)

Dead code cleaned: `BAR` const (action-bar), `IN_USE_OPTION` import (delivery-dialog), empty `describe` blocks "type cell", "panel shows the table only" and "footer" (panel). No `vi.mock` blocks or fixtures became dead. No file ended empty.

## Borderline (kept)
test/nuxt/points-of-sale-page.test.ts :: shows identity refusals before progressing and makes no request :: overlaps "requires a valid identity before advancing" (both block the identity step on missing fields); kept for the no-request assertion and the quartier/repere invalid checks.
test/unit/product-form-values.test.ts :: reads scalars from an existing product, keeping a missing brand null :: mostly `??` pass-through, kept for the null-to-"" and null-brand robustness cases.
test/unit/product-form-values.test.ts :: reads the description fields, turning absent ones into empty strings :: same as above (null handling only).
test/unit/product-form-values.test.ts :: keeps a product on the inherited default as null and a chosen one as its id :: small `?? null`, kept because null vs id carries business meaning.
test/nuxt/product-inventory-movement-row.test.ts :: shows a gain in the success colour / shows a loss in the destructive colour :: assertions are class names, but the class is the only output of the sign branch (gain/loss/neutral); the "0 is not a loss" case is clearly worth keeping.
test/nuxt/product-inventory-actor-pill.test.ts :: reads Système in French :: i18n lookup of our own key; may be covered by `i18n:check` key parity, kept as it proves the component goes through i18n.
test/nuxt/product-inventory-actor-pill.test.ts :: keeps the id reachable as the pill's title :: attribute assertion (title), but a deliberate user-visible tooltip for unresolved members.
test/nuxt/product-inventory-actor-pill.test.ts :: can be reached from the keyboard :: tabindex assertion, kept as a11y behavior.
test/nuxt/product-inventory-panel.test.ts :: balance cell > reads in French when the panel does :: same French-translation pattern as above.
test/nuxt/product-inventory-panel.test.ts :: formats the date of each movement :: loose regex assertion, kept because it guards against raw ISO / Invalid Date reaching the user.
test/nuxt/product-inventory-panel.test.ts :: reason cell > shows the reason and exposes the full text as its title :: title attribute, kept as the tooltip for truncated text.
test/nuxt/product-inventory-panel.test.ts :: actor cell > puts the actor pill for a team member in the By cell :: mostly prop forwarding, kept because it asserts the resolved roster name end to end.
test/nuxt/product-inventory-action-bar.test.ts :: shares one inventory request with the movements table :: leans on vue-query key sharing, kept because duplicate requests matter under the backend's shared 10 req/s throttler.
test/nuxt/product-inventory-action-bar.test.ts :: shows the newly recorded movement first in the table beside it :: overlaps "refreshes ... after a movement" (invalidation); kept as it checks the visible outcome.
test/nuxt/products-ai-suggestions.test.ts :: applying the short-description card / long-description card writes only that textarea (with the name and features apply tests) :: near-identical structure per field, kept because each field has its own wiring.
test/nuxt/products-ai-suggestions.test.ts :: shows no text on the generate control and still names it for assistive technology :: includes `text() === ""` (markup) but the aria-label is a11y behavior.
test/nuxt/products-delivery-manage.test.ts :: does not offer restore on an active option :: complement of the archived-option test, shares the same conditional.
test/nuxt/products-delivery-manage.test.ts :: opens the edit dialog for an unused option without the lock hint :: complement of the in-use test, lock logic itself is covered in the dialog spec; kept for wiring of the right row.
test/nuxt/products-delivery-dialog.test.ts :: exposes the mode toggles as pressed state :: a11y state (aria-pressed) plus mode switching.

## Composables with a kept test
None. None of the 19 files has a composable as its subject under test (product-list-store is a Pinia store, the rest are utils and components/pages).

## Notes
- `bunx vitest run --project unit --coverage.enabled=false` on the five unit specs in this shard: 5 files, 25 tests, all pass. No `test/nuxt/` specs were run (per rubric).
- `bunx oxlint` on the 8 edited files: no output, exit 0 (clean). The 11 untouched files were not linted.
- None of this shard's files are among the pre-existing failing ai-product-copy specs.
- The tree also shows other modified test files from the other shards; I did not touch those.
- Several large specs (points-of-sale-page, products-ai-suggestions, products-datasheet, action-bar, history-paging, delivery-*) are behavior tests with real regression stories (authorization, backend limits, request contents, error recovery); they were left almost whole.
- `deliveryOptions()` / `IN_USE_OPTION` still exist in `test/nuxt/delivery-fixture.ts` (used by the manage spec and fixtures); nothing in the fixture files was edited.

## Shard 6 manifest

Counting convention: each `it` / `it.each` / `for`-generated `it` counts as ONE test.

| file | tests before | tests after | removed | file deleted |
| :-- | --: | --: | --: | :-- |
| test/nuxt/products-delivery-picker.test.ts | 12 | 11 | 1 | no |
| test/nuxt/products-detail-form-stock-refetch.test.ts | 8 | 7 | 1 | no |
| test/nuxt/products-detail-form-stock-tab.test.ts | 15 | 11 | 4 | no |
| test/nuxt/products-detail-form.test.ts | 39 | 38 | 1 | no |
| test/nuxt/products-filter-bar.test.ts | 7 | 6 | 1 | no |
| test/nuxt/products-history-entry.test.ts | 13 | 12 | 1 | no |
| test/nuxt/products-image-gallery.test.ts | 12 | 12 | 0 | no |
| test/nuxt/products-image-rendering.test.ts | 4 | 4 | 0 | no |
| test/nuxt/products-initial-stock-error.test.ts | 6 | 6 | 0 | no |
| test/nuxt/products-lifecycle.test.ts | 5 | 5 | 0 | no |
| test/nuxt/products-list-panel.test.ts | 9 | 8 | 1 | no |
| test/nuxt/products-local-preview.test.ts | 3 | 2 | 1 | no |
| test/nuxt/products-mock-page.test.ts | 1 | 1 | 0 | no |
| test/nuxt/products-overview-pickers.test.ts | 6 | 6 | 0 | no |
| test/nuxt/products-overview-stock-indicator.test.ts | 12 | 10 | 2 | no |
| test/nuxt/products-taxonomy-ssr.test.ts | 1 | 0 | 1 | YES |
| test/nuxt/products-workspace.test.ts | 11 | 10 | 1 | no |
| test/nuxt/produit-mutations.test.ts | 6 | 1 | 5 | no |
| **total** | **170** | **150** | **20** | 1 file |

By category: composable-limit 5, duplicate 9, markup 3, framework 2, tautology 1.

## Removals

test/nuxt/products-delivery-picker.test.ts :: offers add and manage actions in the opened list :: duplicate :: only checks the two buttons exist plus a truthy aria-label; the next two tests ("opens the manage dialog", "creates an option from the add button") click those exact buttons and assert the outcome.
test/nuxt/products-detail-form-stock-refetch.test.ts :: stays on the Stock tab when only the stock fields change :: duplicate :: same assertions (panel visible, overview hidden) are made by "keeps a pending name edit when a stock movement is posted..." and the sibling History-tab "stays on the tab the operator switched to" test exercises the identical watcher.
test/nuxt/products-detail-form-stock-tab.test.ts :: shows no action bar before the Stock tab is opened :: duplicate :: same `activeTab === "stock"` condition is asserted by "removes the action bar when switching to Overview or History and brings it back on Stock", and "does not mount the inventory panel or request inventory while on Overview" covers the lazy-mount concern.
test/nuxt/products-detail-form-stock-tab.test.ts :: has no action bar in create mode :: duplicate :: create mode has no Stock tab / no panel (asserted by "has no Stock tab in create mode and keeps the History tab"), so the bar cannot exist; adds no failure mode.
test/nuxt/products-detail-form-stock-tab.test.ts :: carries no quantity or status summary on the Stock tab :: markup :: asserts absence of four data-testid elements; a design-removal pin with no behavior behind it.
test/nuxt/products-detail-form-stock-tab.test.ts :: products detail header: bar slot > renders the bar slot content inside the sticky header, below the tabs :: markup :: DOM containment and `compareDocumentPosition` ordering of a slot; pure structure. Its describe block, its afterEach and the unused `ProductsDetailHeader` import were removed with it.
test/nuxt/products-detail-form.test.ts :: offers the Stock tab, and its inventory panel, for a saved product only :: duplicate :: products-detail-form-stock-tab.test.ts already asserts tab list per mode ("orders the tabs...", "has no Stock tab in create mode...") and panel visibility ("shows the panel and hides the overview once the Stock tab is opened").
test/nuxt/products-filter-bar.test.ts :: renders one chip per filter inline :: markup :: counts "Remove filter" elements and checks the wrapper testid exists; every other test in the file already depends on the bar rendering. Its explanatory JSDoc removed with it.
test/nuxt/products-history-entry.test.ts :: labels the %s field as %s (it.each nom/prix/fiche_technique) :: tautology :: mirrors the i18n label table (`products.historyEntry.fields.*`) back at itself; the logic we own (fallback to the raw key) stays covered by "falls back to the raw key for a field it has no label for".
test/nuxt/products-list-panel.test.ts :: emits updated filters when clicking quick status buttons :: duplicate :: strict subset of the `it.each` "scopes the %s pill to its own lifecycle state", whose "In stock" row clicks the same pill and asserts the emitted filters (and uses optional chaining that could make this one vacuous).
test/nuxt/products-local-preview.test.ts :: renders a data: preview as a plain image too :: duplicate :: same `provider="none"` path as the blob: test; the test's own comment says the form never produces a data: URL, so it pins an input that does not occur.
test/nuxt/products-overview-stock-indicator.test.ts :: formats the quantity for the current locale :: framework :: component is `new Intl.NumberFormat(locale).format(n)`; the test only checks that Intl groups 1234 as "1,234".
test/nuxt/products-overview-stock-indicator.test.ts :: is read-only for direction: the switch is always disabled :: duplicate :: the switch has a hardcoded `disabled`; "never writes when the %s switch is clicked" asserts the real outcome (no write, state unchanged) and the comptoir test asserts the disabled attribute again.
test/nuxt/products-taxonomy-ssr.test.ts :: has the category picker's taxonomy available for its first render :: framework :: seeds the vue-query cache and asserts `useTaxonomie()` returns it synchronously (vue-query behavior; it cannot exercise SSR), then asserts the picker shows "Office", which products-overview-pickers.test.ts already covers. File had one test, so the file was deleted (nothing imports a *.test.ts).
test/nuxt/products-workspace.test.ts :: shows Restocking in the list for a product awaiting restock :: duplicate :: products-list-panel.test.ts "badges a non-withdrawn product awaiting restock as Restocking" asserts the same row text on the same component.
test/nuxt/produit-mutations.test.ts :: invalidates every product list on create, since a new product can appear in any of them :: composable-limit :: useProduitMutations already has one kept test.
test/nuxt/produit-mutations.test.ts :: invalidates both the product's own detail and every list on withdraw :: composable-limit :: one test per composable.
test/nuxt/produit-mutations.test.ts :: invalidates both the product's own detail and every list on restore :: composable-limit :: one test per composable.
test/nuxt/produit-mutations.test.ts :: invalidates both the product's own detail and every list after an image upload :: composable-limit :: one test per composable.
test/nuxt/produit-mutations.test.ts :: invalidates both the product's own detail and every list after an image delete :: composable-limit :: one test per composable. (The unused imports useCreateProduit, useDeleteProduitImage, useRestoreProduit, useUploadProduitImage, useWithdrawProduit were removed.)

## Borderline (kept)

test/nuxt/products-detail-form.test.ts :: renders the overview inputs empty in add mode :: a long list of DOM-state assertions (counters, thumbnail count, hero img absent) but it is the only guard that applyProduct(null) yields blank inputs rather than "NaN"/"undefined".
test/nuxt/products-detail-form.test.ts :: does not treat the department selector as a product edit :: the click uses optional chaining (`activeOption?.click()`), so it can pass vacuously if the option is not found; could not run nuxt project to check.
test/nuxt/products-detail-form.test.ts :: updates the description counter as the operator types / long description > counts the characters typed against the 20000 limit :: user-visible counter text but near-identical to each other and to the populated-edit assertions.
test/nuxt/products-detail-form-stock-refetch.test.ts :: returns from the Stock tab to the overview when saved fields change :: same watcher as the History-tab "re-syncs to the saved values and returns to the overview" test, but the Stock tab has its own mount/hide lifecycle.
test/nuxt/products-detail-form-stock-tab.test.ts :: orders the tabs Overview, Stock, History for a saved product :: tab order/labels are close to markup; kept because it carries the "History (n)" count label and is the saved-product baseline for the create-mode test.
test/nuxt/products-detail-form-stock-tab.test.ts :: does not mount the inventory panel when only the History tab is opened :: near-duplicate of the Overview lazy-mount test, but catches a "mount on any non-overview tab" regression that one cannot.
test/nuxt/products-history-entry.test.ts :: names the delivery-time field in words instead of its column key :: lookup of an i18n label (same class as the removed it.each) but title cites the raw-key leak it regressed on.
test/nuxt/products-history-entry.test.ts :: summarizes a change with its type, status, and timestamp :: partly i18n-title lookups ("Product updated"/"Modified") but it is the component's happy-path render.
test/nuxt/products-image-rendering.test.ts :: runs against a catalogue host that IPX does trust :: asserts test-environment config rather than app code; kept because the file's other assertions are meaningless without it.
test/nuxt/products-local-preview.test.ts :: serves a stored image untransformed even though its host is trusted for IPX :: overlaps products-image-rendering's call-site `it.each`, but covers the gallery thumbnail, which is not in that list.
test/nuxt/products-overview-stock-indicator.test.ts :: is read-only for comptoir too, and still shows the state :: overlaps "shows the switch off for a %s product" and "never writes when...", only adds the comptoir session.
test/nuxt/products-overview-stock-indicator.test.ts :: offers direction an icon-only ghost edit button that opens the adjustment dialog :: includes `data-variant="ghost"` / empty-text markup assertions, but also the aria-label and the dialog opening; not edited because kept tests are not rewritten.
test/nuxt/products-workspace.test.ts :: keeps the page header title static even when a product with its own name is selected :: single static-text assertion on the page header.
test/nuxt/products-workspace.test.ts :: disables the add-product action while already in add mode / keeps the add-product action enabled outside add mode :: inverse pair of one disabled-state rule.
test/nuxt/products-initial-stock-error.test.ts :: renders no error element for an empty message :: same `v-if="error"` as the undefined-message test, but "" is the value the parent form actually passes.
test/nuxt/products-image-gallery.test.ts :: cancels the dialog without emitting :: trivial negative path, kept as behavior (no emit on cancel).

## Composables with a kept test

useProduitMutations -> test/nuxt/produit-mutations.test.ts :: invalidates both the product's own detail and every list on update
(useTaxonomie had its only test, in products-taxonomy-ssr.test.ts, removed as `framework`.)

## Notes

- All 18 files in the shard are in test/nuxt/, so per the rubric none were run (no `--project nuxt`). Verified by careful reading, `bunx oxlint` on every edited file (exit 0, no findings, v1.86.0 prints nothing on a clean run), and a scripted check that no import or top-level helper in an edited file is left unused.
- No unit specs in this shard, so no vitest run and no encounter with the 12 pre-existing ai-product-copy failures.
- No `vi.mock` blocks, fixtures or shared helper files were orphaned: delivery-fixture and inventory-fixture are still imported by the kept tests.
- products-image-gallery, products-image-rendering, products-initial-stock-error, products-lifecycle, products-mock-page and products-overview-pickers: read in full, every test judged to be real behavior, so no removals.
- The shared worktree also shows other agents' edits in `git status`; only the files listed above were touched by this shard.

## Shard 7 manifest

Counts are `it`/`it.each`/`test` call sites (an `it.each` counts as one test, per the rubric).

| file | tests before | tests after | removed | file deleted |
| :-- | --: | --: | --: | :-- |
| test/unit/produit-schema.test.ts | 25 | 24 | 1 | no |
| test/unit/proposal-values.test.ts | 2 | 2 | 0 | no |
| test/nuxt/proposal-workspace.test.ts | 9 | 8 | 1 | no |
| test/unit/proxy-headers.test.ts | 1 | 1 | 0 | no |
| test/unit/proxy-target.test.ts | 4 | 2 | 2 | no |
| test/unit/public-session.test.ts | 1 | 1 | 0 | no |
| test/unit/quote-workspace-store.test.ts | 3 | 3 | 0 | no |
| test/nuxt/quotes-api.test.ts | 4 | 2 | 2 | no |
| test/nuxt/quotes-detail-skeleton.test.ts | 2 | 1 | 1 | no |
| test/nuxt/quotes-detail-stepper.test.ts | 3 | 3 | 0 | no |
| test/nuxt/quotes-detail-workspace.test.ts | 14 | 14 | 0 | no |
| test/nuxt/quotes-list-panel.test.ts | 2 | 2 | 0 | no |
| test/unit/redirect.test.ts | 5 | 5 | 0 | no |
| test/unit/refresh-lock.test.ts | 4 | 4 | 0 | no |
| test/unit/resolve-member-name.test.ts | 4 | 3 | 1 | no |
| test/unit/result.test.ts | 2 | 2 | 0 | no |
| test/unit/route-query.test.ts | 2 | 2 | 0 | no |
| test/unit/search-text.test.ts | 2 | 2 | 0 | no |
| test/unit/server-result.test.ts | 2 | 2 | 0 | no |
| test/unit/session-endpoint.test.ts | 1 | 1 | 0 | no |
| test/unit/session-roundtrip.test.ts | 4 | 4 | 0 | no |
| test/unit/slug.test.ts | 6 | 6 | 0 | no |
| test/unit/sparkline.test.ts | 7 | 7 | 0 | no |
| test/nuxt/spinner.test.ts | 6 | 4 | 2 | no |
| test/nuxt/statistics-management.test.ts | 7 | 7 | 0 | no |
| test/nuxt/stats-blocks.test.ts | 6 | 5 | 1 | no |
| test/nuxt/stats-partial-contract.test.ts | 6 | 6 | 0 | no |
| test/nuxt/stock-export-dialog.test.ts | 24 | 24 | 0 | no |
| test/unit/stock-export-heading.test.ts | 1 | 1 | 0 | no |
| test/nuxt/stock-export-run.test.ts | 12 | 1 | 11 | no |
| test/unit/stock-export.test.ts | 28 | 26 | 2 | no |
| test/nuxt/stock-import-dialog.test.ts | 36 | 36 | 0 | no |
| test/unit/stock-import-errors.test.ts | 9 | 9 | 0 | no |
| test/unit/stock-import-files.test.ts | 8 | 7 | 1 | no |
| test/nuxt/stock-import-fixture.ts (helper, not a spec) | - | - | - | no (every export still used) |
| test/unit/stock-import-heading.test.ts | 6 | 6 | 0 | no |
| test/nuxt/stock-import-page.test.ts | 7 | 5 | 2 | no |
| test/nuxt/stock-import-run.test.ts | 35 | 1 | 34 | no |
| **Total** | **~268** | **~207** | **61** | 0 files |

Per category: composable-limit 46, markup 7, duplicate 4, passthrough 3, tautology 1 (framework 0, coverage 0).

## Removals

test/unit/produit-schema.test.ts :: `%s fiche_technique` > "exposes a 20000-character ceiling" (describe.each, ran for create and update) :: passthrough :: `expect(FICHE_TECHNIQUE_MAX_LENGTH).toBe(20_000)` is constant equality; the 20000 vs 20001 boundary test in the same block already enforces the limit. Also dropped the now-unused `FICHE_TECHNIQUE_MAX_LENGTH` import.
test/nuxt/proposal-workspace.test.ts :: "uses semantic badge variants for proposal types and statuses" :: markup :: asserts `data-variant` values and which container holds the badge (DOM placement); the disparition/destructive and status/warning variants are still asserted incidentally in the history-page test.
test/unit/proxy-target.test.ts :: "composes a nested path correctly" :: duplicate :: same one-line template as the plain-path test, a longer path adds no failure mode.
test/unit/proxy-target.test.ts :: "adds nothing when there is no query string" :: duplicate :: the plain-path test already runs the no-query (default parameter) case.
test/nuxt/quotes-api.test.ts :: "loads a quote detail by reference" (useQuote) :: tautology :: endpoint returns `detail`, test asserts `detail` came back; it only exercises TanStack Query. Dropped the `useQuote` and `RefreshQuoteResult` imports.
test/nuxt/quotes-api.test.ts :: "refreshes a quote without inventing a write payload" (useQuoteMutations) :: composable-limit :: useQuoteMutations keeps its single higher-value test (archive + invalidation).
test/nuxt/quotes-detail-skeleton.test.ts :: "mirrors the 2-column Command Center operational layout" :: markup :: six `data-testid` existence checks on a skeleton, pure DOM structure.
test/unit/resolve-member-name.test.ts :: "returns null against an empty roster (still loading, or truly empty)" :: duplicate :: `find` over an empty array is the same code path as the unknown-id test.
test/nuxt/spinner.test.ts :: "spinner sizing" > "is driven by one size variable that grows from xs to lg, so every part scales with it" :: markup :: inspects the `--ld-size` CSS custom property.
test/nuxt/spinner.test.ts :: "spinner sizing" > "keeps four dots in the ring and carries no pixel sizes of its own" :: markup :: counts `<i>` elements and inspects inline style. The now-empty `describe("spinner sizing")` was removed.
test/nuxt/stats-blocks.test.ts :: "does not render the removed monthly-goal feature" :: markup :: pins the absence of text and a test id for a deleted feature; no behavior behind it.
test/unit/stock-export.test.ts :: "stock export ceiling" > "is the backend's 10,000 product ceiling" :: passthrough :: constant equality (`STOCK_EXPORT_MAX_ROWS` toBe 10000); `exportVolume` tests already cover the 10000/10001 boundary with literals. Empty describe and the `STOCK_EXPORT_MAX_ROWS` import removed.
test/unit/stock-export.test.ts :: "filenameFromDisposition" > "never returns an empty string" :: duplicate :: weak `not.toBe("")` assertion on the same safeBasename-to-fallback path that "falls back when nothing safe remains" and the `falls back when the header is %j` rows already pin exactly.
test/unit/stock-import-files.test.ts :: "stock import limits" > "mirrors the backend limits" :: passthrough :: two constant-equality assertions (2000 rows, 5 MiB). Empty describe and the `STOCK_IMPORT_MAX_*` imports removed.
test/nuxt/stock-import-page.test.ts :: "places product filters below the title and action buttons" :: markup :: parentElement / nextElementSibling layout assertions.
test/nuxt/stock-import-page.test.ts :: "lets direction open a stock export from the products header, before the import button" :: markup :: DOM order via `compareDocumentPosition` and row containment; the export button's presence for direction is exercised by the "exports the list's current filters" test, and its absence for comptoir by its own test.

test/nuxt/stock-export-run.test.ts (composable useStockExport; kept 1, removed 11; all `composable-limit`; dead `Reply.status/json/disposition`, the error branch in `serve()`, `CEILING_MESSAGE`, and the `setResponseHeader`/`setResponseStatus` imports removed with them):
- "starts idle with no error"
- "makes exactly one GET carrying the filters, mode and format"
- "strips page and taille even when the passed filters carry them"
- "saves the file under the name from Content-Disposition"
- "falls back to stock-<mode>.<format> when the response names no file"
- "does not save a file named by a path-traversal Content-Disposition"
- "explains the 10,000 product ceiling in the UI's language and returns false without saving"
- "surfaces the backend's message from a Blob-encoded error body"
- "gives a non-empty error for a 403 without a message"
- "gives a non-empty error for a 500 and does not retry it"
- "clears the previous error at the start of the next export"

test/nuxt/stock-import-run.test.ts (composable useStockImportRun; kept 1, removed 34; all `composable-limit`; dead imports `apiQueryKeys`, `importLine`, the `UUID` regex, `invalidatedKeys`, `PRODUCTS`, `OVERVIEW`, `serveFlow`, and the empty `review`, `reset while previewing` and `include changed rows` describes removed):
- review: "sends one keyless multipart preview request and lands on the preview without a result"; "reports previewing while the request is in flight"; "does nothing for a session without the direction role"; "invalidates nothing after a successful preview, because nothing was written"; "classifies a file-level 400 as a rejected preview failure, with no invalidation and no retry"; it.each "treats %s as a retryable preview failure, invalidates nothing, and retry re-sends a keyless preview"
- reset while previewing: "aborts the in-flight request and returns to idle"; it.each "never turns an aborted preview that %s into a preview or a failure"; "is still a no-op while an apply is submitting"
- apply: "is a no-op before any preview and while idle"; "is a no-op when the preview has nothing to apply"; "is a no-op after a failed preview"; "sends the same file, mode and motif without apercu=true and with a fresh uuid key, then yields the result"; "ignores a second apply while the first is in flight"; "invalidates products and overview exactly once, and only after the apply"; "does not invalidate after a rejected apply, and keeps no result"; "keeps a 429 on apply retryable with nothing invalidated"; "invalidates once after a retryable 503 apply because rows may have been committed"; "treats a 409 importation_en_cours as in progress and lets retry reuse the key"; "retry is a no-op after a rejected apply"; "retry is a no-op when nothing failed"; "uses a new key for each review+apply pair, including after reset"
- include changed rows: "starts with the flag off..."; "re-previews once with the flag, apercu and the same file, mode and motif, then stays in preview"; "applies with the flag, no apercu and a fresh uuid key"; "retries a failed apply with the same key and the same flag"; "stops sending the flag once toggled back off"; "makes no request when the value is already in effect"; "is ignored while previewing"; "is ignored while submitting"; "is ignored when idle"; "is ignored once a result exists"; it.each "is ignored in the failed state after %s"; "lands in failed (preview phase) when the re-preview errors, and retry re-sends the preview with the flag"

Behavior removed from the composable spec is still covered at the component level by `stock-import-dialog.test.ts` (kept in full): preview-then-apply flow, fresh key per apply, same key on 502/429/409 retry, invalidation exactly once after apply, no invalidation on preview or rejection, include-changed toggle, abort on Escape.

## Borderline (kept)

test/unit/quote-workspace-store.test.ts :: "starts without a status filter" :: initial-state check; near-trivial, but guards against a default filter silently appearing.
test/unit/proxy-target.test.ts :: "composes the target from base URL and path" :: the function is one template literal, so this is close to a tautology; kept because it pins the `/v1/` prefix and sits next to the query-string test that matters.
test/nuxt/quotes-detail-skeleton.test.ts :: "renders a structured skeleton UI with accessible status and aria attributes" :: carries real a11y assertions (role=status, aria-busy, label) mixed with markup ones (skeleton count > 10, absence of "border" classes).
test/nuxt/quotes-detail-workspace.test.ts :: "renders the Basic Details bar with the quote's real fields" :: only asserts the reference is shown, despite the title.
test/nuxt/stock-import-page.test.ts :: "lets direction open stock import from the products header" :: only asserts the button label; kept as the positive half of the comptoir authorization test.
test/nuxt/stock-import-dialog.test.ts :: "requires a new Review after Back, and the second preview carries the edited reason" :: largely subsumed by "applies the NEW mode, reason and file when they were changed after Back".
test/nuxt/stock-import-dialog.test.ts :: "treats a 413 preview as a rejection with no retry" :: same UI path as the file-level 400 test, and 413 classification is unit-tested in `stock-import-errors.test.ts`; kept because 413 is what the 2 MB request-size limiter returns.
test/nuxt/stock-import-dialog.test.ts :: "has no Apply button before a preview exists" :: the same absence is asserted in later Back and reopen tests.
test/nuxt/stock-export-dialog.test.ts :: "shows a singular count" / "shows a grouped plural count" :: lean on i18n plural and number formatting, but they pin our own copy and the count binding.
test/nuxt/stats-blocks.test.ts :: "renders the catalogue summary's numeric values, with categories under the profit column" :: the placement half is layout, the formatted numbers are behavior.

## Composables with a kept test

useStockExport -> test/nuxt/stock-export-run.test.ts :: ignores a second export while the first is pending
useStockImportRun -> test/nuxt/stock-import-run.test.ts :: retry after a 502 apply re-sends the same file, fields and the SAME key, then settles
useQuotes -> test/nuxt/quotes-api.test.ts :: forwards the optional status filter to the team list endpoint
useQuoteMutations -> test/nuxt/quotes-api.test.ts :: archives a quote and invalidates quote queries

## Notes

- Unit verification: `bunx vitest run --project unit --coverage.enabled=false` on the 22 unit specs of this shard: 22 files, 208 tests, all passing. No pre-existing failures fall in this shard.
- `bunx oxlint` on all 13 edited files: exit 0, no findings.
- Nuxt specs (`proposal-workspace`, `quotes-api`, `quotes-detail-skeleton`, `spinner`, `stats-blocks`, `stock-export-run`, `stock-import-page`, `stock-import-run`) were not run, per the rubric. Verified by reading plus oxlint only; the coordinator should run them.
- `test/nuxt/stock-import-fixture.ts` is a helper, not a spec. Left untouched: every export is still used (`stock-import-dialog`, `stock-import-views` from another shard, `stock-export-*`, `stock-import-page`, `stock-import-run`).
- `test/nuxt/stock-import-views.test.ts` shows up modified in `git diff` but belongs to another shard. I did not touch it.
- `test/unit/stock-export.test.ts` still has `describeExportFilters`, `filenameFromDisposition` and `stockExportUrl` coverage, including the hostile-input and path-traversal cases.
- Files read and found fully worth keeping: proposal-values, proxy-headers, public-session, redirect, refresh-lock, result, route-query, search-text, server-result, session-endpoint, session-roundtrip, slug, sparkline, stock-export-heading, stock-import-errors, stock-import-heading, quotes-detail-stepper, quotes-detail-workspace, quotes-list-panel, statistics-management, stats-partial-contract, stock-export-dialog, stock-import-dialog.

## Shard 8 manifest

Counting convention: `it(` / `it.each(` declarations in the file (an `it.each` or a test inside `describe.each` counts once).

| file | tests before | tests after | removed | file deleted |
| :-- | :-- | :-- | :-- | :-- |
| test/unit/stock-import-schema.test.ts | 4 | 4 | 0 | no |
| test/unit/stock-import-stage.test.ts | 4 | 4 | 0 | no |
| test/nuxt/stock-import-views.test.ts | 17 | 16 | 1 | no |
| test/unit/storefront-url.test.ts | 2 | 2 | 0 | no |
| test/unit/supabase.test.ts | 4 | 4 | 0 | no |
| test/nuxt/taxonomy-api.test.ts | 7 | 2 | 5 | no |
| test/nuxt/taxonomy-brands.test.ts | 5 | 5 | 0 | no |
| test/nuxt/taxonomy-components.test.ts | 9 | 9 | 0 | no |
| test/nuxt/taxonomy-department-form.test.ts | 5 | 5 | 0 | no |
| test/nuxt/taxonomy-page.test.ts | 13 | 13 | 0 | no |
| test/nuxt/taxonomy-products-infinite.test.ts | 16 | 15 | 1 | no |
| test/nuxt/taxonomy-recalculate-action.test.ts | 4 | 3 | 1 | no |
| test/nuxt/team-api.test.ts | 4 | 2 | 2 | no |
| test/nuxt/team-hire-dialog.test.ts | 9 | 9 | 0 | no |
| test/unit/team-member-update.test.ts | 3 | 3 | 0 | no |
| test/nuxt/team-workspace.test.ts | 6 | 6 | 0 | no |
| test/nuxt/tooltip-icon-button.test.ts | 4 | 3 | 1 | no |
| test/unit/use-object-url.test.ts | 5 | 1 | 4 | no |
| test/nuxt/users-orders-tab.test.ts | 7 | 7 | 0 | no |
| test/nuxt/users-status-actions.test.ts | 5 | 5 | 0 | no |
| test/nuxt/users-workspace.test.ts | 5 | 5 | 0 | no |
| test/unit/whatsapp.test.ts | 10 | 10 | 0 | no |
| **Total** | **148** | **133** | **15** | 0 files |

Removals by category: composable-limit 11, markup 2, coverage 1, duplicate 1.

## Removals

test/nuxt/stock-import-views.test.ts :: resolves every child component without a Vue warning (inside `describe.each`, ran for result and preview) :: coverage :: weak "no console message contains 'Failed to resolve component'" check; the row test already fails if a child component does not render. Dead code removed with it: `logged` array, `beforeEach` console spies, `afterEach(vi.restoreAllMocks)`, and the `afterEach`/`beforeEach`/`vi` imports.
test/nuxt/taxonomy-api.test.ts :: patches only changed category fields and invalidates shared taxonomy and products :: composable-limit :: subject is `useTaxonomyMutations`; one kept (create category)
test/nuxt/taxonomy-api.test.ts :: deletes a category through the BFF and invalidates shared data :: composable-limit :: subject is `useTaxonomyMutations`
test/nuxt/taxonomy-api.test.ts :: creates a department through the BFF and invalidates shared data :: composable-limit :: subject is `useTaxonomyMutations`
test/nuxt/taxonomy-api.test.ts :: deletes a department through the BFF and invalidates shared data :: composable-limit :: subject is `useTaxonomyMutations`
test/nuxt/taxonomy-api.test.ts :: sends the %s command and invalidates taxonomy and products after success (it.each: department patch, recalculate) :: composable-limit :: subject is `useTaxonomyMutations`
test/nuxt/taxonomy-products-infinite.test.ts :: has no load-more button :: markup :: asserts `findAll("button")` has length 0, an element count with no behavior behind it
test/nuxt/taxonomy-recalculate-action.test.ts :: renders the design-system button, so its variant actually applies :: markup :: asserts the `data-slot="button"` attribute, a DOM detail; emit, disabled and error behavior are covered by the other tests
test/nuxt/team-api.test.ts :: fetches the team annuaire with search, role, activity, sort, page, and size :: composable-limit :: subject is `useTeam` (useTeam.ts); the pagination-walk test is kept. Also removed the now-unused `useTeamMember` import.
test/nuxt/team-api.test.ts :: fetches a selected member detail independently from the directory :: composable-limit :: subject is `useTeamMember`, exported from the same file `useTeam.ts` that already keeps one test
test/nuxt/tooltip-icon-button.test.ts :: can be disabled :: duplicate :: same `v-bind="$attrs"` forwarding as "hands attributes and clicks to the button itself", no new failure mode
test/unit/use-object-url.test.ts :: has no url while there is no file :: composable-limit :: subject is `useObjectUrl`; one kept
test/unit/use-object-url.test.ts :: gives the file a url as soon as it is picked :: composable-limit :: subject is `useObjectUrl`
test/unit/use-object-url.test.ts :: lets go of the url and clears it when the file is dropped :: composable-limit :: subject is `useObjectUrl`
test/unit/use-object-url.test.ts :: lets go of the url when whoever asked for it goes away :: composable-limit :: subject is `useObjectUrl`

## Borderline (kept)

test/unit/stock-import-stage.test.ts :: shows %s as %s without needing any payload (and "shows %s once its payload is present") :: the rows mirror the `STAGES` lookup table, but they also pin the `needs === null` branch and the positive payload gate; the fallback tests alone would pass for an implementation that always returns "setup".
test/nuxt/taxonomy-brands.test.ts :: renders brand initials fallback in the detail panel overview when key is missing :: same chain as the BrandTable missing-key test plus `logoDevNameUrl` returning null (tested in logo-dev.test.ts), but it exercises the panel's own wiring (BrandPanelView/ProductsBrandLogo).
test/nuxt/taxonomy-products-infinite.test.ts :: uses the singular for a single product :: tests our locale plural string rather than branching logic.
test/nuxt/taxonomy-page.test.ts :: keeps counter recalculation available in every writable taxonomy tab :: presence-only assertion on a button across tabs.
test/nuxt/stock-import-views.test.ts :: still renders every row of a 2000-line response :: guards against truncation or virtualisation; a perf/limit characteristic rather than logic.
test/nuxt/users-status-actions.test.ts :: keeps the account card readable when the profile was never completed :: overlaps with users-workspace "renders an existing account with no profile as an incomplete, non-error detail" (both assert `users-detail-incomplete`), but adds the suspend button and account section assertions.
test/nuxt/users-status-actions.test.ts :: shows the backup phone, the recipient phone, the pickup counter and the last access :: the last-access assertion is weak (`not.toBe("")`).
test/nuxt/team-api.test.ts :: sends nullable team updates, deactivation, and reactivation... :: kept as the single `useTeamMutations` test; it still asserts `not.toHaveProperty("create")`, a leftover from before `hire` was added.

## Composables with a kept test

useTaxonomy -> test/nuxt/taxonomy-api.test.ts :: fetches taxonomy once while exposing categories, departments, and brands
useTaxonomyMutations -> test/nuxt/taxonomy-api.test.ts :: creates a category through the BFF, invalidates shared data, and returns its id
useTeam (file useTeam.ts, also exports useTeamMember and prefetchTeam) -> test/nuxt/team-api.test.ts :: walks the team annuaire pages and exposes the canonical invitation timestamp
useTeamMutations -> test/nuxt/team-api.test.ts :: sends nullable team updates, deactivation, and reactivation, then invalidates list and detail queries
useObjectUrl -> test/unit/use-object-url.test.ts :: lets go of the previous url when another file replaces it

## Notes

- Every `test/nuxt/` change was verified by reading plus `bunx oxlint` only; nothing in `--project nuxt` was run.
- `bunx oxlint` on all 7 edited files: exit 0, no output.
- `bunx vitest run --project unit --coverage.enabled=false` on the 7 unit specs in this shard: 7 files passed, 49 tests passed (including the pruned use-object-url spec). No pre-existing failures in this shard.
- `test/nuxt/stock-import-views.test.ts` imports `./stock-import-fixture`, `taxonomy-*` and `team-hire-dialog` import `./comptoirs-fixture` and `./fake-intersection-observer`; those helpers were not touched and are shared with other specs.
- `useTeamMember` and `useTeam` were treated as one composable because both live in `app/composables/useTeam.ts` (rubric defines a composable as the `useX.ts` file). If the coordinator reads the limit per exported function instead, restore "fetches a selected member detail independently from the directory" in team-api.test.ts.
- The `useTeamMutations` kept test also covers `update`, `deactivate` and `reactivate` in one test; the `hire` mutation has no test in this shard (it is exercised through team-hire-dialog.test.ts, which has the component as its subject).
- Files that tested components or pages with composables in use (taxonomy-page, taxonomy-components, team-workspace, team-hire-dialog, users-*) were judged as component tests and left intact.

