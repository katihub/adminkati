# nowtech-admin

**This file is the single source of truth for agent instructions.** Every other instruction file in
this repo points here rather than restating anything. When guidance changes, it changes here — in
one place.

> Sections below are scaffolding, left empty until there is something real to record. Fill them as
> the project takes shape. An empty section is honest; an invented one is a trap.

---

## Always loaded: `now-tech`

**Every agent, in every tool, loads [`now-tech`](.agents/skills/now-tech/SKILL.md) and keeps it in
force for the whole session.** It is the repo's standing deliverable rule and it is not optional:

| Finish… | Write | Path |
| :-- | :-- | :-- |
| Planning | a plan | `plans/YYYY-MM-DD-<slug>.md` |
| An implementation that had a plan | a walkthrough | `walkthroughs/YYYY-MM-DD-<slug>.md` |
| A review | a review | `reviews/YYYY-MM-DD-<slug>.md` |
| A report or audit | a report | `reports/YYYY-MM-DD-<kind>-<slug>.md` |

The skill owns the slug rules, the templates, the exemptions, and the check that gates "done" — read
it before finishing any of those four kinds of work. A task whose artifact is missing is not
finished.

---

## Stack

Nuxt 4 admin dashboard — SSR by default, `compatibilityDate` pinned to `2025-07-15`.

| Layer | Choice |
| :-- | :-- |
| Framework | Nuxt `^4.5` on Vue `^3.5`, Vue Router 5 |
| Language | TypeScript (`components.json` → `"typescript": true`) |
| Package manager | **bun** (`bun.lock` is the only lockfile) |
| Styling | Tailwind CSS v4 through `@tailwindcss/vite` — CSS-first, **no `tailwind.config`** |
| UI kit | shadcn-vue (`reka-maia` style, `zinc` base) over reka-ui; `nuxt-headlessui` alongside |
| Icons | Phosphor (`@nuxt/icon` + `@phosphor-icons/vue` + `@iconify-json/ph`) plus `@iconify-json/circle-flags` for locale flags |
| Fonts | `@nuxt/fonts` — Manrope (interface and headings), IBM Plex Mono (technical data), Google provider |
| State | Pinia via `@pinia/nuxt` |
| Validation | Zod + `nuxt-zod` + `nuxt-zod-i18n` |
| i18n | `@nuxtjs/i18n` with English/French, modular domain files, `prefix_except_default`, and `NT-LANG` persistence |
| Tests | Vitest 4 + `@nuxt/test-utils` + `@vue/test-utils`, happy-dom |
| Typecheck | `vue-tsc` 3 on TypeScript `^5.9` (**not** 7 — see Commands) |
| Lint | `oxlint` 1.86 — `.oxlintrc.json`, `correctness` rules as errors |
| Format | `oxfmt` 0.71 — `.oxfmtrc.json`, including import sorting. No ESLint, no Prettier, no Biome |
| Code health | `fallow` 3.19.0 — dead code, duplication, complexity |
| Hooks | husky + lint-staged, pre-commit |

Also wired in `nuxt.config.ts`: `@nuxtjs/color-mode`, `@vueuse/nuxt`, `dayjs-nuxt`, `@nuxt/image`,
`nuxt-security`, `nuxt-seo-utils`, `nuxt-lottie`, `nuxt-freeform`, `evlog`, `nuxt-spyglass`,
`nuxt-ssr-api-logger`, `@vercel/analytics`.

## Commands

```bash
bun install              # also runs `nuxt prepare` (postinstall) — regenerates .nuxt/
bun run dev              # dev server on http://localhost:3000
bun run build            # production build
bun run preview          # serve the production build locally
bun run generate         # static prerender
```

```bash
bun run test             # vitest, both projects — watch mode in a TTY
bunx vitest run          # one-shot run; use this in agent/CI contexts
bun run test:unit        # unit project only (test/unit, node env)
bun run test:nuxt        # nuxt project only (test/nuxt, happy-dom env)
bunx vitest run test/unit/foo.test.ts       # single file
bunx vitest run -t "name of the case"       # single case by name
```

Coverage is `enabled: true` in `vitest.config.ts`, so every run produces a v8 report;
`bun run test:coverage` is the explicit form.

```bash
bun run lint             # oxlint — correctness rules are errors
bun run lint:fix         # oxlint --fix — safe fixes only, never formats
bun run format           # oxfmt — writes; this is the formatter
bun run format:check     # oxfmt --check — lists files that would change, writes nothing
bun run i18n:check       # locale key parity + raw UI string audit
```

