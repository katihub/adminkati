# Order PDF Export Backend

## Goal

Implement the backend contract in [`BACKEND_REQUIREMENTS.MD`](../BACKEND_REQUIREMENTS.MD) so
`direction`, `comptoir`, and `preparation` team members can export an order summary, commercial
invoice, or packing slip as a French or English PDF. The export must be role-shaped, fully audited
before any bytes are disclosed, branded with a backend-owned logo, and resilient when optional
product images cannot be embedded.

The implementation lives in [`../../nvc/NowTech-backend-`](../../nvc/NowTech-backend-). This plan
does not reopen the existing admin UI plan at
[`2026-09-28-order-pdf-export.md`](2026-09-28-order-pdf-export.md); it adds only a narrow
verification that the existing BFF preserves the completed backend response.

## Confirmed Decisions

- The endpoint is team-only: `@Roles(direction, comptoir, preparation)`. Clients and `livreur`
  cannot export, even though the existing detail route has a broader authentication shape.
- Reuse `CommandesService.charger()` for reference normalisation, authorization, line ordering, and
  `projeterCommandeEquipe()` output. The exporter never performs a parallel raw-order query.
- Extend the financial (`direction`/`comptoir`) projection with the frozen delivery address and
  phone. Preparation receives neither financial data nor any client or delivery contact. No courier
  is rendered because no courier assignment exists in the model.
- Render full PDF bytes first, transactionally write the audit entry second, and respond only after
  both succeed. An audit failure is an export failure.
- All three document types are available at every order status. An invoice prominently states that
  it is a commercial document, not a certified tax invoice.
- Images are non-contractual current catalogue thumbnails. Use only managed storage objects; never
  fetch `url_source` fallbacks. Images appear in all three documents but never block an export.
- The backend owns a copied, reviewed PNG version of the existing admin logo and builds it into
  `dist/`. The printed shop identity is the source constant `NowTech Center`; no unverified postal
  address is printed.
- PDFs are A4 portrait, with repeated table headers, page numbers, exact locale-aware FCFA amounts,
  and `Africa/Douala` timestamps.

## Reuse And Boundaries

| Existing code | Reuse in this plan |
| :-- | :-- |
| `src/commandes/commandes.service.ts:722` | `charger()` remains the sole loader, authorization boundary, and source of the projected order. |
| `src/commandes/commandes.reponse.ts:127` | `projeterCommandeEquipe()` remains the role/privacy boundary; only the financial branch gains the approved delivery fields. |
| `src/catalogue/catalogue.service.ts` | Owns one new batched lookup of managed primary image keys from the regenerated `nowtech` schema. |
| `src/stockage/stockage.service.ts` | Owns one bounded read operation for controlled storage keys; the export module never constructs storage URLs. |
| `src/commun/journal/journal.service.ts` | `consigner()` records a required audit entry inside a Prisma transaction. |
| `src/commandes/commandes.controller.ts` | Owns the route, role decorator, rate limit, `StreamableFile`, and download headers. |
| `server/api/v1/[...path].ts` | Existing `sendProxy` remains unchanged unless the post-backend binary/header check proves a defect. |

## Data Contract

### Request

```text
GET /v1/commandes/:reference/export?document=<type>&locale=<locale>
```

```ts
type ExportDocument = "recapitulatif" | "facture" | "bon-preparation"
type ExportLocale = "fr" | "en"
```

- `document` is required. Any other value is `400`.
- `locale` defaults to `fr` only when omitted. A supplied value other than `fr` or `en` is `400`.
- Unknown orders retain `charger()`'s `404`. Authentication and authorization retain the project
  guard conventions.
- Success is `200 application/pdf` with
  `Content-Disposition: attachment; filename="<reference>-<document>-<locale>.pdf"`.

### Role-Shaped Document Content

| Document | Direction / comptoir | Preparation |
| :-- | :-- | :-- |
| `recapitulatif` | Shop header, reference, state, dates, customer name, validated frozen delivery block and phone, lines/images, and available totals. | Shop header, reference, state, dates, lines/images only. |
| `facture` | Same role-allowed body, payment state and remaining balance when projected, plus commercial-not-certified notice. | Same redacted body, without finance, payment, or contact data. |
| `bon-preparation` | Reference, dates, lines/images, quantities, delivered quantities, and line states. | The same operational line data. |

