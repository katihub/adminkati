# Assessment: ESLint (antfu + @nuxt/eslint) replaced by oxlint + oxfmt

Date: 2026-09-30. Branch `feat/prod-stock-mgt`.

## Question

Can the repo drop ESLint for `oxlint` 1.86.0 and `oxfmt` 0.71.0 without editing source, what does the
formatter want to change, and what behaviour is lost?

## Method

Wrote `.oxlintrc.json` and `.oxfmtrc.json`, ran `oxlint` over the tree, and ran `oxfmt --check` /
`--list-different` only (never write mode on the repo). Style diffs were produced by copying files to a
scratch directory and formatting the copies. `lint-staged` was validated in a throwaway git repo that
reuses the repo's configs, never in this working tree.

## Findings

### oxfmt capabilities (verified on copies)

| Language | Formatted | Notes |
| :-- | :-- | :-- |
| `.ts`, `.mjs` | yes | |
| `.vue` | yes, script and template | Inline elements can gain `</span\n><span>` splits (whitespace-sensitive `css` mode, the default). Left as is: `ignore` could change rendered whitespace. |
| `.json`, `.jsonc` | yes | `sortPackageJson` switched off to avoid key churn |
| `.yml`, `.toml` | yes | |
| Import sorting | **yes** (`sortImports`, perfectionist-style) | Configured as type imports, builtin, external, `@/` internal, relative; `newlinesBetween: false`. On the sampled files it reproduced the existing order exactly, except it now keeps `node:` builtins ahead of packages (antfu already did). |
| CSS, Markdown | deliberately ignored | never formatted in this repo |

Options used: `printWidth 120`, `tabWidth 2`, `semi false`, `singleQuote false`, `trailingComma all`,
`arrowParens avoid`.

### oxlint results (`bun run lint`, 621 files, 146 rules)

Plugins: typescript, unicorn, oxc, import, vue, vitest. `correctness` = error. Final result: exit 0,
2 warnings.

| Rule | Count | Disposition |
| :-- | --: | :-- |
| `vitest/require-mock-type-parameters` | 33 | `off`: it asks for `vi.fn<...>()` generics on mocks whose types are already inferred from their implementation; `typecheck` covers misuse. |
| `vitest/valid-expect` | 10 | Kept as error with `maxArgs: 2`: the hits are `expect(value, "message")`, which is valid vitest API; the rule's default of 1 argument is Jest's. |
| `vitest/no-conditional-expect` | 1 | `warn`: real (`test/unit/categorie-schema.test.ts:37`, `if (result.success) expect(...)`), not fixed per instructions. |
| `typescript/no-useless-empty-export` | 1 | `warn`: real (`app/types/session.ts:33`, `export {}` in a file that already exports), not fixed per instructions. |
| `no-undef` | n/a | `off`: Nuxt auto-imports are not declared in source; `bun run typecheck` reports genuinely undefined identifiers. |

### oxfmt measurement (`oxfmt --check`, write mode never run on the repo)

**496 files would change** out of 668 checked: 253 `.ts`, 234 `.vue`, 6 `.json`, 1 `.jsonc`, 1 `.mjs`,
1 `.toml`. The working tree includes about 50 uncommitted feature edits; the count includes them.

Representative diffs (copies, scratchpad):

`app/utils/slug.ts`: hex case and arrow parens on block bodies.

```diff
-const COMBINING_DIACRITICS_END = 0x036F
+const COMBINING_DIACRITICS_END = 0x036f
-    .filter((char) => {
+    .filter(char => {
```

`app/components/products/DetailForm.vue`: long literals wrapped, member separator, ternary parens.

```diff
-const emit = defineEmits<{ cancel: [], saved: [product: ProductDetail] }>()
+const emit = defineEmits<{ cancel: []; saved: [product: ProductDetail] }>()
-const mode = computed<"add" | "edit">(() => product.value ? "edit" : "add")
+const mode = computed<"add" | "edit">(() => (product.value ? "edit" : "add"))
-watch(() => product.value?.id, () => {
-  stockOpened.value = false
-})
+watch(
+  () => product.value?.id,
+  () => {
+    stockOpened.value = false
+  },
+)
-    televersementEnCours.value
-  || (mode.value === "add" ? ... )
+    televersementEnCours.value ||
+    (mode.value === "add" ? ... )
```

