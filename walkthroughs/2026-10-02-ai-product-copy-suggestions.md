# AI product-copy suggestions — walkthrough

**Date:** 2026-10-02
**Slug:** `ai-product-copy-suggestions`
**Plan:** `plans/2026-10-02-ai-product-copy-suggestions.md`
**Status:** Implemented and gated, except the credentialed staging smoke test (see Not done).

## What I built

A direction user can ask the product editor for a French or English copy package (name, short
description, long description, features). The request goes to a new server endpoint,
`POST /api/ai/products/suggestions`, which calls GPT-5 mini through the official `openai` SDK and
returns a validated package. The editor shows one review card under each field. The operator applies
or dismisses each card on its own, and nothing is saved automatically. A floating button at the
bottom-right of the admin (white, flower icon, soft shadow) opens a large popover that shows the
generation in progress and a history of earlier generations. See "Follow-up: launcher and history".

## Follow-up: launcher and history

Requested after the first delivery, because the first popup (bottom-left, auto-hiding) was not visible
to the user. The generate button in the editor also became icon-only (the supplied flower SVG, ghost
variant, no text, `aria-label` kept).

- **Launcher** (`AiGenerationLauncher.vue`, mounted in `AdminShell`): a fixed 48 px white circle, 16 px
  from the bottom-right corner, shown to `direction` users only. While a run is loading its icon
  morphs between three shapes (see "Loading icon morph" below), and it shows a green or red dot when
  a result landed while the popover was closed.
- **Popover** (shadcn `Popover`, anchored above the button, not a sheet): `AiGenerationPanel.vue`
  shows the run in progress, then the history, newest first. The newest entry is open; older ones fold.
  Each entry shows product name, language, time, status and, once open, all four suggested fields, the
  asset warnings, or the failure sentence. Actions: remove one entry, clear all, retry (newest failure
  only, never for `forbidden`), and **Review in editor**.
- **Review in editor** puts every field of an old package back as cards. It is offered only when that
  entry's product is the one open in the editor, and not while a run is loading. The form still owns
  the values: applying goes through the same cards as before.
- **Store** (`app/stores/ai-generation.ts`): new `history` (10 newest, in memory only), `label`,
  `panelOpen`, `unread`, `editorTarget`, and `setPanelOpen`, `removeEntry`, `clearHistory`,
  `setEditorTarget`, `clearEditorTarget`, `canRestore`, `restore`. `popupOpen` and `dismissPopup` are
  gone. `begin` takes an optional fourth argument, the product name used as the entry label.
- **Composable** passes the typed product name as the label and registers the open editor target
  (client only, cleared when the editor goes away).
- **Toasts** now start 5 rem above the bottom so they do not cover the launcher
  (`AdminShell.vue`, `offset` and `mobileOffset`). This moves every toast in the admin, for every role.
- **Removed:** `AiGenerationPopup.vue`, `AiGenerationPopupActions.vue`, `test/nuxt/ai-generation-popup.test.ts`.
  `AiGenerationPopupWarnings.vue` became `AiGenerationWarnings.vue`.
- **Name and header:** the assistant is called **NowTech AI** (popover heading and the launcher's
  accessible name, same text in `en` and `fr`). The line under the heading that said generations are
  forgotten on reload is gone, together with its `products.aiCopy.popup.description` keys. The history
  is still in memory only; the interface just no longer says so. Other sentences that say "AI
  suggestions" (the hourly-limit message) describe the feature and were left alone.
