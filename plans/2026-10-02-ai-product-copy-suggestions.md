# AI product-copy suggestions

**Date:** 2026-10-02  
**Slug:** `ai-product-copy-suggestions`  
**Status:** Planned — implementation has not started

## Requirement

Add the admin panel's server-side AI foundation and its first use case: product-copy suggestions.
Direction users can request one coherent, French-or-English suggestion package containing a product
name, short description, long description, and up to twelve features. OpenAI's GPT-5 mini is the
default inference model, accessed only from the Nuxt server with the official OpenAI SDK.

The product editor will never change automatically. The operator reviews a generated package through
separate inline cards beneath the corresponding name, short-description, long-description, and
features fields, then applies, edits, or dismisses each field independently. A persistent, dismissible
bottom-right popup reports the generation's loading, completion, and error states; it is not a
transient toast.

## Scope and decisions

### In scope

- A server-only `/api/ai/products/suggestions` BFF endpoint with authenticated direction-role access.
- Official `openai` SDK integration using a configurable `gpt-5-mini` default and an atomic,
  schema-validated response.
- Text context from the current product-form draft; persisted product images and the persisted
  datasheet where the existing read path can safely provide them.
- A configurable, server-enforced allowance of **50 generations per operator per hour**.
- Metadata-only audit logging: actor ID, product ID when available, language, model, timestamps,
  latency, outcome, token/cost metrics, quota result, and correlation ID. It must not retain raw
  prompts, generated text, image/PDF data, source URLs, or provider error bodies.
- AI Elements Vue registry primitives for AI loading/progress UI, plus product-specific composition
  components that match the existing shadcn-vue/Tailwind visual system.
- English and French UI text, focused unit/component tests, and the normal quality gates.

### Explicitly out of scope

- Any NowTech-backend change, persistence of AI drafts/history, or new backend database table.
- Browser-to-OpenAI calls, browser-visible OpenAI keys, Vercel AI SDK, model streaming, chat, or a
  model selector.
- Crawling or fetching `url_source`, source-page extraction, web search, or supplier-page citations.
- Unsaved local image/PDF upload or temporary-asset storage. A new product may generate only from
  entered text.
- Bulk generation, automatic product saving/publishing, automatic claim verification, or using the
  generated content outside the product editor.

## Existing code to reuse

| Need | Reuse |
| --- | --- |
| Session refresh and authentication | `server/utils/api-session.ts` (`ensureFreshSession`) and sealed `event.context.session` |
| Product-editor authorization | `app/components/products/DetailForm.vue`'s current `direction`-role `canWrite` rule; repeat the authorization server-side |
| Product draft and save ownership | `DetailForm.vue` owns reactive draft values and is the only place that writes them; normal save remains `useCreateProduit` / `useUpdateProduit` |
| Product limits | `app/schemas/produit.ts`: name ≤300, short description ≤500, long description ≤20,000, features ≤12 |
| API error wording | `app/utils/api-error.ts`, existing `errors/*.json`, and `useNuxtApp().$csrfFetch` |
| Client API patterns | `app/composables/useApi.ts` and TanStack Query mutations in `app/composables/useProduitMutations.ts` |
| Browser-only shared state | Pinia setup stores, especially `app/stores/product-list.ts`; AI in-flight/UI state is browser state, not query data |
| Persistent admin UI | `app/components/admin/AdminShell.vue`, which owns global surfaces such as `<Toaster />` |
| Product-field locations | `OverviewPricing.vue` (name), `OverviewShortDescription.vue`, `OverviewLongDescription.vue`, and `OverviewDescriptions.vue` |
| Design primitives | Existing `Button`, Card-style Tailwind treatments, Phosphor icons, and `--primary`, `--muted`, `--success`, `--destructive` CSS tokens |

## Data contracts

### Browser request: new contract

`POST /api/ai/products/suggestions`

