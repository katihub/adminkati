# Live Logo.dev brand-name preview

## Requirement

Replace the product-form logo candidate review and saved override UI with the Logo.dev Community name-image endpoint. Render its best-match image directly from the currently selected brand name in the admin panel. Do not add or change backend code, persist an override, or self-host Logo.dev image bytes; keep the existing backend implementation intact for rollback.

## Reuse

- Reuse `ProductsOverviewMedia.vue` and its existing `selectedBrand` taxonomy lookup.
- Replace the current `ProductsBrandLogoPicker` behavior with a small live preview component.
- Use `useRuntimeConfig()` for a public publishable key and the existing `security.headers.contentSecurityPolicy` `img-src` directive.
- Keep taxonomy's `logo_url` response type unchanged for backend compatibility, although this UI no longer uses it.

## Data contract

- Public runtime setting: `NUXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY`; it is intentionally client-visible and must be a Logo.dev `pk_` key, never the existing backend-only `sk_` key.
- Image URL: `https://img.logo.dev/name/{encodeURIComponent(brandName)}?token={publishableKey}&size=128&format=webp&fallback=404`.
- No API request, write endpoint, stored row, storage upload, or local copy is part of this change.

## Implementation phases

1. **URL contract** — add `app/utils/logo-dev.ts` and `test/unit/logo-dev.test.ts`. Build an encoded name endpoint URL with image parameters; return no URL for a blank name or key. Done when punctuation and missing configuration cases pass.
2. **Admin preview** — replace the candidate modal with `app/components/products/BrandLogoPreview.vue`, pass only the selected brand name from `OverviewMedia.vue`, add public runtime config and `img.logo.dev` to CSP, and keep the localized attribution link beside the preview. Remove now-unused frontend candidate-list/mutation/type code and candidate-flow translations. Done when the brand preview follows brand changes, image failure falls back to initials, and no find/review/save controls remain.
3. **Verify and document** — update `test/nuxt/products-brand-logo.test.ts`; run focused unit/component tests, typecheck, i18n, lint, formatter, and fallow as applicable; write `walkthroughs/2026-10-01-logo-dev-name-preview.md`.

## UI states

- No selected brand: `OverviewMedia` renders no logo preview.
- Empty brand or missing publishable key: show the brand initials; do not make a request.
- Image loading: keep the fixed-size preview box to avoid layout shift.
- Image error / Logo.dev `fallback=404`: show brand initials; no retry/search action.
- Valid match: display the remote image and visible “Logo.dev” attribution link.

## Tests and confirmed seams

The user confirmed tests at the URL-builder and preview-component public behavior seams: encoded image URL, direct preview, removal of old review/save controls, and graceful image-error fallback.

- Unit tests cover brand-name encoding (including punctuation), the fixed endpoint parameters, and empty-name/key behavior.
- Component tests cover selected brand URL/alt, reactive brand changes, initial fallback after image failure, and absence of discovery/review/save actions.
- Do not test Logo.dev itself in automated tests. The user has manually verified the expected best match in the Logo.dev playground.

## Risks and scope limits

- Logo.dev may change its best match over time. There is deliberately no saved override; revisit reviewable candidates only if real matches become inaccurate.
- Community requests have a monthly hard cap. The Logo.dev image endpoint consumes logo-display requests; Brand API credits are separate and not used here.
- Community commercial usage requires visible attribution. Per the user's choice, the attribution is inside the authenticated product picker only; this may not satisfy Logo.dev's public-accessibility verification requirement. Confirm provider acceptance before production use.
- Logo.dev images remain external and depend on the user's publishable key, CSP allowance, browser connectivity, and provider availability. They are not storefront assets.
- This change is frontend-only. Leave the prior backend candidate discovery, storage, SQL, and secret configuration unchanged for rollback.

## Open questions / assumptions

- The publishable key will be configured in the admin deployment as `NUXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY`; no key value is added to source control.
- “Direct preview” means a live Logo.dev image derived from the brand name, with no per-brand persisted selection or override (confirmed by the user).
- Attribution stays next to the preview in the authenticated admin, per the user's choice; this is a known production verification risk noted above.