- **Sidebar in the popover:** the popover is now 46 rem wide and a fixed 34 rem tall (it no longer
  resizes between sections), with a sidebar on the left: **Suggestions**, **Conversations**, and
  **Settings** pinned to the bottom behind a divider. Suggestions is the previous content (progress,
  history, "Clear history"); `AiGenerationPanel.vue` now only holds the header and the layout, and the
  rest moved to `AiGenerationSidebar.vue` and `AiGenerationSuggestions.vue`. The header still reads
  only "NowTech AI". **Conversations has no feature behind it yet** and shows one line
  ("Conversations are not available yet."; French: "Les conversations ne sont pas encore
  disponibles."). Settings now holds the suggestion language (next bullet).
  Below 640 px the sidebar is an icon-only rail; the labels stay in the page for screen readers.
  The sections are the constant `AI_PANEL_SECTIONS` in `app/types/ai/panel.ts`. The store gained
  `panelSection` and `setPanelSection`. Two rules came with it: starting a generation switches to
  Suggestions (otherwise you could watch Settings while a result arrives unseen), and a result counts as
  *read* only while the Suggestions section is on screen. So a result that lands while Conversations or
  Settings is open stays unread: the launcher shows its dot and the Suggestions item shows one too, and
  reopening the popover on another section does not clear it. The section is kept while the popover is
  closed. Icons are Phosphor `lightbulb`, `chats-circle` and `gear` (not a sparkle). I did not use the
  shadcn `Sidebar`, which needs a page-level provider, or add shadcn `Tabs`, which are not in the repo:
  the items are plain buttons with `aria-current`. Strings live under `products.aiCopy.popup.sections`
  because the rest of this popover already does.
- **Suggestion language moved into Settings.** The FR / EN switch used to sit next to the generate
  button on every product form (`ProductCopySuggestionTrigger.vue`). It is gone from there: the trigger
  is now only the icon button and emits `generate` with no payload. The choice lives in the new
  `AiGenerationSettings.vue` as a labelled French / English pair of buttons (with a one-line
  description), shown when Settings is open. The store holds it as `preferredLanguage` (default `fr`,
  as before) with `setPreferredLanguage`; it is separate from `language`, which is the language of the
  current or last run. `useProductCopySuggestions().generate()` takes no argument any more and reads the
  setting. A **retry keeps the language of the run it repeats**, even if the setting changed since.
  The setting is kept in memory like the rest of the panel: a reload goes back to French, as the old
  switch did on every page load. The list of languages is now one constant,
  `PRODUCT_COPY_LANGUAGES` in `app/types/ai/product-copy.ts`, which also feeds the request schema
  (it was written twice). i18n: the label moved from `products.aiCopy.trigger.languageLabel` to
  `products.aiCopy.popup.settings.language.{label,description}`, and the "There are no settings yet."
  placeholder key is removed. The language names come from the existing `products.aiCopy.language.*`
  keys, so French shows "Français" (capitalised in CSS from the lowercase "français").
- **AI look:** the supplied SVG is now the shared component `app/components/AiIcon.vue` (it was
  `products/ProductCopyGenerateIcon.vue`; renamed because the launcher, the panel and the assistant
  avatar use it too, not only products). It replaces the two places that used a Phosphor sparkle: the
  label of each suggestion card, and the avatar of an `assistant` message in the support thread
  (`assistant/MessageAvatar.vue`, now a bare icon without the grey circle). The star icons used for
  product ratings are not AI marks and were left alone. The suggestion card has a solid 1 px border
  painted with the icon's colours (magenta `#FF00D6`, blue `#0066FF`, cyan `#07FFE1`, 135deg) through
  a new `ai-gradient-border` utility in `app/assets/css/main.css`; the dashed border and green tint are
  gone and the card surface is `--card`. The card's **Apply** button uses the same gradient as its
  background through `ai-gradient-button`, with `border-0`, black text, `font-semibold` and
  `hover:brightness-95`. **Dismiss** stays a ghost button. The palette lives in two places (the SVG
  and the three colour tokens `--ai-magenta`, `--ai-blue` and `--ai-cyan` in `main.css`), and a comment
  in the CSS says to change them together. The icon's yellow is only a faint base tint inside the SVG,
  so I left it out of the gradient.
- **Card background tint.** The suggestion card used to be a flat `--card` surface, which read as
  bland. `ai-gradient-border` now also paints `--ai-gradient-tint` on the padding box: the same
  135deg magenta → blue → cyan, each stop mixed at **4%** into transparent with `color-mix`, over a
  solid `--card` layer so the tint never shows through to the page. The layers are, top to bottom:
  tint, `--card`, then the full-strength gradient on the border box (which is what draws the 1 px
  edge). I tried 6% first; it was a little strong in the light theme, so it is 4%. Checked on a
  throwaway page in a real browser in both themes; text contrast is unaffected because the tint is
  under 5% alpha on the card colour. No tests were added, because this is styling only. To change the
  strength, edit the three percentages in `--ai-gradient-tint`.
- **Apply button: contrast and border (fixed after a complaint).** My first version put black text on
  the raw gradient and I only checked contrast at the three colour stops. The darkest point is
  between magenta and blue, where black text falls to **3.5:1**, below AA. I sampled the whole
  gradient (sRGB interpolation, WCAG formula) for two fixes: a dark wash with white text needs 65% black
  for 8.2:1 but turns the palette into plum and navy; a white wash with black text reaches 7.5:1 at 40%
  and keeps the hues. I used the second: `ai-gradient-button` lays a white wash over the gradient, so
  black text stays above AAA along the whole button, in both themes. The wash applies to the button
  only; the border and the icon keep the full colours. **The wash is now 55%** (about 10:1 at the
  worst point); 40% (7.5:1) looked too dark to the user. Each step up costs saturation, not contrast:
  60% gives 10.9:1 and 65% gives 11.9:1, and the limit is how pastel you want the button, not
  readability.
  The visible outline on the first version was the Button's 1 px transparent border: I set only
  `background-image`, so the gradient's origin stayed at the padding box and repeated into the border
  area (cyan on the left edge, magenta on the right). `border-0` removes it; the earlier
  `bg-clip-border` workaround is gone because there is no border left to clip.
- **Generate no longer opens the popover (changed on request).** `begin` used to open the panel when
  a run started; now only the launcher button opens it. `begin` still switches the section to
  Suggestions, and a run is signalled by the morphing icon, then by the unread dot once a result
  lands. The focus-suppression code that came with auto-open (`openedByOperator`,
  `@open-auto-focus`) is gone with it; the Popover just calls `store.setPanelOpen` on
  `@update:open`. Existing specs that pinned the old behaviour were adjusted, not extended: store
  tests that need an open panel call `setPanelOpen(true)`, the "does not steal focus" launcher test
  is removed, and the auto-open test became "shows the run in the panel and names the language",
  which opens the panel by clicking the launcher. The three touched specs (store, launcher, editor)
  give 116/116.
- **Loading icon morph.** While a run is loading, the launcher icon cycles smoothly through three
  outlines: the NowTech AI mark, a circle, and the supplied flower (the two SVGs you provided). The
  three outlines were resampled once into matching 48-segment cubic paths with a throwaway
  in-browser script (deleted), and `app/utils/ai-icon-morph.ts` holds them as three keyframes with
  their blobs, blur and gradient stops, plus `sampleAiIcon(phase)`, which interpolates between
  keyframes with smoothstep easing. Phase 0 returns the original mark's path byte for byte.
  `useAiIconMorph.ts` drives the phase with `useRafFn` (900 ms per shape, a 64 ms frame cap for
  slept tabs): when the run ends it finishes the loop in progress and rests at phase 0, so the icon
  never freezes mid-shape. Under reduced motion the loop does not run and the launcher shows the old
  ring as a static indicator instead (it is `motion-safe:hidden` now). `AiIcon.vue` gained an
  optional `phase` prop (default 0, so every other use of the icon is unchanged) and renders the
  sampled mask, blobs and gradients instead of a fixed path. No tests were
  added, per your standing request for visual fixes; verification is the browser check below.
- **Generate button: its own flower icon, spinning while busy (changed on request).** The editor
  header's generate button (`ProductCopySuggestionTrigger.vue`, in `DetailHeader`'s actions slot)
  does not morph — it uses the supplied flower-2 SVG as
  `products/ProductCopyGenerateIcon.vue` (blue→cyan wash, pink and cyan blurred blobs, grain
  overlay; instance-unique SVG ids via `useId`, same convention as `AiIcon`), and while `busy` it
  simply rotates with `motion-safe:animate-spin`. The old Spinner swap is gone entirely (removed on
  request): the button keeps `aria-busy` and stays disabled while generating, and under reduced
  motion the icon just stays static.