The packing slip never includes unit prices, subtotals, totals, balance, payment state, or currency
labels for any role. The preparation projection never receives the frozen address, delivery phone,
or any customer contact. `adresseFigee` is parsed as an object containing only string `mode`,
`ville`, `quartier`, and `repere` fields; unknown values are dropped and an empty result produces no
delivery block.

### Audit Contract

After rendering has completed but before `StreamableFile` is returned, append exactly one journal
entry in a Prisma transaction:

```ts
{
  action: "commande.exportee",
  cibleType: "commande",
  cibleId: reference,
  acteurType: "equipe",
  acteurId: appelant.membreId,
  acteurRole: appelant.roles.join(","),
  ip: trace.ip,
  agent: trace.agent,
  detail: { document, locale },
}
```

The full verified role set follows the existing journal convention because requests do not carry an
active role. A failed journal transaction prevents the response from exposing the PDF.

### Image Contract

- `CatalogueService` accepts the distinct projected line `produitId`s and returns only the primary
  managed `chemin_local` key per product. It performs one parameterized raw query; no per-line
  catalogue query is permitted.
- `StockageService` reads a managed key directly from local storage in development and from
  authenticated Supabase Storage in production. It validates the key, rejects unexpected status or
  MIME types, checks `Content-Length` when present, and enforces streamed limits when it is absent.
- Process distinct products in first-line order with low, bounded concurrency. Limit each source to
  2 MiB, decoding to 16 megapixels, and the total fetched image input to 20 MiB per export.
- `sharp` decodes JPEG, PNG, WebP, and AVIF, then resizes and transcodes each accepted image to a
  small PNG thumbnail for PDFKit. Missing, malformed, external-only, oversized, or budget-exceeded
  images are omitted, not retried through another URL, and do not fail the PDF.

## Implementation Plan

### 1. Add Render And Test Dependencies, Then Package Branding

**Where:**

- `../../nvc/NowTech-backend-/package.json`
- `../../nvc/NowTech-backend-/pnpm-lock.yaml`
- `../../nvc/NowTech-backend-/nest-cli.json`
- `../../nvc/NowTech-backend-/src/commandes/export/assets/nowtech-center-logo.png` (new)

**What changes:**

1. Add runtime `pdfkit` and `sharp`, plus the PDFKit type package. Add `pdf-parse` only as a test
   dependency for artifact-level assertions.
2. Convert the reviewed source asset
   `../../nowtech-admin/feat-enhancements/public/logo.avif` once to a committed PNG at the new
   backend asset path. Do not load the frontend file at runtime and do not retain an AVIF decoding
   path for the static logo.
3. Configure Nest CLI asset copying so the PNG appears alongside the compiled export module in
   `dist/`; make the renderer resolve the built asset from that module path.

**Done when:** `pnpm build` produces the PNG in `dist/`, and an export test can render the logo
without relying on an absolute checkout path.

### 2. Expose Bounded, Managed Product Image Access

**Where:**

- `../../nvc/NowTech-backend-/src/catalogue/catalogue.service.ts`
- `../../nvc/NowTech-backend-/src/catalogue/catalogue.service.spec.ts` (new)
- `../../nvc/NowTech-backend-/src/stockage/stockage.service.ts`
- `../../nvc/NowTech-backend-/src/stockage/stockage.service.spec.ts`

**What changes:**

1. Add a public `CatalogueService` batch method that takes product IDs, de-duplicates them, and
   returns a product-ID-to-managed-primary-image-key map. Query `nowtech.produit_images` once,
   choose the lowest-ranked image, and return no result for rows without `chemin_local`; never
   return or resolve `url_source`.
2. Add a `StockageService` read method with an explicit byte limit. In local mode it must use the
   existing validated bucket path and reject oversized files before returning bytes. In production it
   must request the configured Supabase Storage object with the short-lived service token, validate
   a supported image MIME type, and stop reading once the limit is crossed.
3. Keep URL composition private to `StockageService`; the exporter works only with the opaque
   managed key and received bytes.

**Done when:** service specs demonstrate one batch query for repeated line products, external-only
images excluded from results, local and remote managed reads bounded at the requested limit, and no
storage URL is exposed to the export service.

### 3. Preserve Projection Privacy And Build the PDF Renderer

**Where:**

