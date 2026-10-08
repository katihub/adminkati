## What I built

Reused `app/components/products/BrandLogo.vue` (`<ProductsBrandLogo />`) to display brand images in the taxonomy brand table (`BrandTable.vue`) and brand detail panel (`BrandDetailPanel.vue` / `BrandPanelView.vue`). When a Logo.dev publishable key is present, brand logos are loaded via `logoDevNameUrl()`; when missing or upon image load failure, each slot gracefully falls back to brand initials.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| `BrandLogo` custom class support | Done | `app/components/products/BrandLogo.vue` |
| `BrandTable` logo integration | Done | `app/components/taxonomy/BrandTable.vue` |
| `BrandDetailPanel` & `BrandPanelView` logo integration | Done | `app/components/taxonomy/BrandDetailPanel.vue`, `app/components/taxonomy/BrandPanelView.vue` |
| Automated component tests | Done | `test/nuxt/taxonomy-brands.test.ts` |
| Quality gate verification | Done | Vitest, typecheck, lint, oxfmt, i18n:check, fallow audit |

## Deviations

None. All implementation phases from `plans/2026-10-01-taxonomy-brand-logos.md` were followed.

## Tests and checks

- `bunx vitest run test/nuxt/taxonomy-brands.test.ts` — passed (5 tests passing).
- `bunx vitest run test/nuxt/taxonomy-page.test.ts` — passed (11 tests passing).
- `bunx vitest run test/nuxt/products-brand-logo.test.ts` — passed (4 tests passing).
- `bun run typecheck` — passed with 0 errors.
- `bun run lint` — passed with 0 errors (2 existing warnings).
- `bun run format` — passed.
- `bun run i18n:check` — passed.
- `bun run fallow` — passed ("✓ No issues in 783 changed files").
- `git diff --check` — passed with no whitespace errors.

## Not done

- No backend changes or database migrations: brand logos are dynamically resolved through the client runtime config and Logo.dev Community endpoint matching existing product form conventions.

## Notes for the reviewer

- `BrandTable.vue` displays `ProductsBrandLogo` at `size="sm"` (`size-9` container, 32px image) with `decorative: true` because the brand name is displayed beside it.
- `BrandPanelView.vue` displays `ProductsBrandLogo` at `size="md"` (`size-11` container, 48px image) in the panel header, replacing the static `ph:tag` icon.
- `BrandDetailPanel.vue` computes the `brandImageUrl` using `logoDevNameUrl` and `logoDevPublishableKey` and forwards it to `BrandPanelView`. `BrandPanelView` also defaults to deriving it if omitted.