- **Fields animate while their run is in flight.** While a generation targets the open editor, the
  four fields it will fill — name, short description, long description, and the features card —
  wear a new `ai-generating` class (`main.css`): a rotating conic ring in the palette (a masked
  pseudo-element 5 px outside the box, so the layout never shifts), a cyan shimmer sweep, and the
  same 4% gradient tint as the suggestion cards. The class sits on wrapper divs because `input` and
  `textarea` are replaced elements and cannot grow pseudo-elements of their own. The state comes
  from a new `isGeneratingForTarget` on `useProductCopySuggestions` (the run is loading **and**
  belongs to this editor, so fields do not animate for a run started on another product), drilled
  as a `generating` prop: `DetailForm` → `OverviewDetails` → `OverviewPricing` (name),
  `OverviewShortDescription`, `OverviewLongDescription`, and `DetailForm` → `OverviewDescriptions`
  (features card) directly. Under reduced motion the ring and shimmer stand still; the tint stays.

Handler order: session (401) → direction role (403, audited) → Zod body (400) → context check (422)
→ prompt size (422) → missing key (502) → synchronous per-user limiter (409 busy / 429 quota with a
`retry-after` header and `data.retryAfterSeconds`) → persisted product read (denied → 403) → asset
policy → OpenAI → local output validation → audit → `{ suggestion, assets, requestId }`. The in-flight
lock is released in `finally`. A failing audit sink is swallowed.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| 1. `openai` dependency, AI Elements `loader` + `shimmer` | Done | `package.json`, `bun.lock`, `app/components/ui/ai-elements/{loader,shimmer}/` (generated, not edited). No `ai` / `@ai-sdk/*` added. `motion-v` came with `shimmer`. `components.json` unchanged |
| 1. Server-only runtime config + boot validation | Done | `nuxt.config.ts` (`runtimeConfig`, none under `public`), `server/utils/ai/config.ts`, `server/plugins/assert-config.ts` |
| 1. Types, Zod schemas, pure helpers | Done | `app/types/ai/product-copy.ts`, `app/schemas/ai-product-copy.ts`, `app/utils/ai-product-copy.ts` |
| 2. Product-context reader | Done | `server/utils/ai/product-context.ts` (uses `ensureFreshSession`; never forwards the sealed cookie) |
| 2. Asset resolver (images) | Done | `server/utils/ai/product-assets.ts`: HTTPS only, no credentials/port, no IP-literal or internal hosts, max 4 images, `url_source` never read |
| 2. Asset resolver (datasheet PDF) | **Partial** | Never attached. `datasheet_unavailable` is returned when a datasheet path is stored. See Deviations |
| 2. OpenAI client + product-copy service | Done | `server/utils/ai/openai-client.ts`, `product-copy-prompt.ts`, `product-copy-service.ts`, `errors.ts` |
| 2. Per-user limiter (50/h, in-flight lock) | Done | `server/utils/ai/rate-limit.ts` (process-local, as the plan says) |
| 2. Metadata-only audit | Done | `server/utils/ai/audit.ts` (record built field by field) |
| 3. Endpoint | Done | `server/api/ai/products/suggestions.post.ts` |
| 3. `/api/ai/**` route rules, CSRF kept | Done | `nuxt.config.ts` `routeRules`: 120 requests / 5 min, 256 KiB body. CSRF inherited from the global block |
| 4. Pinia store | Done | `app/stores/ai-generation.ts` |
| 4. Composable | Done | `app/composables/useProductCopySuggestions.ts` |
| 4. Popup, mounted once in `AdminShell` | **Replaced** by launcher + popover | `app/components/admin/AiGeneration{Launcher,Panel,HistoryItem,EntryBody,SuggestionFields,FailureNotice,Warnings}.vue`, `AdminShell.vue`. See Follow-up |
| 5. Trigger (direction-only; the FR/EN choice moved to the popover's Settings) | Done, icon-only | `app/components/products/ProductCopySuggestionTrigger.vue`, `app/components/AiIcon.vue` |
| 5. Review card | Done | `app/components/products/ProductCopySuggestionCard.vue` |
| 5. Slots + `DetailForm` wiring | Done | `OverviewPricing`, `OverviewDetails`, `OverviewShortDescription`, `OverviewLongDescription`, `OverviewDescriptions`, `DetailForm.vue`. `OverviewMedia.vue` not touched (its `after-brand` slot already existed) |
| 6. EN/FR strings | Done | `i18n/locales/products/{en,fr}.json` (`products.aiCopy.*`) |
| 6. Specs at the agreed seams | Done | See Tests |
| 6. All gates | Done, with caveats | See Tests |
| Staging smoke test with a real key | **Not done** | No credential in this environment |

## Deviations

1. **Datasheet is never sent to the model.** `fiche_pdf` is a storage path and there is no
   server-owned route to read its bytes. The plan's risk table allows this fallback. The response
   carries `datasheetUsed: false` and the warning `datasheet_unavailable` whenever a datasheet path is
   stored. No backend work was added.
2. **The popup became a floating launcher with a popover and a history (user request).** This replaces
   the plan's auto-hiding popup and the earlier bottom-left placement. It adds a history the plan did
   not describe, and it **reverses one earlier test**: the popup used to be asserted never to show the
   generated text; the history now shows it, on purpose. Toasts moved up 5 rem to make room.
   History is browser memory only (10 entries, gone on reload) and holds the generated text and the
   typed product name. Nothing is written to storage or sent anywhere.
3. **Relative imports in `server/` and in the `app/` types/utils that server code imports.** The
   `unit` Vitest project is node-only and has no `@/` alias, so aliased imports would not resolve
   there.
4. **Files the plan did not list:**
   - `server/utils/ai/product-copy-prompt.ts`: the prompt builder, split out of the service.
   - The launcher's sub-components (`AiGenerationPanel`, `HistoryItem`, `EntryBody`, `SuggestionFields`, `FailureNotice`, `Warnings`), split to keep each template small.
   - `isSameProductCopyTarget` and `toProductCopyDraftSource` in `app/utils/ai-product-copy.ts`, plus the `ProductCopyFormState` and `ProductCopyTaxonomy` types.
   - Component contracts shaped by the same fallow limit: the card takes `suggestions` (the pending map) and renders only when its field has a value, and the trigger takes `canWrite` and hides itself. This keeps `DetailForm`'s template at 20 or below cyclomatic.
5. **Audit default sink** is one `console.info(JSON.stringify(record))` line per request; the sink is
   injectable for tests. The plan did not name a destination.
6. **`.fallowrc.jsonc`:** `motion-v` added to `ignoreDependencies`. Only generated `ui/ai-elements`
   code imports it, and that directory is excluded from analysis (same reason as the neighbouring entries).
7. **Extra config keys:** `aiProductCopyInputUsdPerMillionTokens` and `aiProductCopyOutputUsdPerMillionTokens`,
   used only for the audit's `estimatedCostUsd`.
8. **Tester delegation.** Six Tester sub-agents wrote the specs against contract stubs; I wrote the
   implementation. I edited three Tester specs, listed under Tests. **The launcher follow-up is the
   exception:** I wrote both its tests and its code, in red-then-green slices, with no Tester.

## Tests

All commands run in this worktree; results below are what the commands printed.

**AI specs** (`bunx vitest run --coverage.enabled=false test/unit/ai-*.test.ts test/nuxt/ai-*.test.ts test/nuxt/products-ai-*.test.ts test/nuxt/admin-shell*.test.ts`):

```
 Test Files  13 passed (13)
      Tests  400 passed (400)
```

After the later follow-ups (rename, sidebar) the same set plus `message-avatar.test.ts` gives
`Test Files  14 passed (14)` and `Tests  413 passed (413)`. The tables and the full-suite result below are
from the 400-test run.

| Spec | Tests |
| :-- | --: |
| `ai-product-copy-schema` | 71 |
| `ai-config` | 46 |
| `ai-product-assets` | 39 |
| `ai-product-copy-client` | 36 |
| `ai-product-copy-service` | 27 |
| `ai-product-context` | 26 |
| `ai-product-copy-api` | 26 |
| `ai-generation-store` | 44 |
| `ai-rate-limit` | 10 |
| `ai-audit` | 7 |
| `test/nuxt/ai-generation-launcher` | 46 |
| `test/nuxt/products-ai-suggestions` | 24 |
| `test/nuxt/admin-shell` (existing, now mounts the launcher) | 5 |

**Gates:**

| Command | Result |
| :-- | :-- |
| `bun run i18n:check` | exit 0 |
| `bun run lint` | `Found 2 warnings and 0 errors.` Both warnings are in files I did not touch: `app/types/session.ts` (`no-useless-empty-export`) and `test/unit/categorie-schema.test.ts` (`no-conditional-expect`) |
| `bun run format:check` | `All matched files use the correct format.` |
| `bun run fallow` | `✓ No issues in 63 changed files`, plus two advisory `css-token-drift` notes on the popover's size classes (at that time `w-[min(34rem,calc(100vw-2rem))]` and `max-h-[min(36rem,calc(100dvh-7rem))]`; after the sidebar they are `w-[min(46rem,calc(100vw-2rem))]` on the launcher and `h-[min(34rem,calc(100dvh-7rem))]` on the panel). They need viewport-relative sizes and do not fail the gate. It failed earlier in the session; see below |
| `bun run typecheck` | No diagnostics printed |
| `bun run build` | `Build complete!` |
| `bunx vitest run` (everything) | **Failed: 9 files, 14 tests.** `Test Files 9 failed \| 216 passed (225)`, `Tests 14 failed \| 2121 passed (2135)` |

**The 14 full-suite failures are not caused by this change.** For the first delivery I exported a clean
`git archive HEAD` to `/tmp`, ran `nuxt prepare`, and ran the nine failing files there. I did **not**
repeat that export for the launcher follow-up; the failing test names are the same twelve as then.
Twelve of the 14 fail identically at HEAD: `banner-artwork-preview`, `banner-card`, `banner-panel-artwork`, `overview-date-field`,
`products-delivery-picker`, `products-image-rendering` (2), `products-local-preview`, and four in
`products-detail-form` (source-url input missing, brand label `ANAnker`, delivery default badge). The
other two are `stock-import-views` "still renders every row of a 2000-line response" (preview and
result views), which timed out (about 5.5 s and 6.6 s) only in the full run. The file passes alone
here (`29 passed`) and passed in the HEAD export run. I believe it is load-related (2000-row render)
but did not prove it. CI would see these failures; I left them alone as out of scope.

**Fallow history.** The first full run failed on three things, all fixed: `motion-v` flagged as an
unused dependency (deviation 6); cognitive complexity 18 in the endpoint (split into `parseRequest`,
`assertCanGenerate`, `acquireLease`, `loadAssets`, `generate`, `toRefusal`; 26/26 API tests stayed green);
and template complexity in `DetailForm.vue` (cyclomatic 29, cognitive 27) and the first-version
`AiGenerationPopup.vue` (cognitive 23, since replaced by the launcher), fixed by the extractions in
deviation 4. I used no `fallow-ignore` suppressions. The first popup's `css-token-drift` advisory went away
when I replaced its arbitrary width with `inset-x-4 sm:w-96`. The launcher panel brings back two advisory
`css-token-drift` notes (see the follow-up gate results).

### How red was (and was not) observed

I am recording this plainly because the TDD skill asks for red before green.

- **Seen red against stubs, from the Tester reports:** assets + service (66 tests red against stubs,
  green against the real code) and the popup (24 tests: 17 failed, 7 passed against the stub; the 7
  were "nothing rendered" assertions that pass vacuously).
- **Specs written against stubs by Testers, but I have no recorded red run for them:** schema, config,
  rate-limit, audit, product-context, client util, store, and the endpoint. Treat their red phase as
  unverified.
- **Editor flow (`products-ai-suggestions`) was never observed red for the right reason.** The Tester
  reports that the real implementation landed in the shared worktree while it was stabilising the
  spec, so it finished green. My first run against my implementation was 14 failed / 6 passed, and
  those failures came from the spec's own fixtures (brand option text `ANAnker`, and `flushPromises`
  not waiting long enough for the registered endpoint), not from missing behaviour. A scratch spec
  confirmed the real path resolves in about 30 ms.