- `../../nvc/NowTech-backend-/src/commandes/commandes.reponse.ts`
- `../../nvc/NowTech-backend-/src/commandes/export/commande-pdf.service.ts` (new)
- `../../nvc/NowTech-backend-/src/commandes/export/commande-pdf-textes.ts` (new)
- `../../nvc/NowTech-backend-/src/commandes/export/commande-pdf.service.spec.ts` (new)
- `../../nvc/NowTech-backend-/src/commandes/commandes.module.ts`

**What changes:**

1. Extend only the `financier` branch of `projeterCommandeEquipe()` with the frozen address and
   delivery phone. Keep the existing preparation object unchanged, including its absence of all
   customer and money fields.
2. Create `CommandePdfService`. It receives only a projected team order, selected document/locale,
   and image-key map; it creates a sanitized render model before passing text or values to PDFKit.
   The service owns defensive address parsing, image lookup order/budgets, Sharp thumbnail
   conversion, A4 pagination, repeated table headers, footer page numbers, and Buffer completion.
3. Render all documents with the committed PNG logo, `NowTech Center` text header, translated
   document title, `Africa/Douala` date/time formatting, and exact non-compact
   `Intl.NumberFormat` XAF/FCFA amounts. Use no postal-address constant.
4. Define French and English dictionaries with exhaustive type checking for each applicable Prisma
   order, payment, delivery, and line-status enum. Include all fixed labels and the translated
   commercial-invoice notice; do not use generic runtime humanization.
5. Ensure the packing-slip render model has no financial properties at all. The renderer must not
   infer a zero or show an empty money placeholder when the projection omits a value.
6. Register the renderer in `CommandesModule`; reuse its existing `CatalogueModule` import and the
   globally available `StockageService` rather than adding a direct raw-schema dependency.

**Done when:** parsed-PDF tests prove non-empty bytes, both locales, all document titles and status
labels, every document's thumbnails when controlled fixtures supply them, the commercial invoice
notice, no packing-slip monetary text, and no preparation finance/contact/delivery text.

### 4. Add the Validated, Audited, Throttled Endpoint

**Where:**

- `../../nvc/NowTech-backend-/src/commandes/commandes.dto.ts`
- `../../nvc/NowTech-backend-/src/commandes/commandes.controller.ts`
- `../../nvc/NowTech-backend-/src/commandes/commandes.service.ts`
- `../../nvc/NowTech-backend-/src/commandes/commandes.service.spec.ts`
- `../../nvc/NowTech-backend-/src/commandes/commandes.controller.spec.ts` (new, if controller
  metadata has no existing home)

**What changes:**

1. Add a dedicated export query DTO: document is required and finite; locale is optional and finite,
   with `fr` applied only after an omitted value passes validation.
2. Add `CommandesService.exporterPdf(reference, query, appelant, trace)`. It first delegates to
   `charger()`, then performs the one catalogue batch lookup and PDF render. After a complete Buffer
   exists, it opens a Prisma transaction and calls `journal.consigner()` with the exact contract
   above. Only a successful audit returns the Buffer and normalized reference to the controller.
3. Add `@Get(':reference/export')` before the `:reference` route, decorate it with the three
   approved roles and `@Throttle` limits of 5 per minute and 60 per hour, and return a
   `StreamableFile` with exact PDF content type and attachment filename.
4. Preserve existing `charger()` errors rather than translating an unknown reference or forbidden
   role into a successful-but-empty document.

**Done when:** DTO/controller/service tests prove `400` validation, client and livreur rejection,
`404` unknown reference, all allowed role paths, exact download headers, required audit payload,
and no bytes returned if the audit transaction fails.

### 5. Prove Rendering, Privacy, and Image Failure Boundaries

**Where:**

- `../../nvc/NowTech-backend-/src/commandes/export/commande-pdf.service.spec.ts`
- `../../nvc/NowTech-backend-/src/commandes/commandes.service.spec.ts`
- `../../nvc/NowTech-backend-/src/catalogue/catalogue.service.spec.ts`
- `../../nvc/NowTech-backend-/src/stockage/stockage.service.spec.ts`

**What changes:**

1. Use distinct, non-overlapping sentinel values for prices, identifiers, quantities, and phones so
text extraction can prove sensitive values are absent instead of coincidentally matching another
field.
2. Test the sanitized render model and text parsed from real PDF bytes. Cover every document in
French and English, financial-role delivery data, malformed-address omission, full money sections,
the invoice notice, and packing-slip/no-preparation leakage rules.
3. Stub controlled storage reads and Sharp conversion to cover a valid managed thumbnail, duplicate
product IDs, no `chemin_local`, malformed bytes, oversized source, pixel limit, aggregate limit,
and missing object. Each failure path must leave a valid PDF without the affected thumbnail.
4. Verify the service writes one audit entry only after rendering, uses the verified full role set,
and rejects the export on journal failure.