```ts
type ProductCopyLanguage = "fr" | "en"

interface ProductCopyDraft {
  name: string
  brand: string | null
  department: string | null
  primaryCategory: string | null
  secondaryCategories: string[]
  price: number | null
  existingShortDescription: string
  existingLongDescription: string
  existingFeatures: string[]
}

interface ProductCopySuggestionRequest {
  language: ProductCopyLanguage
  // Omitted for a new product. Never use this to trust client-provided assets.
  productId?: number
  draft: ProductCopyDraft
}
```

The request deliberately has no `url_source`, image URL, PDF path, HTML, or arbitrary attachment
field. The server validates a strict object, all existing product-field limits, and an additional
bounded total prompt-text budget before contacting OpenAI. It rejects an empty/insufficiently
identified draft rather than inventing a generic product. A product ID is an asset lookup key only;
the current browser draft remains the content source for unsaved edits.

For an existing product, the server re-reads the product through the existing authenticated admin
read endpoint using the fresh sealed session. It may take only that record's persisted images and
datasheet, never client-supplied asset URLs. For a new product, `productId` is absent and no image or
PDF is sent. `url_source` is excluded in both cases.

### Successful response: new contract

```ts
interface ProductCopySuggestion {
  name: string
  shortDescription: string
  longDescription: string
  features: string[]
}

interface ProductCopySuggestionResponse {
  suggestion: ProductCopySuggestion
  assets: {
    imageCount: number
    datasheetUsed: boolean
    warnings: Array<"image_unavailable" | "datasheet_unavailable">
  }
  requestId: string
}
```

The server validates the OpenAI structured output against the same output constraints before sending
it to the browser. It returns one complete package or an error—never partial JSON or streamed text.
Asset warnings are user-visible so an operator knows when the output relied on fewer sources than
requested. The `requestId` is a correlation handle only; it must not encode user or product data.

### Server response and error policy

| Condition | Response/UI behaviour |
| --- | --- |
| No fresh session | `401`; normal auth failure handling applies |
| Authenticated user without `direction` | `403`; no provider call or audit of product text |
| Invalid/oversized/insufficient input | `400`/`422`; explain which input condition to correct, without echoing submitted content |
| Another request for that operator is active | `409`; keep the existing popup as the source of truth |
| 50-per-hour allowance exhausted | `429` plus `Retry-After`; popup says when generation may be retried |
| OpenAI timeout/unavailable/refusal or invalid model output | mapped generic `502`/`503`/`422`; popup offers retry and exposes no provider body |
| One persisted asset cannot be safely read | continue with remaining grounded context, return the explicit warning, and show it in the popup/card |

The client shows no suggestion card after any failed request. Applying or dismissing a card is local
state only; normal product Save is the sole persistence boundary.

## Required states and UX rules

- **Eligible, idle:** A direction user sees one `Generate product copy` control in the product form's
  existing header action area, with an explicit French/English selector defaulting to French. The
  control is unavailable to read-only roles and when the draft lacks enough factual context.
- **Generating:** The fixed bottom-right popup remains visible above normal content, identifies the
  selected output language, uses AI Elements Vue loading UI, and says that suggestions are being
  generated. It must not pretend to expose token-by-token progress because this endpoint is atomic.
  A second trigger is disabled while this request is in flight.
- **Completed:** The popup stays until dismissed (or replaced by the next request), reports that the
  package is ready, and reports any asset omission warning. One review card appears directly below
  each target field.
- **Inline review:** Each card clearly says it is a draft requiring verification; shows only its
  relevant value; supplies Apply and Dismiss controls. Name, short description, and long description
  replace only their matching form value. Applying features explicitly replaces the current feature
  list as one coherent field. A card never calls a product mutation.
- **Manual edits/cancel/navigation:** Editing a form value never silently accepts a suggestion.
  Cancelling the form, switching to a different product, or entering a new-product session clears
  cards belonging to the old form target. The global popup can safely survive component unmount while
  a request resolves, but a result is displayed only when the matching editor target is active.