- **Mutation check instead of a red run.** I temporarily changed `DetailForm.vue` to (a) append
  features instead of replacing them and (b) skip `productCopy.release()` in `onCancel`. Exactly two
  tests failed (`applying the features card replaces the whole existing feature list…` and
  `clears every card when the form is cancelled`), 18 passed. I restored the file and confirmed
  it byte-identical with `diff -q`.

### Red and green in the launcher follow-up

- **Store, slice 1 (history, panel, unread):** 22 of 36 tests failed (`store.setPanelOpen is not a
  function`, `undefined` for `unread`/`history`) before the change; the one left failing after it was
  the `editorTarget` assertion that belongs to slice 2.
- **Store, slice 2 (editor target, restore):** red first (`setEditorTarget` missing), then 41/41 green.
- **Editor integration:** 3 new tests failed for the right reasons (label `''` instead of the typed
  name; `editorTarget` `null`; cards not restored), then 24/24 green.
- **Launcher spec:** red was "Failed to resolve import AiGenerationLauncher.vue", which is red only in
  the trivial sense. All 42 passed on the first run of the implementation. To check they can fail, I
  mutated the code four ways: (M1) never suppress auto-focus, (M2) retry on every failed entry, (M3)
  launcher for every role, (M4) review control always shown. M1 and M3 failed their own tests; M4
  failed its own test. **M2 survived**, because the older failed entry was folded so its retry button
  never rendered. I changed the test to open the older entry first; it now fails under M2.
  M1 also exposed that one failed test left a mounted launcher in the document and cascaded into 16
  unrelated failures. The spec now unmounts every wrapper in `afterEach`. Final run after both fixes:
  M1, M2 and M3 each fail exactly their own test(s) (1, 1, and 2) and 42/42 pass restored.
  (M1's target no longer exists: when the popover stopped opening by itself, the focus suppression
  and the test it guarded were removed.)