**Done when:** the suite observes both behavior and final artifacts at their public seams, without
snapshots, CSS-style assertions, or tests that merely mirror the implementation.

### 6. Verify the Existing Admin BFF Binary Boundary

**Where:**

- `server/api/v1/[...path].ts` (verification target; modify only if verification exposes a defect)
- `test/nuxt/order-export-bff.test.ts` (new)
- `test/nuxt/orders-export-dialog.test.ts` (regression target)

**What changes:**

1. Add an integration-style Nuxt/Nitro check using a controlled backend response through the real
   catch-all route. Assert PDF bytes survive unchanged and `Content-Type: application/pdf` plus the
   backend `Content-Disposition` attachment filename reach the browser-facing response.
2. Keep the existing dialog test focused on its request/error/success behavior. Do not duplicate the
   backend renderer in the admin test suite.
3. If `sendProxy` does not preserve the binary headers, make the smallest explicit header forwarding
   correction in the catch-all and cover that regression. Do not replace the BFF's existing explicit
   allowlist or proxy architecture.

**Done when:** a completed backend export is downloadable through `/api/v1/commandes/:reference/export`
with the expected PDF bytes and both headers, while the existing export dialog tests remain green.

## States And Failure Policy

| Condition | Result |
| :-- | :-- |
| Invalid `document` or supplied `locale` | `400`, no renderer or audit invocation. |
| Client or livreur caller | `403`, no projection or audit. |
| Unknown order | Existing `404`, no renderer or audit. |
| Managed image unavailable, malformed, oversized, unsupported, or beyond aggregate budget | Omit that thumbnail and continue rendering. |
| Bad frozen address structure | Omit unsafe/unknown address values; continue rendering. |
| PDF render failure | Error response; no audit entry. |
| Audit transaction failure | Error response; no PDF bytes disclosed. |
| BFF header loss | Fail the integration check and fix only the proxy header passthrough. |

## Risks And Earliest Checks

| Risk | Earliest check |
| :-- | :-- |
| `sharp` native binaries or PDFKit types fail under the project Node version | `pnpm install && pnpm build` immediately after dependency addition. |
| Nest output omits the static logo | Build and renderer test load the asset from `dist/`, not the source checkout. |
| A new projector field leaks to preparation | Assert both sanitized model keys and parsed preparation PDF text. |
| Large image input exhausts worker resources | Storage and renderer tests exercise per-file, pixel, aggregate, and malformed-byte limits. |
| A new enum is untranslated | Exhaustive dictionary typing makes `pnpm build` fail. |
| Direct backend download works but BFF strips attachment metadata | Run the real catch-all binary/header test before declaring the feature integrated. |
| Page wrapping hides or overlaps rows beyond a typical order | Use a 200-line renderer fixture and assert repeated headers/page count plus terminal totals/footer. |

## Validation Commands

Run in `../../nvc/NowTech-backend-`:

```bash
pnpm test -- src/catalogue/catalogue.service.spec.ts
pnpm test -- src/stockage/stockage.service.spec.ts
pnpm test -- src/commandes/commande-pdf.service.spec.ts
pnpm test -- src/commandes/commandes.service.spec.ts
pnpm lint
pnpm build
pnpm test
```

Run in this admin worktree after the backend endpoint is available to the controlled integration
fixture:

```bash
bunx vitest run test/nuxt/order-export-bff.test.ts
bunx vitest run test/nuxt/orders-export-dialog.test.ts
bun run typecheck
bun run lint
```

## Out Of Scope

- Customer-initiated, `livreur`, bulk, quote, or email exports.
- A courier assignment model or any new delivery-workflow surface.
- Persisting generated PDFs or adding an audit-viewer UI.
- External `url_source` image fetching, general-purpose remote-image proxying, or image snapshots on
  order lines.
- Tax calculations, registration details, or representing the invoice as a certified tax record.

## Open Questions

None. Every scope, authorization, privacy, rendering, asset, performance, audit, and verification
decision was confirmed before this plan was written.
