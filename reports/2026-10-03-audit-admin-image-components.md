# Admin panel image component audit

**Date:** 2026-10-03  
**Question:** Do admin-panel images render through Nuxt Image, and can any remaining native image tags be migrated safely?

## Method

Searched Vue SFCs under `app/` for `<img>`, `<picture>`, `<NuxtPicture>`, and `<NuxtImg>`; searched app source for CSS image/background references; reviewed the three native-image call sites and the existing product-image Nuxt tests. This was a source audit, not a browser-wide audit of generated runtime DOM.

## Findings

- The audit found native image tags in `app/components/products/BrandLogo.vue`, `app/components/products/HistoryEntry.vue`, and the local-preview branch of `app/components/products/Picture.vue`.
- All three sites now use `<NuxtImg>`. Product images, brand logos, and history thumbnails specify `provider="none"` so the source URL is preserved and is not sent through IPX. This also lets the local `blob:` and `data:` previews remain browser-local while using Nuxt Image.
- The rest of the image components already used `<NuxtImg>`, including banner artwork, the login showcase, and the brand wordmark. Banner artwork remains on the default provider for its existing IPX resizing.
- A follow-up search found no literal `<img>`, `<picture>`, or `<NuxtPicture>` tags in `app/**/*.vue`.
- `app/assets/css/main.css` uses gradients for image-like backgrounds; no CSS background image asset URL was found in the app source search.

## Validation

- `products-image-rendering.test.ts`, `products-local-preview.test.ts`, and `products-history-entry.test.ts`: **27 passed**. The tests cover unchanged source URLs, no IPX rewriting for the opt-out images, Nuxt Image output, and continued IPX processing for banner artwork.
- `bun run lint`: passed with two existing warnings outside the changed files.
- `bun run fallow`: passed; reported inherited CSS token-drift advisories in `HistoryEntry.vue`.
- `oxfmt --check` on the six changed Vue/test files: passed.
- `bun run typecheck`: blocked by an existing TypeScript error in untouched `test/unit/ai-product-copy-service.test.ts:26` (`brand` may be `undefined`).

## Scope limits

This audit did not inspect every file under `public/`, third-party or backend-generated runtime markup, or image elements created dynamically outside Vue templates. Nuxt Image intentionally renders an `<img>` element at runtime; the audit verifies that app-authored image markup goes through `<NuxtImg>`.
