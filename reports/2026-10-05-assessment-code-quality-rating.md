# Assessment: code quality rating

Date: 2026-10-05. Kind: assessment.

## Question

What is the current code quality of `nowtech-admin` on a 1–10 scale?

## Method

Reviewed the repository structure, recent commits, project instructions, AI integration and BFF
boundaries, test-pruning audit, and the configured quality gates. Ran the available lint, formatting,
i18n, fallow, typecheck, unit-test, Nuxt-test, and production-build commands. Untracked user files
were not modified.

## Rating

**6/10 overall.**

The implementation has good architecture, validation, security boundaries, and documentation, which
would merit roughly 7–8/10 in isolation. The current branch loses points because the typecheck and
both test projects fail, so it is not presently CI-clean or release-ready.

## Evidence

### Strengths

- Nuxt, server, shared, schema, composable, and test responsibilities are clearly separated.
- The BFF keeps backend tokens server-side and uses explicit proxy headers.
- AI input is bounded and validated with strict Zod schemas; image URLs are filtered before being
  sent to the provider; rate limiting, request-size limits, CSRF, CSP, and audit logging are present.
- `bun run lint` passes with only two warnings, `bun run i18n:check` passes, `bun run fallow` reports
  no changed-file issues, and `bun run build` completes successfully.
- The test-pruning work is unusually transparent: it records the 234 removed tests, categories,
  tradeoffs, and remaining failures instead of presenting a misleading clean result.

### Issues lowering the score

- `bun run typecheck` fails at `test/unit/ai-product-copy-service.test.ts:26` because a test fixture
  returns a `ProductCopySuggestion` without required choice fields.
- `bun run test:unit` reports **9 failed / 1,019 passed** tests across 96 files. Failures include
  stale AI schema expectations, an outdated structured-output expectation, and a provider-detail
  assertion that conflicts with the current sanitised-detail design.
- `bun run test:nuxt` reports **14 failed / 927 passed** tests across 135 files. Failures include
  image/IPX configuration assertions, product-detail form expectations, a delivery badge assertion,
  and two 2,000-row render tests timing out at the default five-second limit.
- The recent pruning removed 234 tests, including 80 composable tests. The accompanying audit calls
  out the reduced protection around retry, idempotency, pagination, and cache invalidation paths;
  this is a conscious tradeoff, but it lowers regression coverage until higher-value replacements
  exist.
- `bun run lint` still emits an empty-module-export warning and a conditional-expect warning.
- `bun run format:check` fails in this worktree because it includes two untracked generated JSON
  files under `tmp/`; all tracked formatted files pass a direct formatter check. This is a worktree
  hygiene problem rather than a source-formatting failure, but the packaged command is not green.
- `.env.example` sets `NUXT_AI_PRODUCT_COPY_MODEL=gpt-5.6-luna`, while `nuxt.config.ts` defaults to
  `gpt-5-mini`; the example should use a verified deployable provider model or clearly mark the
  value as a placeholder.

## Recommendation

Treat the branch as **well-structured but not ready to merge**. First repair the AI fixtures and
decide the provider-detail security contract, then fix the deterministic Nuxt failures and give the
2,000-row tests an intentional timeout or a more scalable rendering strategy. After that, restore
or replace the highest-value removed composable cases and make the formatter ignore generated
worktree artifacts.

## Scope limits

This assessment did not perform browser-based manual QA, mutation testing, dependency vulnerability
scanning, production deployment testing, load testing, or a review of the sibling backend repository.
It also did not measure coverage because the configured test runs failed before producing a usable
summary.