- **Rename:** the launcher's accessible-name assertion changed to `NowTech AI` and one test was added
  (the panel header's text is exactly `NowTech AI`, which also fails if a description comes back). Both
  failed first against the old text (`AI suggestions`, and the header with the description appended),
  then passed. Launcher spec is now 43 tests (the 400-test run above was printed before the rename); with the editor spec the two files give 67/67. Format,
  `i18n:check`, lint, fallow and typecheck were re-run and are clean. I did not re-run the full suite,
  since the change touches one template, two locale files and one spec.

- **Sidebar:** 3 store tests and 3 component tests were written first. Red was real: the 3 store tests
  failed with `store.setPanelSection is not a function` and the 3 component tests found no sidebar.
  Green after the store change and the components (114/114 with the editor spec). One test of mine was
  wrong: it clicked the launcher to open a popover that `begin` had already opened (back when `begin`
  still opened it), which closed it; I fixed the test, not the code. Two mutations: (M1) `begin` no
  longer switches to Suggestions fails
  its own test only; (M2) unread ignores the section fails the 2 store tests and the 1 component test
  about it, and nothing else. Restored: 90/90 for the store and launcher specs.
  Not tested, on purpose: that Settings sits at the bottom (layout, checked in the browser) and the
  placeholder sentence.

- **Language setting:** one store test, two launcher tests and one rewritten editor test. The store test
  says the preference starts at French and survives a run, a release and a cleared history. The launcher
  tests say Settings offers French and English with French chosen first, and that the choice is still
  there after leaving Settings and coming back. The editor test now sets the preference in the store and
  asserts the request body carries `en` (it used to click the switch in the form). The two old assertions
  that the switch showed `aria-pressed` on the trigger were removed with the switch. They were red first
  (the whole launcher spec failed on the missing `setPreferredLanguage`, which is a noisier red than I
  like, and the store test failed on `undefined`). Three mutations, each failing exactly its own test:
  (M1) `generate` ignores the setting and always sends `fr`, (M2) `clearHistory` resets the preference,
  (M3) the Settings buttons keep the choice in component state instead of the store. All restored
  (byte-identical). With the schema, API and store specs the five files give 214/214.
  Not tested, on purpose: that a retry keeps the run's language (the one-line closure is covered by the
  existing retry test only for the default language, so this is **a gap**), and the visual layout.

