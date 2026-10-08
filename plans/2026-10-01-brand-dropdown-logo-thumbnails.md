# Brand dropdown logo thumbnails

## Requirement

Show a brand image next to each brand name in the product brand dropdown. Reuse the same Logo.dev name-image URL used by the selected-brand preview so normal browser HTTP caching can reuse the response. Do not add a server proxy, image-byte storage, or backend changes.

## Reuse

- Keep the existing `ProductsFilterCombobox` for product brand selection and category selection.
- Extract the Logo.dev image/fallback presentation into a reusable `ProductsBrandLogo` component used by both dropdown options and the existing preview wrapper.
- Keep the URL builder in `app/utils/logo-dev.ts` as the single URL contract.

## Data contract

- A filter option may carry optional leading-image data; category options remain unchanged.
- Brand option and selected preview receive the same exact URL for a given brand name and publishable key.
- The image is loaded directly from `img.logo.dev` with `loading="lazy"`; no app server request is introduced.

## Implementation phases

1. Add an optional image field to `FilterCombobox` options and render the shared logo component when supplied. Done when non-image options remain visually unchanged and brand options have aligned thumbnail/name rows.
2. Extract the image tile and initials-on-error behavior from `BrandLogoPreview.vue` into `BrandLogo.vue`; derive brand image URLs once in `OverviewMedia.vue` and pass the selected option's same URL to the preview. Done when dropdown and preview share URL generation and visual fallback behavior.
3. Run formatter, typecheck, lint, i18n check, and diff whitespace validation. The user explicitly requested to skip tests for this change; do not add or run automated tests for it.

## UI states

- Closed dropdown: options are not interacted with; keep the selected-brand preview behavior unchanged.
- Open dropdown with a configured publishable key: show each brand's lazy Logo.dev thumbnail.
- Missing key: show initials for brand image slots and do not request Logo.dev.
- Failed remote image: show initials without blocking selection.
- Category dropdowns: no leading image and unchanged layout.

## Risks and limits

- Reusing the exact URL allows the browser's ordinary HTTP cache/request coalescing to help; Vue component reuse by itself does not guarantee caching. Actual cache lifetime is controlled by Logo.dev response headers and browser policy.
- Opening the picker for the first time can still request uncached thumbnails for visible options. Lazy loading avoids eagerly loading the entire list when the browser can defer offscreen images.
- Server-side image caching/proxying remains out of scope because the configured Community plan does not license self-hosting Logo.dev image bytes.
- Automated tests are waived by the user's explicit instruction for this change.

## Confirmed scope

- The user selected browser caching over server caching/proxying.
- The user suggested a shared BrandLogo component to keep logo rendering reusable.
- The user chose to skip testing for this change.