- **Error/quota:** The persistent popup contains the localized failure/retry state; a failed request
  leaves all editor values and any prior valid cards unchanged.
- **Accessibility/responsiveness:** The popup is keyboard reachable, uses an `aria-live` status for
  state changes, can be dismissed, has a mobile-safe width/offset, and must not obscure form actions
  or the existing Sonner notifications.

## Implementation plan

### 1. Establish the AI boundary, generated UI primitives, and typed contracts

**What changes**

1. Add the official `openai` dependency with Bun. Add only the AI Elements Vue registry primitives
   needed by this design—`loader` for the persistent progress popup and `shimmer` for its generation
   status. Do not install `ai`, `@ai-sdk/vue`, or an AI Gateway dependency; the application uses the
   official SDK and a non-streaming contract.
2. Import registry output as generated code under `app/components/ui/ai-elements/` (not directly under
   `app/components/`), preserving this repository's rule that non-`.vue` registry barrels belong only
   inside the generated UI area. Do not hand-edit the generated output. Verify its dependency changes
   are limited to what those two registry components require.
3. Add server-only runtime configuration in `nuxt.config.ts` for `openaiApiKey`,
   `aiProductCopyModel` (default `gpt-5-mini`), `aiProductCopyQuotaPerHour` (default `50`), request
   timeout, prompt-text ceiling, and output-token ceiling. Use documented `NUXT_...` deployment
   overrides; none belong under `runtimeConfig.public`.
4. Extend `server/plugins/assert-config.ts` (or extract a focused server-only config validator) so a
   production process fails clearly for a missing OpenAI key, empty model, or non-positive AI limits.
   Development/test must remain able to boot without making provider calls.
5. Create explicit shared types in `app/types/ai/product-copy.ts` and Zod schemas in
   `app/schemas/ai-product-copy.ts` for the request, response, model output, target field names, asset
   warnings, and bounds. Export source-text normalization and output parsing as narrowly focused
   helpers so they can be unit tested without Nuxt or OpenAI.

**Where**

- `package.json`, `bun.lock`
- `components.json` only if needed to register the external AI Elements registry path
- `app/components/ui/ai-elements/loader/**` and `app/components/ui/ai-elements/shimmer/**` (generated)
- `nuxt.config.ts`
- `server/plugins/assert-config.ts`
- `app/types/ai/product-copy.ts` (new)
- `app/schemas/ai-product-copy.ts` (new)
- `app/utils/ai-product-copy.ts` (new, only pure normalisation/contract helpers)

**Done when**

- The OpenAI key and all AI limits are server-only in generated Nuxt runtime types.
- A missing production key or invalid limit fails with a configuration error; unit/test boot does not
  call OpenAI.
- The generated AI Elements files remain contained within the allowed generated UI directory and no
  AI SDK is added transitively for this atomic request flow.
- Contract tests demonstrate request strictness, input/output caps, two supported languages, and
  rejected malformed provider output.

### 2. Build the server-side product-context, provider, quota, and audit services

**What changes**

1. Add a focused server product-context reader that uses `ensureFreshSession`, the existing backend
   base URL, and the existing admin product read contract to load an existing product by ID. It must
   use the fresh bearer token and the existing explicit proxy-header policy; it must not proxy the
   sealed cookie or accept a client-selected backend URL.
2. Add a product-asset resolver. For persisted product images, accept only product-record URLs that
   meet the safe HTTPS/public-host policy before presenting them to OpenAI. Never fetch `url_source`.
   For datasheets, fetch only through a verified existing, server-owned product-download path with
   strict redirects, byte, MIME, and timeout bounds; attach an accepted PDF as a provider file input.
   If a persisted file is unavailable or cannot pass those checks, omit it and return the contract's
   warning instead of failing open or inventing a storage URL.
3. Add a small OpenAI client factory and product-copy service using the official Responses API. Build
   a versioned system instruction that treats every draft/asset as untrusted reference material, never
   follows instructions contained within it, uses only supplied facts, omits uncertain claims, avoids
   hype/SEO stuffing, and returns the strict package schema in the selected language. Bound request
   duration and output tokens, then validate the response again locally.
