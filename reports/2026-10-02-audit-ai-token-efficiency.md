# AI product-copy token-efficiency audit

**Date:** 2026-10-02  
**Question:** How can the admin panel's OpenAI product-copy integration use fewer tokens without reducing the quality or factual grounding of its suggestions?

## Summary

The integration has a sound safety and quality foundation: the browser sends a tightly bounded draft, the server owns assets and credentials, the model is given strict structured output, and the result is locally validated before it reaches the editor. The largest opportunities are therefore **avoiding unnecessary generations** and **asking for only the output an operator wants**, not aggressively shortening the system instructions.

Every successful click currently asks for a complete package—name, short description, long description, and features—even though the UI lets the operator apply or dismiss each field independently. It can also send up to four `detail: "auto"` images. Both choices can be appropriate for a first-generation workflow, but they make a request to improve one field pay for all four outputs and all selected visual inputs.

Do not reduce the global output ceiling, lower image detail, or change reasoning effort blindly. The app has no real production token distribution to prove a safe threshold: its audit records aggregate input/output/total tokens, but not cached-input or reasoning-token detail, requested output scope, draft size, or image detail. Establish that baseline first, then ship the quality-preserving changes below.

## Method and scope

Reviewed the current front-end request flow, server handler, prompt builder, asset resolver, Responses API adapter, runtime configuration, audit record, unit/component contracts, and the feature's plan/walkthrough. This was a static audit of the working-tree implementation; no product data, API keys, live OpenAI calls, browser interactions, or tests were run, and no production source code was changed.

The feature walkthrough records that the configured default, `gpt-5-mini`, was unavailable to the tested OpenAI project and that its real end-to-end staging smoke test remains incomplete. Consequently, this report does not claim observed savings or an exact token count for any recommendation.

## Findings

### 1. Every generation pays for all four outputs, even when only one field needs work

- `ProductCopySuggestion` is always a four-field package (`app/types/ai/product-copy.ts:51-55`), and the prompt schema marks all four fields required (`server/utils/ai/product-copy-prompt.ts:10-20`).
- The instructions explicitly request a name, short description, long description, and features on every call (`server/utils/ai/product-copy-prompt.ts:32-35`).
- The editor renders separate cards and lets the operator apply or dismiss each independently (`app/components/products/ProductCopySuggestionCard.vue:13-58`; `app/components/products/DetailForm.vue:583-600`). The component test confirms all four cards are returned by one successful generation (`test/nuxt/products-ai-suggestions.test.ts:386-408`).
- The accepted long-description limit is 20,000 characters and each of up to twelve features may be 500 characters (`app/schemas/ai-product-copy.ts:5-16`). The runtime output allowance is 12,000 tokens, explicitly including hidden reasoning (`nuxt.config.ts:109-114`).

This is the most material avoidable output spend. A user who needs a revised short description still receives—and is billed for—a replacement name, long description, and feature list. The configured output price is eight times the configured input price ($2.00 versus $0.25 per million tokens), so unnecessary output is the first place to focus (`nuxt.config.ts:111-114`). Those prices must be updated for the model actually deployed before treating the resulting dollar estimate as authoritative.

### 2. Image input is potentially the dominant variable, but it is not measured well enough

- Existing products resolve up to four ranked images (`server/utils/ai/product-assets.ts:3,54-63`).
- Each becomes an `input_image` with `detail: "auto"` (`server/utils/ai/product-copy-prompt.ts:58-67`). Image tokens can vary greatly with image content and provider-selected detail, unlike the bounded text draft.
- If the provider rejects an image URL, the service makes a second full request without *any* images (`server/utils/ai/product-copy-service.ts:122-142`). That preserves availability but can repeat the complete textual request and discard usable images along with the bad one.
- The audit retains only image count, not image detail, image-related token usage, or whether the initial image request failed before text-only fallback (`server/utils/ai/audit.ts:3-13,69-77`).

Changing all images to `low`, or lowering the four-image cap, might save substantial tokens but is not automatically quality-preserving. Secondary images may contain the only visible evidence for a feature, variant, or label. It should be an evaluated image policy, not a global cost switch.

### 3. Exact repeated requests are not reused

- `generateIn()` builds a request and posts it for every permitted click (`app/composables/useProductCopySuggestions.ts:44-59`).
- The Pinia store prevents only an in-flight duplicate. Once a run is `ready` or `error`, `begin()` accepts another run and clears the pending result (`app/stores/ai-generation.ts:69-90`).
- History retains previous output for ten in-memory entries, but it stores no canonical input fingerprint and does not make an identical request resolve to an existing result (`app/stores/ai-generation.ts:17-29,101-123`). The server limiter similarly blocks concurrent work and caps attempts, but has no short-lived result reuse (`server/utils/ai/rate-limit.ts:43-61`).

An operator can therefore spend a second model call by pressing Generate again on unchanged form data, even when a reviewable answer is already present in the current session. Preventing that no-op preserves the exact prior result and cannot reduce its quality; the UI can still offer an explicit **Generate a fresh alternative** action when variety is the intent.

