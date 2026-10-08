## What I built

Replaced the candidate-review/save picker with a live Logo.dev `/name/:name` image preview derived from the selected brand. The picker has an initials fallback, visible attribution, and no discovery, review, or save controls; the backend implementation remains untouched for rollback.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| URL contract | Done | `app/utils/logo-dev.ts`, `test/unit/logo-dev.test.ts` |
| Admin preview, public key, CSP, attribution | Done | `app/components/products/BrandLogoPreview.vue`, `app/components/products/OverviewMedia.vue`, `nuxt.config.ts`, `i18n/locales/products/{en,fr}.json` |
| Remove obsolete frontend candidate flow | Done | Removed `BrandLogoPicker.vue`, `BrandLogoCandidateList.vue`, `useBrandLogoMutations.ts`, and `types/api/brand-logo.ts`; backend files remain unchanged |
| Verify and document | Done | This walkthrough; focused checks below |

## Deviations

- Added the optional `NUXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY` setup note to `README.md`; this repo has no tracked `.env.example` to update.
- Per the user's choice, the attribution link appears beside the preview only, not on the public login screen. This may not meet Logo.dev's stated public-accessibility verification requirement for commercial Community use.

## Tests

- Red phase: `bunx vitest run test/nuxt/products-brand-logo.test.ts --coverage.enabled=false` — **4 failed**, because the old picker did not render the direct Logo.dev image/fallback behavior.
- `bunx vitest run test/unit/logo-dev.test.ts test/nuxt/products-brand-logo.test.ts test/nuxt/products-category-picker.test.ts test/nuxt/products-lifecycle.test.ts --coverage.enabled=false` — **4 files passed, 13 tests passed**.
- `bun run typecheck` — passed.
- `bun run i18n:check` — passed.
- `bun run lint` — passed with the two existing warnings in `app/types/session.ts` and `test/unit/categorie-schema.test.ts`.
- `bunx oxfmt --check` on the eight changed source/config/locale/test files — passed.
- `bun run fallow` — passed: no issues in 770 changed files; inherited findings were excluded by the audit gate.
- `git diff --check` — passed.
- `bun run build` — completed successfully. It emitted existing warnings about the Lottie dependency's `eval`, large chunks, and unresolved `nuxt-zod-schemas` treated as external.
- Adjacent product-form run — **56 passed, 1 failed**. The unrelated delivery-interval test `shows the default option with its badge for a product that inherits it, and stays pristine` also fails when run alone at `test/nuxt/products-detail-form.test.ts:986`; this change does not touch delivery behavior.

## Not done

- No real Logo.dev request was made from the app because no publishable key was provided/configured here. Set `NUXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY` to the Logo.dev `pk_` key in the admin environment; never use the backend `sk_` key in this variable.
- The full Vitest suite was not rerun. No backend files or database state were changed in this follow-up.

## Notes for the reviewer

- The URL is derived at render time and deliberately ignores any existing taxonomy `logo_url`; there is no per-brand override or image-byte persistence.
- CSP permits only the specific Logo.dev image host addition (`https://img.logo.dev`).
- Confirm with Logo.dev that picker-only attribution is acceptable for this Community use before production rollout; their docs describe attribution as publicly accessible.