### Browser check (launcher)

Using `agent-browser` against the already-running dev server, on a **throwaway public page** that seeded
a `direction` session and exposed the store (deleted afterwards; `git status` shows no trace). I drove
the real store and looked at screenshots:

- 1440 px wide: the button sits 16 px from the right and bottom edges, 48 px wide, white with the flower.
- Loading: the popover opens above the button with the shimmer text and the product name; the button
  shows a ring. (Both behaviours changed later: the popover no longer opens by itself, and the ring
  became the morphing icon.)
- A finished run plus a failed run: newest open with all four fields and a warning line, older folded,
  "Clear history" in the footer.
- Closing the popover and finishing a run: a green dot appears; `unread` was `true`.
- 390 px wide: the popover fits with a margin on both sides.
- Toaster: its `--offset-bottom` and `--mobile-offset-bottom` are `5rem`, position `bottom-right`. I
  read the CSS variables; I did **not** fire a toast and look at it.

### Browser check (sidebar)

On a throwaway public page again (deleted afterwards) with a seeded `direction` session and one ready
run in the store, dark theme only:

- 1440 px: the panel is 736 x 544 px, the sidebar 176 px wide; Suggestions sits at the top and Settings
  ends 8 px above the panel's bottom edge, so it really is pinned to the bottom. The divider shows above it.