### 4. The prompt contains low-risk but low-impact text waste

- The browser-normalized draft is deliberately whitelisted and has useful factual fields (`app/utils/ai-product-copy.ts:125-140`).
- The provider prompt serializes every field with two-space JSON indentation, including `null`, empty strings, and empty arrays (`server/utils/ai/product-copy-prompt.ts:39-55`).
- It sends `price` while the instructions prohibit mentioning price in the answer (`server/utils/ai/product-copy-prompt.ts:29-31,43-52`).
- The 30,000-character source-text limit is a character count, not a tokenizer count (`app/utils/ai-product-copy.ts:29-42`; `nuxt.config.ts:109-110`). It is an effective abuse guard but not a dependable per-model token budget.

Minifying the provider-only JSON and omitting absent values are safe small wins. Removing price is likely safe because the instruction prohibits its use in output, but should first be checked against a representative quality set: the current team may value price as an implicit market-position signal even though the prompt says not to mention it. Renaming fields to terse aliases or repeatedly rewriting the system prompt is not a priority; the likely savings are small and prompt clarity is more valuable.

### 5. The current telemetry cannot tell which optimization is safe

- `ModelResponse` keeps only `input_tokens`, `output_tokens`, and `total_tokens` (`server/utils/ai/product-copy-service.ts:6-13,113-120`).
- The audit persists those same aggregate counts and a price estimate (`server/utils/ai/audit.ts:17-30,55-78`). It intentionally excludes prompt and model output, which is the right privacy boundary.
- It does not preserve safe derived metadata such as prompt version, draft character count, requested fields, cached input tokens, reasoning tokens, image-detail profile, image fallback, or field application/dismissal outcome.
- The walkthrough reports no validated default-model staging run and says the tested project exposed different GPT-5.6 model IDs (`walkthroughs/2026-10-02-ai-product-copy-suggestions.md:479-487`).

Without these facts, lowering `max_output_tokens`, changing `reasoning.effort` from `low` to `minimal`, or turning on prompt caching is guesswork. A cap that is too low produces incomplete structured responses, which the service rejects (`server/utils/ai/product-copy-service.ts:105-110`) and can cause a costly retry plus a worse operator experience.

## Recommendations

### Priority 0 — make quality-preserving measurement possible

Extend the metadata-only audit contract before changing token policy. Continue to exclude raw draft text, generated text, URLs, provider errors, and credentials. Add only derived, non-content fields:

- the model and prompt version;
- input, cached-input, output, reasoning, and total token counts when the provider supplies them;
- normalized draft character count and count of non-empty source fields;
- requested output fields and a stable image profile (for example, `none`, `primary-auto`, `four-auto`), image count, and image-fallback flag;
- completion/incomplete reason and request latency; and
- an anonymized client outcome event: which cards were applied, dismissed, or left unreviewed. Do not attach the text.

Also verify the configured model ID and its current input/output pricing in the deployment environment. The existing `estimatedCostUsd` calculation is mechanically correct for its two configured rates (`server/api/ai/products/suggestions.post.ts:66-71`), but it cannot be trusted if those rates belong to an unavailable model.

Use the first representative sample to report p50/p95 token use by language, requested field set, prompt-size bucket, image profile, and outcome. This both identifies the real cost driver and creates the regression baseline for the next changes.

### Priority 1 — let the operator request only the fields that need generation

Add an explicit field scope to the request, such as `fields: ProductCopyField[]`. The default should be a visible, operator-chosen **All fields** option; do not silently omit fields just because they are non-empty. Offer common choices such as **Description only**, **Features only**, and **Selected fields**.

Implementation constraints that preserve quality:

1. Keep one model request for all selected fields. Splitting four selected fields into four calls would repeat the same instructions, factual context, and images and cost more.
2. Keep the full relevant factual source in the input for grounding, including existing text when it supports the selected field. Reduce the **output** contract first; do not strip useful context merely to shrink input.
3. Generate a strict JSON schema per field set, with exactly those selected fields required and no extras. Validate against the matching local Zod schema before returning it.
4. Preserve the existing card/apply behavior for the returned subset. An omitted field must have no card and must never overwrite form state.
5. Add component and API tests for every supported scope, especially a description-only request that cannot return or apply another field.

This is the clearest high-saving change because it removes output the operator explicitly did not request while preserving the quality of the field they did request.

### Priority 1 — reuse an identical result before calling the provider again

Within the current browser session, calculate a canonical fingerprint from the normalized draft, language, product target, selected field set, and a product asset revision. If an unmodified request already has a ready result, restore/review it instead of posting another request. Keep **Generate a fresh alternative** as an explicit bypass.

The asset revision matters: a product's images may change without the text draft changing. The server can safely derive this from the resolved ranked image URLs or a backend-provided product update/version value; never rely on a browser-supplied asset URL. Limit any reuse to the active session or a short server-side TTL unless the team deliberately designs encrypted, access-controlled persistence for generated text.

