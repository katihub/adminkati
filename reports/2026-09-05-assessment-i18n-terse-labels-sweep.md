# i18n terse-label sweep

## Question

The user shortened `taxonomy.toolbar`'s labels to drop words redundant with on-screen context
("Filter by department" → "Department", "Search categories…" → "Search", "All departments" → "All",
"Clear filters" → "Clear", "Add category" → "Add", "contains" → "has") and asked for the same
treatment across every locale file in `i18n/locales/`. Which strings does that style apply to, and
which don't fit it without cost?

## Method

Read all 8 locale domains (`auth`, `common`, `content`, `errors`, `products`, `stats`, `taxonomy`,
`validation`) in both `en` and `fr`, ~479 keys total. Before editing, confirmed scope with the user:
apply the style to UI chrome (nav, buttons, toolbars, tabs, headers, empty states, dialog/panel
titles); leave full-sentence copy (errors, validation, auth legal/support/showcase text) untouched,
since brevity there trades away guidance a user needs when something is actually broken, rather than
trimming redundancy.

Within that scope, edits followed patterns actually demonstrated in the source edit, rather than a
freeform rewrite:

- `"Filter by X"` → `"X"`
- `"Search X"` (label) → `"X"`; `"Search X…"` (placeholder) → `"Search"`
- `"All X"` (a dropdown's "everything" option) → `"All"`
- `"Clear X"` → `"Clear"`
- `"Add X"` (a single, unambiguous toolbar create-button) → `"Add"`
- filter operator `"contains"` → `"has"` (and the French equivalent `"contient"` → `"a"`)

Every domain was checked against every pattern; `errors/` and `validation/` had zero matches (pure
sentence copy) and were left entirely alone. `stats/` also had zero matches — no filter-bar-style
chrome exists there.

## Findings

### `auth/{en,fr}.json`

| Key | Before (en) | After (en) |
| :-- | :-- | :-- |
| `login.email.label` | Email address | Email |
| `login.email.placeholder` | Your email address | Email |
| `login.password.placeholder` | Your password | Password |
| `login.forgotPassword` | Forgot your password? | Forgot password? |

French mirrored equivalently (`Adresse e-mail`→`E-mail`, etc.). `login.password.show`/`hide` were
initially shortened to "Show"/"Hide" too, then **reverted** — they're consumed purely as
`aria-label` on an icon-only toggle button (`LoginForm.vue:107`, no visible text), so there is no
visual redundancy to trim; a bare "Show"/"Hide" aria-label is strictly worse for a screen-reader
user than "Show password"/"Hide password". Left as full-sentence copy: `heading`, `intro`, all of
`errors.*`, `support.prompt`, `legal`, `showcase.*`.

### `common/en.json`

`admin.profile.identity`: "Signed in as administrator" → "Administrator". (French was already
"Administrateur" — no change needed there.) Left `aria-label`-only strings (`navigation.label`,
`navigation.open`, `profile.label`) untouched for the same accessibility reason as the password
toggle.

### `content/{en,fr}.json`

| Key | Before (en) | After (en) |
| :-- | :-- | :-- |
| `banners.addBanner` | Add banner | Add |
| `banners.filterBar.searchOperatorContains` | contains | has |
| `banners.grid.clearFilters` | Clear filters | Clear |

French mirrored (`Ajouter une bannière`→`Ajouter`, `contient`→`a`, `Effacer les filtres`→`Effacer`).
Left `panel.title`/`panel.newTitle` ("Banner details"/"New banner") and all confirmation-dialog and
description copy untouched — those read as sentences/headings rather than redundant filter labels,
and the demonstrated pattern set doesn't cover them.

### `products/{en,fr}.json`

This domain got two rounds: the filter-toolbar labels I had just written earlier in this session
(for the modal→inline refactor) got the same treatment as everything else, plus the pre-existing
`listPanel`/`categoryPicker`/page strings.

| Key | Before (en) | After (en) |
| :-- | :-- | :-- |
| `page.addProduct` | + Add Product | + Add |
| `listPanel.allCategories` | All categories | All |
| `listPanel.clearFilters` | Clear filters | Clear |
| `filterBar.rayonLabel` | Filter by department | Department |
| `filterBar.categoryLabel` | Filter by category | Category |
| `filterBar.brandLabel` | Filter by brand | Brand |
| `filterBar.stockLabel` | Filter by stock state | Stock |
| `filterBar.sortLabel` | Sort products | Sort |
| `filterBar.showWithdrawn` | Show withdrawn products | Show withdrawn |
| `filterBar.clear` | Clear filters | Clear |
| `filterBar.stock.tous` | All stock states | All |
| `categoryPicker.rayonPlaceholder` | All departments | All |

French mirrored throughout. **Explicitly not touched**: `categoryPicker.secondaryPlaceholder` ("Add
categories"), `overview.addSecondaryCategory`/`addSecondaryCategories` ("Add category"/"Add
Categories"), and `imageGallery.add` ("Add an image"). The product detail view has several similar
"add" triggers close together (add image, add secondary category, add characteristic); collapsing
all of them to a bare "Add" — as is safe for a single toolbar button — would make them
indistinguishable from each other, which is a real usability and screen-reader-navigation cost, not
a style question. `withdrawDialog.title` ("Withdraw this product?") was left as sentence-style
confirmation copy for the same reason destructive-action copy in general was excluded.

### `taxonomy/{en,fr}.json`

The user's own edit had only touched `en.json`; `fr.json` was still the original verbose copy.
Retrofitted French to match, plus one pattern the original edit missed:

| Key | Before (fr) | After (fr) |
| :-- | :-- | :-- |
| `toolbar.searchLabel` | Rechercher des catégories | Catégories |
| `toolbar.searchOperatorContains` | contient | a |
| `toolbar.searchPlaceholder` | Rechercher des catégories… | Rechercher |
| `toolbar.departmentLabel` | Filtrer par rayon | Rayon |
| `toolbar.allDepartments` | Tous les rayons | Tous |
| `toolbar.visibilityLabel` | Filtrer par visibilité | Visibilité |
| `toolbar.clear` | Effacer les filtres | Effacer |
| `toolbar.add` | Ajouter une catégorie | Ajouter |
| `visibility.all` (en) | All visibility | All |
| `visibility.all` (fr) | Toutes les visibilités | Toutes |

`toolbar.expand`/`collapse` ("Expand all"/"Collapse all" — left unchanged by the user's own edit)
were deliberately left alone here too: `tree.expand`/`collapse` in the same file are
`"Expand {name}"`/`"Collapse {name}"` (per-row actions), so "all" is the word disambiguating the
toolbar's bulk action from those — not filler.

### `stats/`, `errors/`, `validation/`

No edits. No key in `stats/` matches any of the demonstrated patterns (no filter-bar-style chrome
exists on the stats page's i18n surface). `errors/` and `validation/` are pure full-sentence
messages, out of scope per the confirmed answer.

## Tests updated to match

- `test/nuxt/products-filter-bar.test.ts` (this task's own new test) — label assertions updated to
  the shortened text.
- `test/nuxt/category-toolbar.test.ts` — two assertions ("Filter by department"/"Filter by
  visibility") updated to the shortened text the user had already put in `en.json`.

Full suite (`bunx vitest run`) after all edits: 492 pass, 2 pre-existing/unrelated failures (see the
products-filters-inline walkthrough). `bun run i18n:check`: clean (key parity unaffected — only
values changed).

## Scope limits — not examined

- Did not touch any string classified as a full sentence: `errors/`, `validation/`, `auth`'s
  errors/support/legal/showcase/heading/intro, confirmation-dialog titles and descriptions
  (delete/discard/withdraw), banner/category panel `description` fields, and SEO
  title/description pairs everywhere.
- Did not touch `aria-label`-only strings anywhere (nav labels, profile label, password
  show/hide toggle) — these have no visual redundancy to trim and shortening them only removes
  clarity for assistive-technology users.
- Did not collapse any "Add X" string where more than one similar add-trigger appears on the same
  screen (products detail view's several add-actions).
- Did not re-derive or question the *existing* short labels already in place before this sweep
  (e.g., `common`'s nav items, most of `taxonomy.tree.*`, most of `content.banners.panel.*` field
  labels) — only strings actually matching the demonstrated redundancy patterns were changed.

## Recommendation

None required — the sweep is applied and verified. If more UI-chrome strings are added later,
match the pattern set above rather than re-deriving a shortening philosophy per string.
