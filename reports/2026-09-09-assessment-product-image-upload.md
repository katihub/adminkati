# Product image upload assessment

## Question

Why does the product area of the NowTech admin panel not upload images, and
would an image uploaded there be displayed by the public NowTech website?

## Method

I traced the product-image control through the admin form and BFF, then checked
the sibling `NowTech-backend-` API/storage implementation and the sibling
`Now-tech--website` catalogue source. I compared the product path with the
working banner-artwork path where that clarified the boundary.

This is a source-level investigation. I did not submit a real image: no
authenticated browser session, running backend, storage configuration, or
deployed public-site build was exercised.

## Findings

### 1. Product upload UI is a visual stub, not an upload implementation

**Severity: primary cause.** `ImageGallery.vue` presents a file picker and
dropzone, but the selected `File` is discarded. `onFileSelected()` stores only
the filename, and dropping a file does the same
(`app/components/products/ImageGallery.vue:122-139`). The component explicitly
documents that the selected file never leaves the browser
(`app/components/products/ImageGallery.vue:60-66`).

Confirming the dialog validates and emits only the manually entered URL and
optional alt text (`app/components/products/ImageGallery.vue:106-115`). The
input's broad `accept="image/*"` is therefore cosmetic today; it does not
create a preview, validate a file, stage a `File`, or make an HTTP request
(`app/components/products/ImageGallery.vue:215-244`).

### 2. Product saving has no upload mutation

**Severity: primary cause.** `DetailForm` serializes the entire gallery as
`{ url, alt }` JSON (`app/components/products/DetailForm.vue:212-225`). Its
schema is likewise URL-only (`app/schemas/produit.ts:13-20,64-67`). The only
product mutations are JSON `POST`/`PATCH` create/update plus lifecycle actions;
none targets an image endpoint (`app/composables/useProduitMutations.ts:8-66`).

This means an operator can save an already-hosted URL, but cannot send local
image bytes from the product form.

### 3. The API, storage service, and admin BFF are already capable

**Severity: enabling capability already present.** The backend implements:

- `POST /v1/catalogue/administration/produits/:id/images`, restricted to the
  `direction` role. It expects the raw image as the request body, with its MIME
  type in `Content-Type`—not `FormData` or multipart
  (`../NowTech-backend-/src/catalogue/administration.controller.ts:177-210`).
- `DELETE /v1/catalogue/administration/produits/:id/images/:rang`
  (`../NowTech-backend-/src/catalogue/administration.controller.ts:281-289`).
- storage of JPEG, PNG, WebP, and AVIF product images, with a 5 MiB per-file
  ceiling (`../NowTech-backend-/src/stockage/stockage.service.ts:45-96,192-255`).
  The successful upload persists its public URL and storage path in
  `nowtech.produit_images`, then returns the refreshed product
  (`../NowTech-backend-/src/catalogue/administration.service.ts:490-510`).

The backend's raw-body parser is mounted on the correctly versioned `/v1`
catalogue route (`../NowTech-backend-/src/main.ts:90-106`). The admin BFF
forwards `content-type` and raw request bytes (`server/utils/proxy-headers.ts:1-13`,
`server/api/v1/[...path].ts:18-27`), and accepts a 5,000,000-byte raw body
(`server/api/v1/[...path].ts:6-24`). There is no backend or proxy capability
gap blocking the product upload request.

The panel already demonstrates the different, working pattern for **banner**
artwork: `useBanniereMutations` builds `FormData` and posts files. That is a
separate banner contract, not evidence that product-image upload is wired
(`app/composables/useBanniereMutations.ts:14-31`).

### 4. The public frontend is a separate static catalogue pipeline

**Severity: primary cause of public-site non-propagation.** For this
assessment, “frontend” means the sibling `../Now-tech--website` repository.
It imports a generated `catalog.json` at build time; its data layer explicitly
does not make request-time reads (`../Now-tech--website/src/lib/catalog.ts:1-37`).
`predev` and `prebuild` regenerate that file from local source data
(`../Now-tech--website/package.json:5-16`), and the generator takes each image
URL from the WooCommerce-export row (`../Now-tech--website/scripts/build-catalog.ts:622-650,732-739`).
The public renderer simply displays the first URL in that static array
(`../Now-tech--website/src/lib/images.ts:24-28`).

It neither calls the admin BFF nor reads `nowtech.produit_images`. A product
image uploaded through the existing backend endpoint would therefore not
appear on this public site until the public site's source/synchronisation and
build pipeline are deliberately changed (or the site is made to read the
backend catalogue API).

### 5. The direct integration needs two guardrails

**Severity: important follow-up, not the primary cause.** The backend accepts
5 MiB (5,242,880 bytes), while the BFF rejects raw bodies above 5,000,000
bytes. A client should either enforce the smaller effective limit or the two
limits should be aligned before describing the maximum to users
(`server/api/v1/[...path].ts:6-24`,
`../NowTech-backend-/src/stockage/stockage.service.ts:45-96`).

Also, the current URL-array `PATCH` path replaces all image rows directly
(`../NowTech-backend-/src/catalogue/administration.service.ts:971-985`). It
does not invoke the dedicated file-delete path, which removes the corresponding
stored object only after deleting the row
(`../NowTech-backend-/src/catalogue/administration.service.ts:516-544`). A
product image implementation should use the dedicated `DELETE` endpoint for
removal rather than treating storage-backed images as URL-only metadata.

## Recommendation

Implement this as a product-admin feature, not as a backend rewrite:

1. Replace the filename-only state with staged `File` objects, local preview,
   exact MIME validation (JPEG, PNG, WebP, AVIF), and an effective 5,000,000
   byte size limit.
2. For an existing product, issue one raw-body `POST .../images` per staged
   file with `Content-Type: file.type`; use the returned product to refresh the
   gallery and invalidate product queries. Do not use `FormData` for this API.
3. For a new product, create the product first, then upload its staged files
   against the returned product ID. Surface partial failure honestly: product
   creation can succeed while a later image fails.
4. Delete images through the dedicated `DELETE .../images/:rang` route so
   storage objects are cleaned up. Preserve URL-only editing as a separate
   action if it remains a business requirement.
5. Make an explicit product decision for the public site: either integrate it
   with the NowTech catalogue API, or extend its synchronisation/export pipeline
   to consume the backend-managed image URLs and redeploy after each update.
   Until then, admin uploads cannot be a public-site publishing workflow.

## Scope limits

This assessment covers product images, not every image in the admin. Banner
artwork already has its own multipart upload flow. I did not inspect the
deployed configurations, run a file through Supabase/local storage, evaluate
image transformations/CDN caching, or change any application code.