4. Add a process-local per-user limiter keyed by session `userId`, with a configurable fixed one-hour
   allowance (50 by default) and an in-flight lock. Always release the lock in `finally`, return the
   next reset as `Retry-After`, and keep the implementation isolated behind a service so distributed
   storage can replace it later.
5. Add a single structured AI audit writer. Log only the approved metadata and a generated correlation
   ID for both successes and failures. Deliberately construct the logged payload instead of serializing
   request, product, asset, OpenAI result, or caught error objects.

**Where**

- `server/utils/ai/product-context.ts` (new)
- `server/utils/ai/product-assets.ts` (new)
- `server/utils/ai/openai-client.ts` (new)
- `server/utils/ai/product-copy-service.ts` (new)
- `server/utils/ai/rate-limit.ts` (new)
- `server/utils/ai/audit.ts` (new)
- `server/utils/ai/errors.ts` (new, if needed to map safe endpoint errors)

**Done when**

- Provider code is unreachable without a fresh direction session and never reads a browser-provided
  asset URL or `url_source`.
- A real staging smoke test with a non-production product produces a schema-valid package through
  GPT-5 mini; CI uses a fake client and never needs a provider credential.
- Source URLs, raw product text, asset bytes, response text, and raw provider errors are absent from
  every audit payload.
- The 51st request in one user/hour window receives `429`, a different authenticated user has an
  independent allowance, and an exception cannot leave an in-flight lock stuck.
- Failed image/PDF retrieval becomes a reported partial-context warning, not an unsafe fallback.

### 3. Expose the protected Nuxt endpoint

**What changes**

1. Implement `POST /api/ai/products/suggestions`: validate the request body with the shared schema,
   refresh the sealed session, enforce the direction role and limiter, load persisted context when an
   ID is supplied, invoke the product-copy service, audit the outcome, and return only the validated
   response contract.
2. Add explicit `/api/ai/**` route rules that preserve CSRF protection and add a coarse transport
   limit without replacing the per-user generation quota. Keep the existing `/api/**` JSON/XSS
   exception rationale intact; the new endpoint's Zod schema remains its input boundary.
3. Ensure no AI handler reuses `/api/v1/[...path].ts`: that catch-all is a backend proxy with a
   different authentication/header contract and must never receive an OpenAI request.

**Where**

- `server/api/ai/products/suggestions.post.ts` (new)
- `nuxt.config.ts`
- `server/utils/ai/**` from phase 2

**Done when**

- The endpoint has the documented success/error shapes, requires a CSRF-protected POST, and never
  exposes the OpenAI key or an unredacted provider error.
- A forged non-direction session, an unknown input field, an oversized prompt, a missing session, an
  active duplicate request, and quota exhaustion are rejected before provider invocation.
- Existing `/api/v1/**` proxy tests continue to pass unchanged.

### 4. Add client orchestration and the persistent generation popup

**What changes**

1. Add `app/stores/ai-generation.ts` as a browser-only Pinia store for one active request: immutable
   target identity (persisted product ID or a per-editor new-product token), request status, selected
   language, correlation ID, result package, asset warnings, and safe localized error/retry metadata.
   It must not duplicate product query data or persist raw request context.
2. Add `app/composables/useProductCopySuggestions.ts`, which calls the new endpoint with
   `$csrfFetch`, transitions the store atomically, maps endpoint errors through the existing error
   approach, and only exposes actions needed by the product form: generate, retry, consume a field,
   dismiss a field, and clear a target.
3. Add `app/components/admin/AiGenerationPopup.vue` and mount it once in
   `app/components/admin/AdminShell.vue` beside—not in place of—the existing Sonner toaster. Use the
   generated AI Elements Loader/Shimmer primitives, fixed bottom-right positioning, safe z-index and
   mobile dimensions, an `aria-live` status, and an explicit dismiss button. Keep completion/error
   visible until dismissal or the next run.

