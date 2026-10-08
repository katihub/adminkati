# Assessment: Vitest failure causes

Date: 2026-10-05. Kind: assessment.

## Question

What explains the reported 23 Vitest failures, and which failures are genuine regressions,
stale expectations, environment problems, or timeout sensitivity?

## Method

Ran the affected AI unit specs, targeted the affected Nuxt specs both with the inherited
environment and with the test image environment made explicit, and inspected the relevant
components, schemas, configuration, tests, and commits. The key reproduction commands were:

```bash
bunx vitest run --project unit \
  test/unit/ai-product-copy-api.test.ts \
  test/unit/ai-product-copy-client.test.ts \
  test/unit/ai-product-copy-schema.test.ts \
  test/unit/ai-product-copy-service.test.ts

bunx vitest run --project nuxt \
  test/nuxt/banner-artwork-preview.test.ts \
  test/nuxt/banner-panel-artwork.test.ts \
  test/nuxt/products-image-rendering.test.ts \
  test/nuxt/products-local-preview.test.ts

env -u BACKEND_URL -u NUXT_API_BASE_URL \
  -u NUXT_PUBLIC_CATALOGUE_IMAGE_ORIGIN -u NUXT_SUPABASE_URL \
  -u SUPABASE_URL -u VERCEL NUXT_IMAGE_PROVIDER=ipx \
  bunx vitest run --project nuxt \
  test/nuxt/banner-artwork-preview.test.ts \
  test/nuxt/banner-panel-artwork.test.ts \
  test/nuxt/products-image-rendering.test.ts \
  test/nuxt/products-local-preview.test.ts
```

No application or test fixes were made. Existing untracked user files were left untouched.

## Findings

### 1. AI unit failures: nine stale or contract-dependent expectations

The targeted run produced **9 failed / 137 passed** tests across the four AI specs.

| Tests | Evidence | Cause | Classification |
| --- | --- | --- | --- |
| `ai-product-copy-schema.test.ts:220,233` | The fixture's `suggestion()` object does not include the required choice fields, while `productCopySuggestionSchema` requires `brand`, `department`, `primaryCategory`, and `secondaryCategories` in addition to the text fields. | The fixture still models the pre-choice-field suggestion. | Stale test fixture |
| `ai-product-copy-service.test.ts:77` | The test expects four required structured-output keys. The implementation builds the full eight-field schema when no scope is supplied. | The closed-list fields added by `90a8d6c` are absent from the assertion. | Stale expectation |
| `ai-product-copy-client.test.ts:128,179` | `toProductCopyFailure()` returns `detail: "HTTP 400"` or `detail: "HTTP 500"`; the tests compare against objects without `detail`. | The client error shape was extended to preserve a safe status detail. | Stale expectation |
| `ai-product-copy-api.test.ts:495,517,575` and `ai-product-copy-service.test.ts:352` | The tests reject any provider wording, but the current service sanitizes and deliberately carries `providerDetail` to the operator. The API response includes it under `data.providerDetail`. | The tests and the documented provider-detail design disagree. | Contract/security decision required |

The provider-detail group must not be fixed by merely weakening the tests. `server/utils/ai/errors.ts`
documents that provider wording is masked, capped, and shown to the operator. The team must either
keep that contract and test the sanitization boundary, or remove provider detail from thrown/API errors
and retain only a server-side diagnostic.

### 2. Nuxt image failures: inherited environment selects the wrong configuration

The deterministic image failures are in:

- `banner-artwork-preview.test.ts`
- `banner-panel-artwork.test.ts`
- `products-image-rendering.test.ts` (two assertions)
- `products-local-preview.test.ts`

With the inherited environment, the process contained:

```text
NUXT_PUBLIC_CATALOGUE_IMAGE_ORIGIN=https://nowtechcenter.com
NUXT_SUPABASE_URL=https://supabase-boutique.75.119.132.59.sslip.io
SUPABASE_URL=https://supabase-boutique.75.119.132.59.sslip.io
VERCEL=1
```