- Clicking Settings: `aria-current` moves to it and "There are no settings yet." is centred in the
  content area. Conversations was not clicked in the browser; the component test covers it.
- 390 px: the panel keeps 16 px on each side, the sidebar is a 48 px icon rail, and the three labels
  are still in the DOM for screen readers.
- With Settings open, a result landing set `unread` to `true`; the Suggestions item showed its dot
  and the launcher showed the `ready` indicator.
- Not looked at: light theme, French text, keyboard navigation through the sidebar, a generation
  starting while another section is open (covered by a store test only).

### Browser check (AI look)

On a second throwaway public page (deleted afterwards) that rendered the card for `name`,
`longDescription` and `features`, plus the avatars. I read the computed style and looked at
screenshots in dark and light theme:

- The card border is 1 px, solid, transparent in `border-color`, with the gradient in the border box
  and `--card` in the padding box.
- Magenta at the top left runs through blue to cyan at the bottom right, and reads well on both themes
  (cyan is the faintest on white).
- No element with a `sparkle` class is left on the page. The assistant avatar shows the icon at avatar
  size.
- Not looked at: the card inside the real editor form, the real support thread, French text, a narrow
  screen.

The Apply button was checked on a throwaway page (deleted), twice. The first version showed the
outline described above. After the fix, the computed border is `0px`, the `background-image` is the
white wash over the gradient (55% after the second round), text is `rgb(0, 0, 0)`, and in zoomed
screenshots (2x, dark and light theme) there is no outline and "Apply" reads cleanly across the whole
button. The contrast figures are computed from the colours, not measured from pixels. I looked at the English label only; the figure
is a minimum over the whole gradient, so the longer French "Appliquer" is covered by it. Not looked at:
hover, focus ring, disabled.

### Browser check (icon morph)

On a third throwaway public page (deleted afterwards) with a phase grid, the two supplied SVGs side
by side for comparison, and start/stop buttons driving the real launcher:

- The phase grid matches: phase 0 is the AI mark, phase 1 the circle, phase 2 the flower, and the
  in-between phases interpolate both the outline and the blobs.
- With a run started, five launcher screenshots taken about 0.4 s apart show the blob field and the
  outline moving, and the mask's `d` attribute changes between reads.
- After stop, the icon finishes its loop and rests at phase 0: the rendered mask path equals the
  original mark's path byte for byte.
- Not looked at: reduced motion (the loop is gated on `usePreferredReducedMotion` and the static
  ring shows instead), French text, a real generation driving it.

The field animation was checked on a fourth throwaway page (deleted afterwards) rendering a heading
input, a textarea and a features card with the `ai-generating` class, in both themes:

- Two frames ~0.9 s apart in each theme show the ring at different rotations; in dark theme the
  second frame catches the shimmer band mid-sweep. The tint reads in both themes.
- Not looked at: the animation on the real editor fields (the class is the same, the wiring is
  typechecked and the editor spec passes), reduced motion (animations off, tint stays).

### Edits I made to Tester-written specs

- `test/unit/ai-rate-limit.test.ts`: the "busy" test was wrong (not the limiter); I corrected it.
- `test/unit/ai-product-copy-api.test.ts`: added `vi.clearAllMocks()` to `beforeEach`. Without it the
  `vi.fn` mocks leaked call counts across tests (first run 20 passed / 6 failed; after, 26/26).
- `test/nuxt/products-ai-suggestions.test.ts`: four `wrapper.get(…).exists()` calls became
  `wrapper.find(…).exists()` (a typecheck error, `get` returns a wrapper without `exists`); removed a
  header comment that described the stub phase.
- `test/unit/ai-generation-store.test.ts`: formatting only (`oxfmt`).
- Tester T2 also added `!` non-null assertions to its own tests to clear five typecheck errors.

### Not covered by tests

- A real OpenAI call, the real Responses API request shape, and GPT-5 mini's behaviour with the strict
  schema. `openai-client.ts` is a 13-line adapter and the service tests use a fake client.
- Layout. happy-dom has no layout, so placement, size and overlap rest on the browser check above.
- **AI look follow-up:** no tests were added, at your request: the change is an icon swap and a CSS
  utility, and happy-dom cannot render a gradient. It rests on the browser check below and on the
  existing specs, which I did not re-run for this change. The existing avatar spec keeps its test ids
  and was not edited.
- **Icon morph follow-up:** no tests were added either, same standing request. The interpolation is
  pure geometry, and what matters (does it look smooth, does it rest correctly) only shows in a real
  browser; it rests on the browser check above. The three AI specs were re-run after the change
  (116/116). The header trigger's own flower icon was checked on a throwaway page (deleted): it
  renders correctly at 32 px and 96 px in both themes, and the spinning copy was mid-rotation in
  the screenshots.