Two tools, two jobs: `oxlint` finds bugs, `oxfmt` owns layout. Neither touches the other's concerns,
so a style disagreement is never a lint error.

`oxfmt` is configured in `.oxfmtrc.json` to reproduce the house style: print width 120, indent 2,
double quotes, no semicolons, trailing commas on multiline, `arrowParens: "avoid"`, and sorted
imports (type imports first, then builtin/external, then `@/` internal, then relative; no blank lines
between groups). It formats `.ts`, `.mjs`, `.vue` (script and template), `.json`, `.jsonc`, `.yml`,
and `.toml`. CSS and Markdown are ignored on purpose.

`.oxlintrc.json` enables the `typescript`, `unicorn`, `oxc`, `import`, `vue`, and `vitest` plugins
with the `correctness` category as errors. `no-undef` is off: Nuxt auto-imports (`ref`, `useI18n`,
`definePageMeta`, …) are not declared in the source, and `bun run typecheck` already reports any
identifier that really is undefined. Do not add a hand-maintained globals list.

```bash
bun run fallow           # fallow audit — changed files only. This is the commit gate.
bun run fallow:dead      # full dead-code + dependency scan (advisory)
bun run fallow:health    # complexity, maintainability, hotspots (advisory)
bun run fallow:dupes     # copy-paste detection (advisory)
```

**Always `bunx fallow` or the `bun run fallow:*` scripts — never bare `fallow`.** A global fallow
may be installed and on `PATH` at a different version; this project pins 3.19.0 as a devDependency,
and bare `fallow` silently runs the other one.

`fallow audit` excludes *inherited* findings, so it passes today and fails only on problems a change
introduces. The advisory scans currently report the staged-but-unused dependencies (pinia, zod,
reka-ui, and friends); that is expected on a scaffold and resolves itself as code lands. They are
deliberately not suppressed.

```bash
bun run typecheck        # nuxt typecheck (vue-tsc) — currently clean
```

TypeScript is pinned to `^5.9.0` on purpose: `vue-tsc` 3.x resolves `typescript/lib/tsc`, which
TypeScript 7 no longer exports (`ERR_PACKAGE_PATH_NOT_EXPORTED`). Do not bump to 7 until `vue-tsc`
supports it.

### The gates

| Gate | Runs | What |
| :-- | :-- | :-- |
| Pre-commit (`.husky/pre-commit`) | every commit | `lint-staged` (`oxlint --fix` then `oxfmt` on staged files) + `i18n:check` + `fallow audit` |
| CI (`.github/workflows/quality.yml`) | every pull request | lint → format check → fallow → typecheck → test → build, each `if: always()` |

Pre-commit is deliberately fast — no typecheck, no tests. Those run in CI. Every CI step runs even
when an earlier one fails, so one run shows every problem instead of one per push.

**Never `git commit --no-verify`.** The pre-commit hook is the gate; bypassing it is a decision only
the user makes. If the hook is wrong, fix the hook.