**Where**

- `app/stores/ai-generation.ts` (new)
- `app/composables/useProductCopySuggestions.ts` (new)
- `app/components/admin/AiGenerationPopup.vue` (new)
- `app/components/admin/AdminShell.vue`

**Done when**

- Starting a request creates one shared loading state visible from the admin shell; route/component
  unmount cannot produce an unhandled rejection or a stale write into another product's form.
- The popup presents loading, ready-with-warning, quota, and retryable-error states without exposing
  generated content, product context, or a raw backend/provider error.
- It is keyboard operable and does not overlap essential product actions or permanently conceal the
  existing notification surface on desktop or narrow screens.

### 5. Wire the product editor's trigger and inline review cards

**What changes**

1. Add `ProductsProductCopySuggestionTrigger.vue`, a direction-only header action with explicit
   French/English selection (French default). `DetailForm.vue` builds the strict draft from its
   existing reactive fields, resolves the selected taxonomy labels, provides a product ID only in edit
   mode, and intentionally excludes `url_source`, local `blob:` files, and image URLs.
2. Add `ProductsProductCopySuggestionCard.vue`, an accessible product-specific card with the factual
   draft/review notice, field value, Apply, and Dismiss actions. It owns no product state and emits
   intents only; `DetailForm.vue` remains the sole owner of `values`.
3. Thread narrow named slots through the existing presentation components so cards appear immediately
   below their fields: name beneath the title input in `OverviewPricing.vue`; short and long cards
   beneath their textareas; and the features card beneath `OverviewDescriptions` in the existing
   `OverviewMedia` `after-brand` slot. Use the current product card spacing, not a nested chat UI.
4. On Apply, replace only `values.nom`, `values.description`, `values.fiche_technique`, or the whole
   `values.caracteristiques` array. Preserve the current slug behavior: applying a name continues to
   update an untouched new-product slug but never overwrites an operator-edited slug. Clear consumed
   or dismissed cards, clear cards on form cancel/product change/new-form reset, and never call Save.
5. Keep all controls hidden/disabled for non-direction users, matching the existing form rather than
   relying solely on a failed server request.

**Where**

- `app/components/products/ProductCopySuggestionTrigger.vue` (new)
- `app/components/products/ProductCopySuggestionCard.vue` (new)
- `app/components/products/DetailForm.vue`
- `app/components/products/OverviewDetails.vue`
- `app/components/products/OverviewPricing.vue`
- `app/components/products/OverviewShortDescription.vue`
- `app/components/products/OverviewLongDescription.vue`
- `app/components/products/OverviewMedia.vue` only if a slot must be forwarded

**Done when**

- One eligible operator action requests one package; name, short description, long description, and
  features cards appear in their respective positions after success.
- Applying one card updates only that field, applying features replaces the complete feature list,
  dismissing does not mutate a field, and ordinary Save persists only the values the operator has
  actually chosen.
- Add mode sends text-only context; edit mode sends the product ID plus current draft text; neither
  request contains `url_source`, local file/blob data, or browser-provided persisted asset URLs.
- The no-direction component state exposes neither a working generate action nor mutable cards.

### 6. Localize, test through public seams, and run gates

**What changes**

1. Add paired English/French product-domain translations for trigger labels, language selector,
   factual-review notice, apply/dismiss, popup statuses, asset warnings, insufficient context, quota
   wait, and safe provider failures. Do not introduce raw English fallback strings in templates.
2. Have the Tester role establish the following predeclared public seams before implementation tests:
   the POST endpoint response/error contract; pure request/output/quota/audit/asset-policy helpers;
   the product editor's visible generate/review/apply behaviour; and the admin popup's visible status
   behaviour. Work one red → green vertical slice at a time.
3. Keep new specs flat in the existing test directories and use test doubles only at the OpenAI client,
   backend product-read, clock, and audit-writer boundaries. Do not call a real model or assert private
   prompt implementation details.