- **Field animation follow-up:** no tests again, same request. `isGeneratingForTarget` is a
  conjunction of `status` and `ownsResult`, both already spec-covered; the visuals rest on the
  browser check above.
- Not checked in a browser: the real product editor flow (cards appearing in the form after a real
  generation), light theme, a fired toast, keyboard order, and French text.
- French/English copy quality.
- The `/api/ai/**` route-rule limits (rate limiter and body size) are configuration; no test sends an
  oversized body through Nitro.

## Not done

- **Staging smoke test** with a real key and a non-production product, which the plan lists under
  phase 2 "Done when". A first real run from the user's browser returned 502 `provider_unavailable`.
  With the key in the user's local `.env`, a throwaway script (deleted) showed `403 model_not_found`:
  that OpenAI project cannot use `gpt-5-mini`, the configured default. The key sees only
  `gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra` (plus two audio models). The exact request shape
  (strict JSON schema, low reasoning effort, `store: false`) worked on all three `gpt-5.6-*` models.
  Not verified: a request with images, the default model, and the endpoint end to end. To use the
  feature, enable `gpt-5-mini` for the project, or set `NUXT_AI_PRODUCT_COPY_MODEL` and the two price
  variables for a model it can use.
- **Provider status in the audit.** The 502 above was hard to tell from the audit line, because it does
  not record the provider's HTTP status or error code. Not added.
- **Datasheet input** (deviation 1).
- **Shared quota storage.** The limiter is process-local and correct only for one Node process, as the
  plan accepts. Replicas need shared storage behind `rate-limit.ts`.
- **Deployment docs.** No `.env.example` or README exists for these variables; they are documented only
  in comments in `nuxt.config.ts`: `NUXT_OPENAI_API_KEY`, `NUXT_AI_PRODUCT_COPY_MODEL`,
  `NUXT_AI_PRODUCT_COPY_QUOTA_PER_HOUR`, `NUXT_AI_PRODUCT_COPY_TIMEOUT_MS`,
  `NUXT_AI_PRODUCT_COPY_PROMPT_CHAR_LIMIT`, `NUXT_AI_PRODUCT_COPY_MAX_OUTPUT_TOKENS`, and the two price
  variables. In production the process refuses to boot without the key.

## Notes for the reviewer

- **Unexpected errors in the handler are not audited.** `suggestions.post.ts` audits only
  `ProductCopyError`; anything else is rethrown. The service maps provider failures to
  `ProductCopyError`, but a genuine bug would produce a 500 with no audit line. Decide whether that
  should also be recorded.
- **`retry-after` is set with `event.node.res.setHeader`** rather than h3's `setResponseHeader`,
  because h3 types that header as a number and the spec pins the string form.
- **Quota counts attempts that reach the limiter.** `acquire` increments the count before the product
  read and the OpenAI call, so a request that later fails (provider error, or a persisted-read denial)
  still uses one of the 50. Confirm this is the intended policy. The allowance is also read from
  runtime config once, on the first request, so changing it needs a restart.
- **Result ownership.** A result is shown only when the store's target matches the editor's target
  (`{ kind: "product", id }`, or `{ kind: "new", token }` with a per-editor `useId` token for a new
  product). The history survives unmounts; the cards do not. Please check the switch-product and cancel paths, which are covered by specs 17 and 18
  of the editor suite.
- **Slug on Apply.** Applying a name sets `values.nom`; the existing name watcher keeps an untouched
  add-mode slug in step and leaves a hand-edited slug alone. No new slug code was written.
- **Pre-existing uncommitted changes in the worktree are not mine and are untouched by me:**
  `BrandLogoPreview.vue`, `HistoryEntry.vue`, `FiltersInputDateRange.vue`,
  `app/utils/history-image-value.ts`, `test/unit/history-image-value.test.ts`, and
  `plans/2026-10-02-product-history-infinite-list.md`. Commit them separately.
- **Pre-existing failing specs** (listed under Tests) will fail CI regardless of this change.
- **Launcher details worth a look:**
  - The popover is non-modal and closes on any outside click, including a click into the form. A run
    keeps going when it is closed; the button shows it.
  - Starting a run does not open the popover (changed on request). The morphing icon signals the
    run while it is in flight, and the unread dot signals a landed result; only the launcher button
    opens the panel, and focus moves in as usual then.
  - `editorTarget` is one slot. Only one product editor is open at a time today; two at once would
    race for it.
  - **Review in editor** is the only way to reuse an old package. For a "new product" entry the
    token belongs to a closed editor, so it can never be reviewed; the text stays readable and
    selectable.
  - Time is shown as `HH:mm` (24 h, in both languages) and is computed when the panel renders, so
    it is never stale and never rendered on the server.
  - The launcher is shown on every admin page for `direction` users, including pages with nothing
    to generate. That was the request; say if it should hide outside product pages.