This eliminates accidental duplicate spend without changing what the operator sees. It also fits the existing in-memory history and review affordance better than introducing a new persistent draft store.

### Priority 2 — define concise output targets, then tune the output allowance from evidence

The prompt currently gives maximum storage limits, not desired editorial lengths. Replace those broad maxima with product-copy targets approved by content owners—for example, a concise name, one short description, a bounded number of factual paragraphs, and a bounded number of distinct features—while retaining the local storage ceilings as safety validation. A concise factual target usually improves scanability and reduces output tokens; it is not the same as indiscriminately truncating copy.

After collecting a baseline, set per-scope output allowances with headroom above the observed p95 **including reasoning tokens**, and retain a higher allowance for intentionally long-description scopes. Track `incomplete` responses and quality outcomes. Do not merely lower the global 12,000-token cap: valid inputs can currently contain a 20,000-character existing long description, and an overly small cap will turn valid work into failed requests.

Run a blinded evaluation before changing `reasoning: { effort: "low" }` to `minimal`. Product-copy generation may not need more reasoning than minimal, but that is a hypothesis. Compare factual entailment, unsupported-claim rate, language correctness, structured-output validity, and operator apply rate on representative French and English products. Promote the cheaper setting only if it meets a pre-agreed non-inferiority threshold.

### Priority 2 — use an evaluated image profile, not a global image cut

Instrument first, then compare image profiles on the same representative products:

1. current: up to four images at `auto`;
2. primary ranked image at `auto`, with additional images only when the operator requests them; and
3. primary image at `auto` plus secondary images at `low`.

Judge factual coverage and unsupported visual claims, not just token count. If a leaner profile is non-inferior, make it the default and leave a visible **Use all product images** option for products whose variants, packaging, or labels need it. Do not globally force `low`: it may prevent the model reading small technical labels, which would reduce the grounded quality this feature is meant to protect.

Investigate image-URL failures separately. The current all-or-nothing text-only retry is a reasonable availability fallback, but repeated image failures can create waste. A server-owned, SSRF-safe asset validation/normalization path could reduce those failures, but it is a security and infrastructure project—not a quick token optimization—and must not fetch arbitrary browser-controlled URLs.

### Priority 3 — apply prompt compaction after the larger wins

Change only the provider-facing representation, leaving the public browser request schema and its strict validation unchanged:

- serialize compact JSON rather than two-space pretty JSON;
- omit `null`, empty-string, and empty-array values whose absence is unambiguous to the model; and
- test removing price from provider reference data if the content evaluation confirms it contributes no value.

Keep the injection framing, factual-grounding rule, language instruction, no-price rule, and strict JSON output. Those guardrails are much more valuable than the few tokens saved by making the static instruction prose shorter.

Prompt caching is worth checking only after the enhanced usage record exposes cached-input metrics for the deployed model. The prompt already has a stable instruction/schema prefix, but this audit did not verify that the provider/model considers it cache-eligible or that an explicit cache key is needed. Do not pad the prompt just to cross a caching threshold; that can spend more than it saves.

## Recommended rollout order

1. Correct model/pricing configuration and add privacy-safe token, image-profile, scope, and operator-outcome telemetry.
2. Establish a representative baseline and define non-inferiority quality criteria with content owners.
3. Ship session-scoped exact-request reuse plus an explicit fresh-alternative action.
4. Ship operator-selected field scope with one batched request and a strict subset schema.
5. Evaluate concise editorial targets, output allowances, `minimal` reasoning, and leaner image profiles against the baseline; adopt only non-inferior variants.
6. Apply compact provider-only JSON and, if validated, omit price/empty values. Inspect cached-token metrics before pursuing provider prompt caching.

## Approaches not recommended

- Do not split an all-field request into one model call per field; shared context and image tokens would be repeated.
- Do not globally switch every image to `low` or remove all but one image without a quality evaluation.
- Do not lower `max_output_tokens` solely because 12,000 looks large; unused allowance is not itself billed, while a too-low cap creates incomplete responses.
- Do not change the default model or reasoning level based on price alone; the walkthrough already shows a deployment/model-availability mismatch.
- Do not weaken the untrusted-reference-data framing, strict schema, local output validation, or the server-owned asset boundary for token savings.

## Scope limits / follow-up needed

- No real audit records, model response usage details, provider invoice, or production product corpus was available. All prioritization is derived from code paths and configured limits, not measured traffic.
- This audit did not verify current OpenAI model capabilities, prompt-caching rules, image-token accounting, or pricing. Verify them for the actual model selected in the deployment before implementation.
- The suggested field-scope and reuse changes are feature work and require a plan, TDD coverage, accessibility review, and a matching walkthrough; this report is not an implementation plan.
- The audit did not evaluate copy quality in French or English, provider refusal behavior on real products, or whether existing images are sufficiently reliable/available to support visual grounding.
