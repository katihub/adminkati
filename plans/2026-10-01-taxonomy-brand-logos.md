# Reuse BrandLogo in taxonomy brand table and detail panel

## Requirement

Display brand images/logos in the taxonomy brand table (`BrandTable.vue`) and brand detail panel (`BrandDetailPanel.vue` / `BrandPanelView.vue`) by reusing `app/components/products/BrandLogo.vue`. When Logo.dev publishable key is available, render the brand logo using the existing `logoDevNameUrl()` utility; when the key is missing or the image fails to load, gracefully fall back to brand initials.

## Reuse

- Component: `app/components/products/BrandLogo.vue` (`<ProductsBrandLogo />`).
- URL Generator: `app/utils/logo-dev.ts` (`logoDevNameUrl(name, publishableKey)`).
- Runtime Config: `useRuntimeConfig().public.logoDevPublishableKey`.
- Table: `app/components/taxonomy/BrandTable.vue`.
- Panel: `app/components/taxonomy/BrandDetailPanel.vue` and its overview tab `app/components/taxonomy/BrandPanelView.vue`.

## Data contract

- Brand name is taken from `Marque.nom`.
- Image URL is generated dynamically using `logoDevNameUrl(brand.nom, logoDevPublishableKey)`.
- No new API endpoints, schemas, or backend database changes.

## Implementation phases

1. **BrandLogo prop flexibility**: Ensure `BrandLogo.vue` accepts optional `class?: HTMLAttributes["class"]` merged via `cn()` so callers can adjust surface colors/borders while keeping its core sizing and fallback logic.
2. **BrandTable integration**:
   - In `BrandTable.vue`, retrieve `logoDevPublishableKey` from `useRuntimeConfig().public`.
   - Replace the static placeholder `<Icon name="ph:tag" size="18" />` with `<ProductsBrandLogo size="sm" decorative :brand="brand.nom" :image-url="logoDevNameUrl(brand.nom, logoDevPublishableKey)" :test-id-prefix="\`brand-logo-${brand.slug}\`" class="size-9 rounded-xl border border-border/60 bg-muted/40" />`.
3. **BrandDetailPanel & BrandPanelView integration**:
   - In `BrandDetailPanel.vue`, compute `brandImageUrl` from `props.brand.nom` and `logoDevPublishableKey`, and pass `:image-url="brandImageUrl"` to `<BrandPanelView />`.
   - In `BrandPanelView.vue`, accept `imageUrl?: string | null` prop (falling back to computing it via `logoDevNameUrl`), and replace the static placeholder `<Icon name="ph:tag" size="22" />` with `<ProductsBrandLogo size="md" decorative :brand="brand.nom" :image-url="resolvedImageUrl" test-id-prefix="brand-panel-logo" class="size-11 rounded-xl bg-background text-foreground shadow-none" />`.
4. **Testing & Verification**:
   - Write tests in `test/nuxt/taxonomy-brands.test.ts` verifying:
     - `BrandTable` renders `BrandLogo` with image when Logo.dev key is configured.
     - `BrandTable` falls back to initials when Logo.dev key is missing or image fails.
     - `BrandDetailPanel` renders `BrandLogo` in the overview panel with image or initials fallback.
   - Run vitest, typecheck, lint, formatting, and i18n checks.
   - Write walkthrough artifact `walkthroughs/2026-10-01-taxonomy-brand-logos.md`.

## UI states

- **Configured key and valid image**: displays lazy-loaded remote image thumbnail in table rows (36x36 container, 32x32 image) and detail panel header (44x44 container, 48x48 max image).
- **Missing publishable key**: renders 2-letter uppercase brand initials fallback.
- **Image error (404 / network failure)**: image hides and renders 2-letter uppercase brand initials fallback without layout shift.