The remote is [`New-Vision-Creatives/nowtech-admin`](https://github.com/New-Vision-Creatives/nowtech-admin),
so CI runs on every pull request.

## Architecture

Nuxt 4 layout — application source lives under `app/`, not the repo root. The `@`/`~` alias
resolves to `app/`.

```
app/
  app.vue              root component — NuxtRouteAnnouncer + NuxtPage
  pages/               file-based routes
  components/          Vue components; shadcn-vue generated output under components/ui/
  plugins/             Nuxt plugins
  lib/utils.ts         cn() — clsx + tailwind-merge, the shadcn-vue helper
  assets/css/          main.css (tailwind + shadcn-vue + typeset imports), typeset.css
  assets/lottie/       animation JSON for nuxt-lottie
i18n/locales/          modular locale domain files
shared/                code used by both app and server — types/ and utils/ (Result helpers)
scripts/               repo automation scripts, including i18n checks
public/                served at / verbatim (favicon, robots.txt)
test/unit/             node-env specs
test/nuxt/             nuxt-env specs (happy-dom)
```

Paths declared in `components.json`, the ones `bunx shadcn-vue add` writes into:
`@/components`, `@/components/ui`, `@/lib`, `@/composables` — each under `app/`.

The project is still close to a scaffold: `app/pages/` holds `index.vue` and `typeset-check.vue`,
and the first specs cover i18n setup. Composable, util, type, schema, and store directories do not
exist yet — [Conventions](#conventions) fixes what each one is for; create them at those paths
rather than inventing new ones.

Boundaries that matter:

- **Tailwind is configured in CSS**, in `app/assets/css/main.css`. There is no JS config file to
  edit; theme tokens are CSS custom properties.
- **`.nuxt/` is generated and gitignored**, but `tsconfig.json` points into it.
  Run `bun install` (or `bunx nuxt prepare`) before it resolves.
- **Root holds config only** — `nuxt.config.ts`, `vitest.config.ts`, `.oxlintrc.json`,
  `.oxfmtrc.json`, `components.json`, `tsconfig.json`, `.nuxtrc`. No source at the root.

## Conventions

### Lean by default

Components, pages, and composables carry orchestration and nothing else. When something inside one
grows past that, it moves out:

| What is in the file | Where it goes instead |
| :-- | :-- |
| A helper another file could reuse | `app/utils/` (or `app/lib/` if it wraps a third-party library) |
| A type that is long, complex, or reused | the component's own `<Name>.types.ts` if only that component uses it, otherwise `app/types/` |
| A Zod schema — always, no size threshold | `app/schemas/` |
| Markup that is reused or has grown past ~100 lines of template | its own component |
| Stateful logic reused across components | `app/composables/` |

A composable is held to the same standard as a component. "It's only a composable" is not a licence
to stack four responsibilities into one `useThing()`.

### Where code lives

| Directory | Holds | Auto-imported |
| :-- | :-- | :-- |
| `app/components/` | one folder per component: `Name/Name.vue`, plus `Name/Name.types.ts` for its own larger types | yes — nested dirs prefix the name (`user/Card.vue` → `<UserCard />`) |
| `app/components/ui/` | shadcn-vue output — **user-owned**, changed only when the user explicitly initiates it | yes |
| `app/composables/` | `useX.ts` | yes, **top-level files only** |
| `app/utils/` | reusable helpers | yes, **top-level files only** |
| `app/types/` | shared types | no — `import type { X } from '@/types/x'` |
| `app/schemas/` | Zod schemas | no — import explicitly |
| `app/lib/` | wrappers for third-party libraries, one file per library (shadcn-vue's `cn` lives here) | no — `@/lib/utils` |
| `shared/utils/` | helpers used by both app and server (`ok`, `err`, `attempt`) | yes, in app and server, **top-level files only** |
| `shared/types/` | types used by both app and server (`Result`, `AppError`) | no — `import type { X } from '#shared/types/x'` |

Two rules that bite:

- **`app/components/` holds component folders:** `UserCard/UserCard.vue`, plus
  `UserCard/UserCard.types.ts` when the component has larger types of its own. No `helpers.ts`, no
  `constants.ts`. `nuxt.config.ts` limits the component scanner to `.vue`, so a `.types.ts` is never
  registered as a component. `app/components/ui/` is generated by `bunx shadcn-vue add`: do not
  edit, move, rename, or delete anything there on your own — if a task seems to need it, stop and
  ask the user first.
- **Nuxt scans only the top level** of `composables/` and `utils/`. A file in a subdirectory is not
  auto-imported; re-export it from an `index.ts` or import it by path.

### Error and empty states

Three components, picked by container width and by whether the state is a real error:

| Container | State | Component |
| :-- | :-- | :-- |
| Narrow — list panel, sidebar | error or empty (not distinguished) | `InlineStateNotice.vue` — small icon-left-of-text row, no action |
| Wide — full page, wide panel | real error | `ApiErrorCard.vue` — icon-media card, status-derived title, retry button |
| Wide — full page, wide panel | empty (not an error — e.g. "nothing selected yet") | `EmptyStateCard.vue` — same big card visual, no retry button |

A narrow list column has no room for a distinct error message plus a retry action, so
`InlineStateNotice` shows one fixed message ("No products", "No propositions") for both a fetch
failure and a genuinely empty result — put retry capability in the wide detail panel instead, which
already re-fetches independently. `ApiErrorCard` and `EmptyStateCard` in a narrow column overwhelm
it; `InlineStateNotice` in a wide page reads as an afterthought.

### Code

- **DRY and reusable.** Check `utils/` and `composables/` for an existing function before writing a
  new one. Simple logic used once stays inline; extract it when it is genuinely complex or repeated
  (three or more places on the server, a second use for a composable).
- **One function, one job.** If the name needs an "and", it is two functions.
- **No side effects unless genuinely required.** A function that transforms input returns a value;
  it does not also write to a store, fire a request, or mutate its argument. Where an effect is
  actually the point, that is the function's single job and its name says so.

### Comments

Avoid unnecessary comments. A comment is necessary to the context, short, concise, and easy to
understand.

- Explain *why*, never *what*. A comment that restates the code is deleted; make the code clearer
  instead.
- No commented-out code. Delete it — git keeps the history.
- Keep comments up to date. Change or remove them when the code changes.
- Use `TODO`, `BUG`, and `FIXME` with a short note on what is needed, plus the *Better Comments*
  markers: `// !` a warning not to miss, `// ?` a question that needs an answer, `// *` something
  important to understand.

### Style

TypeScript everywhere; `<script setup lang="ts">` in components. Styling is Tailwind utilities in the
template, composed with `cn()` from `@/lib/utils` when classes are conditional.

Formatting is not a matter of taste here — `oxfmt` owns it, and `format:check` fails CI. Indent 2,
double quotes, no semicolons, sorted imports. Run `bun run format` rather than formatting by hand,
and do not reformat code your change does not touch.

CSS and Markdown are **not** linted or formatted. `app/assets/css/` keeps its 4-space indent, and
every `.md` file is ignored in `.oxfmtrc.json`. Match the file you are editing in those.

### Internationalization

These rules are **HARD & NON-NEGOTIABLE**:

1. Where the component is very small and does not change, use per-component inline translations:
   <https://i18n.nuxtjs.org/docs/guide/per-component-translations>.
2. For links, use Nuxt i18n's `<NuxtLinkLocale>` over Nuxt's own `<NuxtLink>` so internal links stay
   locale aware: <https://i18n.nuxtjs.org/docs/components/nuxt-link-locale>.
3. When creating routes, use Nuxt i18n's custom route feature:
   <https://i18n.nuxtjs.org/docs/guide/custom-paths>.

## Path rules

Coding rules live in [`.agents/rules/`](.agents/rules/). Claude Code loads its own copy from
`.claude/rules/` by path. Codex and OpenCode have no path-scoped rules, so they follow this table:
before editing a file, read the rule for its path. `general.md` and `errors.md` apply to all code;
OpenCode loads those two itself through `opencode.json`, Codex reads them from here.

Rules are opt-in: they apply to new and touched code, and existing code is not migrated until a
change touches it. The Result helpers in `shared/` follow the same footing — nothing is converted
to use them yet.

| Editing | Read |
| :-- | :-- |
| Any code | `general.md`, `errors.md` |
| `app/components/**/*.vue` | `components/index.md` |
| `app/components/ui/**` | `components/ui.md` |
| `app/composables/**` | `composables.md` |
| `app/utils/**` | `utils.md` |
| `app/lib/**` | `lib.md` |
| `app/types/**` | `types.md` |
| `app/pages/**/*.vue` | `pages.md` |
| `app/middleware/**`, `server/middleware/**` | `middleware.md` |
| `server/**` | `server.md` |
| `*.css`, `*.scss` | `css.md` |

## Testing

**TDD is mandatory, not a preference.** Every change to a function, component, or piece of business
logic runs the red → green loop: failing test first, then the minimum code that makes it pass. The
[tester](.agents/agents/tester.md) role writes those failing tests; the implementer makes them
pass.

### What gets tested

**Functions, components, and business logic.** Each on three axes:

| Axis | What the test has to answer |
| :-- | :-- |
| Functionality | Does it do what it claims, for the inputs that actually occur? |
| Robustness | What happens at the edges — empty, missing, malformed, out of range, dependency failing? |
| Security | Can hostile input escape validation, leak data, or cross an authorization boundary? |

A test that covers none of those three is not worth writing. A composable is the exception to all of
the above: it gets a test only when the user requests one, and then at most one.

### What does not get tested

**Useless tests are banned from this repo.** If a test cannot fail for a reason that matters, delete
it — a passing suite full of noise is worse than a small one that means something.

- Not the framework, the library, or the language. Nuxt routing, Pinia reactivity, and Zod's own
  parsing are already tested upstream.
- Not tautologies — assertions that recompute the expected value the way the code does pass by
  construction and can never disagree with it.
- Not markup for its own sake: class names, DOM structure, snapshots nobody reads.
- Not trivial pass-through code — a re-export, a getter with no logic.
- Never for a coverage number. Coverage is a byproduct; it is never the target.

### Kinds

Two kinds only: **unit** and **component**. **No e2e for now** — nothing here drives a browser, and
adding that is a decision to make deliberately, not a test to slip in.

| Kind | Lives in | Env | Covers |
| :-- | :-- | :-- | :-- |
| Unit | `test/unit/` | node | pure functions, business logic, stores, Zod schemas |
| Component | `test/nuxt/` | nuxt + happy-dom | components mounted with `@vue/test-utils` |

Component tests go in `test/nuxt/` because they need the Nuxt environment for auto-imports and
module context; anything that does not need Nuxt belongs in `test/unit/`, which is faster.

### Organisation

- One spec mirrors the unit under test: `app/lib/utils.ts` → `test/unit/utils.test.ts`.
- Test names read as specification sentences — the capability, not the mechanism.
- **The include globs are not recursive.** `vitest.config.ts` uses `test/unit/*.{test,spec}.ts` and
  `test/nuxt/*.{test,spec}.ts`, so a spec in a subdirectory is silently never run. Keep specs flat,
  or widen the glob on purpose.

Running one file or one case: see [Commands](#commands).

## Gotchas

<!-- Non-obvious constraints. Things that have already bitten someone. -->

- **`app/components/ui/` and `app/components/vuzeno/` are neither linted nor formatted.** Both are in
  `.oxlintrc.json`'s and `.oxfmtrc.json`'s ignores and in `.fallowrc.jsonc`'s `ignorePatterns`.
  shadcn-vue owns the first and rewrites it on every `add`, so a hand edit there is lost on the next
  regeneration. Nothing in it changes unless the user explicitly initiates or confirms it; a bug there
  is fixed by regenerating the component.
- **Type-aware lint rules are not running.** `no-floating-promises`, `no-misused-promises`, and
  `await-thenable` need `oxlint-tsgolint` and `--type-aware`, which is not set up; `bun run typecheck`
  covers the rest. **Revisit this once `app/` has real async data-fetching code.**
- **The stylistic and Nuxt-specific ESLint rules are gone with ESLint.** `oxfmt` reproduces layout, but
  nothing enforces `antfu/if-newline`, `vue/*` template rules, `perfectionist` sorting outside
  imports, `regexp/*`, `jsdoc/*`, or JSON/YAML/TOML key sorting. `oxfmt`'s `sortPackageJson` is off
  so `package.json` keeps its current order.
- **`oxfmt` has no "parens only on block bodies" arrow option.** antfu wrote `(x) => { … }` but
  `x => expr`; `arrowParens: "avoid"` writes `x => { … }` everywhere. Expected, not a bug.
- **Until the repo-wide `oxfmt` commit lands, `format:check` fails.** Most files predate the formatter.
  `lint-staged` formats every file it touches in full, so an edit to an unformatted file produces a
  whole-file diff.
- **`.agents/` is neither linted nor formatted** — it is in both ignore lists, so the 336 vendored
  skill docs and the playbooks are untouched. Do not rely on lint to catch anything there.
- **`bunx vitest run` exits 1 today**, because both `test/unit/` and `test/nuxt/` are empty and
  vitest treats "no test files found" as a failure. CI passes `--passWithNoTests` to work around it;
  remove that flag from `.github/workflows/quality.yml` as soon as the first spec exists, so an
  accidentally-empty suite goes back to failing loudly.
- **fallow's config key is `ignorePatterns`, not `ignore`.** A top-level `ignore` is accepted and
  silently does nothing. Check `bunx fallow config` after editing `.fallowrc.jsonc`.
- **`zod` is pinned to `^3.25.76` and must not go to 4.** `nuxt-zod-i18n`'s runtime plugin imports
  `defaultErrorMap`, `ZodIssueCode`, and `ZodParsedType` from `zod` — all removed in zod 4, and no
  zod-4-compatible release of the module exists. Dev hides it (bun installs a nested zod 3 that Vite
  resolves); the Nitro build externalises `zod`, so production resolves the hoisted copy and the
  function dies at import with `does not provide an export named 'ZodParsedType'`. 3.25.x is the
  bridge release — the zod 4 API is still available at `zod/v4`. See
  `reports/2026-08-27-postmortem-zod-4-production-crash.md`.

---

## Agent workflow

Already set up and ready to use. Details live in the linked files — do not restate them here.

### Roles

Four sub-agents: **planner → tester → implementer → reviewer**. Playbooks in
[`.agents/agents/`](.agents/agents/README.md), which also carries the model matrix and each tool's
wiring. The [`agent-roles`](.agents/skills/agent-roles/SKILL.md) skill covers the handoff contracts
and how to run the loop in a tool without native sub-agents.

### Skills

Canonical in `.agents/skills/`, symlinked into every tool's own skills directory.

- [`now-tech`](.agents/skills/now-tech/SKILL.md) — **always loaded.** The deliverable rule: which artifact every kind of work has to leave behind, and where.
- [`mockup-to-plan`](.agents/skills/mockup-to-plan/SKILL.md) — mockup + requirement → scoped implementation plan.
- [`review-work`](.agents/skills/review-work/SKILL.md) — implementation + plan + walkthrough → findings, ordered MAJOR / MEDIUM / MINOR / INT.
- [`agent-roles`](.agents/skills/agent-roles/SKILL.md) — the roles and their handoffs.

### Output folders

One kebab-case slug threads a feature through all three, so its plan, walkthrough, and review share
a name. When each file is mandatory is the [`now-tech`](.agents/skills/now-tech/SKILL.md) skill's
rule, above.

| Folder | Written by | File |
| :-- | :-- | :-- |
| [`plans/`](plans/README.md) | Planner | `YYYY-MM-DD-<slug>.md` |
| [`walkthroughs/`](walkthroughs/README.md) | Implementer | `YYYY-MM-DD-<slug>.md` |
| [`reviews/`](reviews/README.md) | Reviewer | `YYYY-MM-DD-<slug>.md` |
| [`reports/`](reports/README.md) | Any role | `YYYY-MM-DD-<kind>-<slug>.md` |

---

## Where each tool reads this

| Tool | Reads | How |
| :-- | :-- | :-- |
| Codex, OpenCode, Antigravity | `AGENTS.md` | Natively — this file, directly |
| Claude Code | `CLAUDE.md` | `@AGENTS.md` import |
| GitHub Copilot | `.github/copilot-instructions.md` | Symlink to this file |

Add project instructions **here only**. The others resolve to this file, so editing them either
does nothing or creates the drift this layout exists to prevent.

## Auth and data infrastructure conventions

The `server/` tree contains Nitro-only code: `server/api/` owns browser-facing handlers,
`server/middleware/` request context setup, `server/plugins/` boot checks and lifecycle hooks, and
`server/utils/` pure or request-scoped integrations. Supabase runs only in `server/utils/supabase.ts`;
the browser never receives a token.

The refresh lock is process-local. It is correct only while deployment has one Node process; adding
replicas requires shared storage or refresh rotation can log users out without a useful error.
`app/types/api/` types are handwritten from `../NowTech-backend-`; every exported type has a source
file-and-line citation, and no code generator is used. Prefetch only data rendered above the fold.

TanStack Query owns API/server state. Pinia owns browser-only state such as UI preferences or draft
filters. Never mirror query data into a Pinia store.

Known infrastructure constraints:

- The backend's global throttler is a shared 10-request-per-second ceiling behind Traefik. SSR
  prefetches stay limited to above-the-fold data; a six-query dashboard is a design error, not a
  tuning problem.
- `nuxt-security`'s XSS validator is disabled under `/api/**`. It rewrites JSON strings and would
  reject valid passwords or content containing `<` or `>`; the backend validation remains the input
  boundary for proxied JSON.
- The `/api/v1/**` rate limiter is route-scoped because the catch-all makes the whole API one route;
  its 600-per-five-minute budget is separate from the default page-route budget.
- `createAuthClient()` must remain a per-request factory. A Supabase client singleton retains its
  current session in memory even with persistence disabled and can leak one user's session.
- The sealed session uses `sessionHeader: false`; h3 otherwise accepts an `x-nt-session` header
  before the cookie, which would bypass the cookie-only session boundary.
- The BFF uses its explicit header allowlist. Do not replace `sendProxy` with `proxyRequest`, whose
  default forwarding includes the sealed `Cookie` header.
- `auth.global.ts` runs before i18n's client-side locale middleware. Compute redirects with an explicit
  locale from the target path, and do not pass an already-prefixed `next` path through `localePath`.
- TanStack Query hydration runs synchronously in the Vue Query plugin setup, before the initial
  router middleware pass. Moving hydration to `app:created` makes signed-in hard loads appear
  anonymous.
- `nuxt-security`'s request-size limiter is 2 MB for raw non-multipart writes while backend image
  uploads accept 5 MB; raw image upload remains out of scope.

French backend error details are preserved beneath translated status headlines because the backend does
not yet supply stable error codes.