**Where**

- `i18n/locales/products/en.json`
- `i18n/locales/products/fr.json`
- `test/unit/ai-product-copy-schema.test.ts` (new)
- `test/unit/ai-product-copy-service.test.ts` (new)
- `test/unit/ai-rate-limit.test.ts` (new)
- `test/unit/ai-audit.test.ts` (new)
- `test/unit/ai-product-assets.test.ts` (new)
- `test/unit/ai-product-copy-api.test.ts` (new)
- `test/nuxt/products-ai-suggestions.test.ts` (new)
- `test/nuxt/ai-generation-popup.test.ts` (new)

**Done when**

- Unit tests prove strict request/output bounds, source-URL exclusion, prompt-injection framing,
  safe asset policy, audit redaction, quota reset/lock release, and endpoint authorization/error
  mapping.
- Component tests prove the user-visible product flow: direction can generate; read-only cannot;
  cards appear under the four fields; individual Apply/Dismiss semantics work; feature application
  replaces the array; failure/quota preserves form values; popup state remains visible and accessible.
- `bun run i18n:check`, `bun run lint`, `bun run format:check`, `bun run fallow`, `bun run typecheck`,
  `bunx vitest run`, and `bun run build` pass. The Implementer records only actually observed command
  output in the walkthrough.

## Risks and mitigations

| Risk | Mitigation / earliest signal |
| --- | --- |
| `ProductDetail.fiche_pdf` is a storage path, not a URL, and this worktree has no verified read endpoint for its bytes | Treat datasheet retrieval as a phase-2 discovery gate. Use an already-existing authenticated/public read path only; otherwise emit `datasheet_unavailable` and do not invent a URL or add backend work. Verify with a staging product before UI completion. |
| Persisted image URLs can be stale or protected by Cloudflare (a known catalogue condition) | Apply the safe asset policy, bound access, continue text-only/partial-context generation with a visible warning, and never retry unboundedly. |
| The process-local quota cannot enforce a global 50/hour budget across future replicas | Isolate it behind `rate-limit.ts`, document the single-process limitation in code, and replace its storage adapter with shared infrastructure before horizontal scaling. |
| Long descriptions, PDFs, and vision input can cause latency/cost spikes | Enforce text/file/time/output limits, use GPT-5 mini by default, log metadata-only usage, and make the configuration defaults easy to change. |
| Provider output can be malformed, unsafe, or unsupported by the selected model | Require structured output, validate locally, disclose the draft/review requirement, and use a credentialed staging smoke test before release. |
| AI Elements Vue's docs assume AI SDK examples while this feature uses the official SDK | Limit adoption to its registry presentation primitives. Keep all request state in the project Pinia/composable layer; do not add AI SDK solely for component examples. |
| A fixed popup can collide with Sonner/mobile controls | Mount exactly once in `AdminShell`, define z-index/offset ownership, test narrow viewports, and keep it dismissible. |

## Open implementation discovery

1. **Datasheet read URL:** confirm the existing route that exposes a persisted product datasheet's
   bytes to the admin server. **Recommendation:** use it only after its authentication, content type,
   redirect behaviour, and size limit are verified. If none exists, ship the explicitly planned
   `datasheet_unavailable` partial-context path rather than expanding into backend work.
2. **AI Elements registry target:** validate the selected CLI invocation writes generated files under
   `app/components/ui/ai-elements/` without leaving an `index.ts` in `app/components/`. **Recommendation:**
   resolve this before dependency installation and retain the generated output unmodified.

## Implementation handoff

The Tester should begin at the public seams in phase 6, record the expected red failures, and hand
them to the Implementer. The Implementer must preserve this slug in
`walkthroughs/YYYY-MM-DD-ai-product-copy-suggestions.md`; the Reviewer must use it in the matching
review filename. No implementation may begin by calling OpenAI from a browser or by adding a backend
endpoint.