`nuxt.config.ts` derives the IPX trusted banner domains from the Supabase variables, not from the
catalogue image origin. `VERCEL=1` also causes Nuxt Image to select the Vercel provider unless the
provider is made explicit. The observed failures were consequently either a missing
`nowtechcenter.com` domain or a raw URL where the tests expected `/_ipx/`.

The same 13 image assertions pass when the inherited variables are removed and
`NUXT_IMAGE_PROVIDER=ipx` is set. This makes the current failures test-environment contamination,
not evidence that the image components are all broken. The test setup should be made hermetic rather
than relying on each developer's shell environment.

### 3. Product detail/source URL failures: the tests assert a deliberately removed control

`test/nuxt/products-detail-form.test.ts:142,202` looks for
`[data-testid='products-detail-overview-source-url-input']`, but
`app/components/products/OverviewMedia.vue` does not render that input. The source URL prop and
emitter remain, but the input was explicitly removed by commit `fa4ffe8`.

This is a product-contract choice, not a mysterious rendering failure:

- If source URLs are no longer editable, remove or replace the old assertions and clean up the
  retained plumbing.
- If the field remains required, restore the control and its save-path coverage.

### 4. Delivery default-badge failures: closed-trigger behavior changed

`test/nuxt/products-delivery-picker.test.ts:54` and
`test/nuxt/products-detail-form.test.ts:966` expect the default badge inside the closed trigger.
`app/components/products/OverviewDelivery.vue` now renders the badge only inside the open option
list. Commit `0a766f9` removed the trigger badge.

The list behavior is still covered and the targeted picker suite passes apart from this assertion.
Either the test should follow the new trigger contract, or the badge should be restored if the
closed control must communicate that the product inherits the default.

### 5. Date-picker failure: the test fixture is tied to a different month than the runtime calendar

`test/nuxt/overview-date-field.test.ts:44` opens a field containing `2026-09-30` and searches for
`2026-09-15`. `app/components/ui/calendar/Calendar.vue` defaults its placeholder month to
`today(getLocalTimeZone())`; the investigation date is October 2026, so the September day is not
rendered. The trigger formatting itself passes.

This exposes a real determinism/UX question: opening a stored date should normally show that date's
month. The component can pass the selected date as the calendar placeholder, or the test can freeze
time and explicitly control the placeholder. A test-only current-month assumption is not stable.

### 6. Large-render failures are load-sensitive, not reliably functional failures

The 2,000-row stock render coverage passes in targeted runs. The stock-import render tests become
reliable with `--testTimeout=30000`, while the default five-second per-test limit is sensitive to the
full Nuxt suite's load. The same pattern was reported for operations-page tests.

`test/nuxt/operations-page.test.ts` passes in isolation (**3 passed**), so the two reported
operations-page timeouts were not reproducible as functional failures. The full-suite count changes
with worker/build load; a completed full run during the investigation recorded 8 failed files and
12 failed tests, while the originally reported total was 23 (9 unit plus 14 Nuxt). That difference is
consistent with timing-sensitive failures being included or avoided between runs.

The timeout handling should be intentional: give genuinely large render cases an explicit budget or
reduce their DOM work, and only increase operations-page timeouts after profiling rather than hiding
a regression with a blanket global timeout.

## Recommendation

1. Resolve the provider-detail exposure contract first; it is the only failure group with a direct
   security-design implication.
2. Update AI fixtures and structured-output/client assertions to the post-`90a8d6c` contract after
   that decision.
3. Make Nuxt image tests independent of inherited `VERCEL` and deployment environment variables,
   with IPX explicitly selected for this test project.
4. Decide whether source URL editing and the closed delivery default badge are still product
   requirements, then align either implementation or tests—do not silently do both.
5. Make the calendar open on a deterministic/appropriate month and give the large-render tests
   explicit, narrowly scoped timeout budgets.
6. Rerun the full unit and Nuxt projects, typecheck, lint, and build after the contract decisions.

## Scope limits

This investigation did not apply fixes, perform browser-based manual QA, call a live backend or
OpenAI, run mutation testing, measure flakiness across repeated clean machines, or perform a formal
security penetration test of provider-detail sanitization. The report assesses the current working
tree and test environment only.