`app/components/BrandWordmark.vue`: template collapse and whitespace-sensitive split.

```diff
-    <NuxtImg
-      src="/logo.avif"
-      ...
-    />
+    <NuxtImg src="/logo.avif" alt="" width="32" height="32" class="shrink-0" :class="compact ? 'size-6' : 'size-8'" />
-      <span class="text-foreground">{{ t("now") }}</span><span class="text-primary">{{ t("tech") }}</span>
+      <span class="text-foreground">{{ t("now") }}</span
+      ><span class="text-primary">{{ t("tech") }}</span>
```

### Behaviour lost with ESLint

- **Stylistic rules not reproduced exactly**: antfu's `arrow-parens` kept parens on block bodies
  (`(x) => {}`) while dropping them on expressions; oxfmt only has `always` / `avoid`, so block bodies
  lose parens. `antfu/if-newline`, `antfu/top-level-function`, `style/member-delimiter-style` (commas
  in type literals become `;`), `style/brace-style`, `style/operator-linebreak` (operators move to line
  end) are replaced by prettier-like output, not enforced rules.
- **Nuxt-specific rules** from `@nuxt/eslint` (and the generated `.nuxt/eslint.config.mjs` import
  resolution) are gone.
- **`vue/*` template rules** (`vue/html-self-closing`, `vue/block-order`, attribute order, etc.) are
  not enforced beyond what the oxlint `vue` plugin's correctness set covers. A stale
  `<!-- eslint-disable-next-line vue/html-self-closing -->` remains in `app/components/products/Picture.vue:49`.
- **`perfectionist`** sorting beyond imports (named imports, object keys, union types) and
  `jsonc/sort-keys` / YAML / TOML key sorting: gone.
- **`regexp/*`, `jsdoc/*`, `node/*`, unicorn's non-correctness rules, `eslint-comments`, `unused-imports`
  autofix**: not enabled (only `correctness` in unicorn/oxc/import/vue/vitest/typescript).
- **Type-aware rules**: were already off; still off.
- **Markdown/CSS**: were never formatted; unchanged.
- **`.vscode`**: ESLint extension users are told to disable it.

## Gates

| Gate | Result |
| :-- | :-- |
| `bun run lint` | exit 0, 2 warnings (above) |
| `bun run format:check` | exit 1, 496 files (the measurement; expected until the format commit) |
| `bun run typecheck` | exit 0 |
| `bunx vitest run` (leaked env unset, coverage off) | 5 failed, 1344 passed; the 5 are the known `banner-editor-pill` / `dates` failures from the uncommitted `app/utils/dates.ts` edit |
| `bun run build` | "Build complete" |
| `bunx fallow audit` | no issues in 265 changed files |
| `bun run i18n:check` | exit 0 |
| `bun install` after removing packages | lockfile saved; clean `rm -rf node_modules .nuxt && bun install --frozen-lockfile` succeeded and `nuxt prepare` regenerated `.nuxt/` without `@nuxt/eslint` |
| `lint-staged` | validated in a scratch git repo: oxlint --fix, oxfmt, ignored `ui/` file untouched, ~0.4 s; not run against this working tree to avoid writes |

`eslint` itself remains in `bun.lock` as an auto-installed optional peer of `vue-eslint-parser`
(via `shadcn-vue`) and `@eslint-community/eslint-utils` (via `@nuxtjs/i18n`); it is no longer a
direct dependency and nothing runs it.

## Recommendation

1. Commit the pending feature work first.
2. On a clean tree, in a dedicated commit: `bun run format`, then `bun run format:check`,
   `bun run lint`, `bun run typecheck`, `bunx vitest run`, `bun run build`.
3. Until that commit lands, CI's `format:check` step fails and any file touched by `lint-staged` is
   rewritten whole. Consider adding the format commit's SHA to `.git-blame-ignore-revs`.

## Not examined

Type-aware linting (`oxlint-tsgolint`), enabling `suspicious`/`pedantic` categories, runtime behaviour
after formatting (the format run itself was never applied), the `oxc` VS Code extension beyond reading
its `package.json` setting names, and whether CI's `bun-version: 1.4.0` resolves the new lockfile
(local bun 1.4.0 did).
