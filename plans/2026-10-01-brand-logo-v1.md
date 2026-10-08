# Brand logo selection — V1

## Requirement

From a product's selected brand, let direction staff find and choose a logo without entering a website URL. Use Logo.dev Search only to discover likely brand domains; retrieve image candidates from those websites, including ordinary favicons and low-resolution icons. Save one chosen image per brand, reuse it in the admin panel, and let staff replace it later. Do not connect this metadata to the storefront.

The candidate list is advisory. Show the source company/domain and asset type so staff can reject a wrong match. Do not discard an otherwise valid candidate merely because it is small or visually rough.

## Reuse

- Product brand control: `app/components/products/OverviewMedia.vue` and `ProductsFilterCombobox`.
- Product form receives the brand list from `useTaxonomie()` in `app/composables/useTaxonomie.ts`; taxonomy is cached for a day, so successful saves must invalidate `apiQueryKeys.taxonomy.all`.
- Reuse the existing shadcn-vue `Dialog` components and current product image display conventions.
- Backend stores persistent images through `StockageService.televerser(..., 'branding')`; that bucket already accepts common image types and supports local development storage.
- Keep selected metadata in `arbitrage`, not `nowtech`: catalogue ingestion drops/swaps the entire `nowtech` schema. Do not add a foreign key to a table in that replaceable schema.

## Data contracts

All routes below are under `/v1/catalogue/administration` and require `Role.direction` for discovery and writes.

### Discover candidates

`POST /marques/logo-candidats`

Request JSON:

```ts
{ nom: string }
```

Response:

```ts
{
  candidats: Array<{
    id: string
    nom: string
    domaine: string
    type_source: 'logo-structure' | 'image-site' | 'icone' | 'icone-apple' | 'manifest'
    url_source: string
    apercu: string // data:image/png;base64,...; same-origin/data: preview, not a provider URL
  }>
}
```

The backend first confirms `nom` is an existing `nowtech.marques.nom`, then calls Logo.dev Search with `strategy=match` and its server-only secret key. From up to ten search results, it tries at most three distinct, name-matching/high-ranked domains. It fetches a bounded HTTPS homepage and, when advertised, its web manifest; it does not recursively crawl links or run page JavaScript. Candidate signals include `Organization.logo`, homepage images labelled as logos, Open Graph images, `rel=icon`, Apple touch icons, manifest icons, and `/favicon.ico`. Low pixel dimensions are not a rejection condition.

Normalize candidate previews to PNG at up to 128×128 pixels without enlarging small files. Return no more than 12 deduplicated candidates. Include source labels and domains; keep search results and unselected image bytes ephemeral. The browser displays `apercu` data URLs, so CSP does not need a wildcard remote-image allowance.

### Save or replace a selection

`PUT /marques/logo?nom=...&domaine=...&url_source=...&type_source=...`

The body is the selected preview bytes with `Content-Type: image/png`. The existing Nest raw-image parser and admin BFF raw-body path already cover this content type. The backend validates the current brand, query values, body size, and actual PNG bytes; it must not fetch a client-supplied URL while saving.

Response:

```ts
{
  nom: string
  logo_url: string
  domaine: string
  url_source: string
  octets: number
}
```

### Persisted metadata and taxonomy

Add `arbitrage.marques_logos`, keyed by the exact current `nowtech.marques.nom`, with the selected source domain/URL/type, storage object key, MIME type, byte size, chosen timestamp, and authenticated staff identity. No foreign key points into `nowtech`. Extend the taxonomy brand projection with `logo_url: string | null`, constructed through `StockageService.urlPublique(chemin, 'branding')`; never persist an environment-specific storage URL.

Use upload-first replacement: store the new image, transactionally upsert metadata, then remove the old object. If the database update fails, remove the new object and retain the old metadata/file. A failed old-file deletion may leave an orphan, but must not break the selected logo.

`LOGO_DEV_SECRET_KEY` is optional backend configuration, supplied through the ignored local/deployment environment only. No Logo.dev image endpoint, Logo.dev image asset, client key, or provider search-result cache is part of V1. Without the secret, discovery returns a useful configuration error rather than failing application startup.

## Implementation phases

1. **Durable brand record** — add the table to `../../nvc/NowTech-backend-/sql/arbitrage.sql`, explicit rights to `sql/droits.sql`, add the optional Logo.dev secret to `src/config/configuration.ts` and `.env.example`, and extend the backend taxonomy projection plus `TaxonomieMarque` in this repo. Done when the brand projection returns a nullable logo URL and survives a catalogue schema swap by design.
2. **Candidate discovery and save API** — add DTO, discovery/storage services, a direction-only controller, and register providers in `src/catalogue/catalogue.module.ts`. Discovery calls Logo.dev Search server-side, fetches only bounded website content/assets, returns labelled image previews, and never saves until staff confirms. Save uploads through `StockageService` and upserts the durable row. Done when mocked-provider tests prove low-resolution favicons remain selectable and save/replace preserves the old selection on failure.
3. **Admin selection UI** — add `app/components/products/BrandLogoPicker.vue`, `app/composables/useBrandLogoMutations.ts`, candidate and response types, and compose the picker into `OverviewMedia.vue`. Display a saved logo for every staff role; expose find/change actions only to `direction`. On selection, send the candidate PNG, invalidate taxonomy, and reuse the returned stored logo. Add matching English/French strings in `i18n/locales/products/en.json` and `fr.json`. Done when staff can find, select, save, see, and replace a logo from a product form.
4. **Verify and document** — run backend targeted Jest specs/build, frontend component specs, i18n check, lint, typecheck, and applicable quality gates. Write the required walkthrough. Do not run production SQL or configure credentials as part of this code change.

## Async states

- No selected/existing brand: no discovery action.
- Selected brand without a logo: show an initial/placeholder and “Find logo” for direction staff.
- Saved logo: show it for direction and comptoir; direction gets “Change logo”.
- Candidate lookup: show loading; if some domains fail but others return images, show the available candidates.
- No usable assets: show an empty state with a retry action and retain the initial/placeholder.
- Missing key, provider/site timeout, or other lookup error: show a readable error and retry; do not save partial results automatically.
- Saving: disable duplicate saves and show pending state. On failure, keep the dialog and selection; on success, close and show the stored logo after taxonomy invalidation.

## Tests and confirmed seams

The user confirmed the public behavior seams: backend candidate discovery/save interfaces and the admin modal's selection/save behavior.

- Backend behavior specs should cover Logo.dev search request/auth configuration, candidate-domain ranking/deduplication, extraction from structured logo/icon/manifest signals, low-resolution icon inclusion, invalid/empty/oversized/non-image/timeout results, non-public or unsafe destinations, unknown brand rejection, valid image persistence, replacement order, and storage/database failure cleanup.
- Admin component specs should cover no-logo discovery, labelled low-resolution candidate rendering, selection and raw PNG save contract, saved-logo display and replace flow, loading/empty/error states, save failure retention, and absence of write controls for comptoir.
- Existing taxonomy/API contracts must assert `logo_url` is null when no selection exists and is populated when saved. Run `bun run i18n:check` for locale parity/raw strings.
- Do not add snapshot, CSS-class, or provider-library tests. No real external search is required in automated tests; stub the external HTTP boundary and run a separate manually configured pilot after deployment.

## Risks and scope limits

- Logo.dev name-to-domain results and websites' markup can be wrong or incomplete. Human selection remains mandatory; this V1 is not a guaranteed domain verifier.
- The backend makes outbound requests to domains returned by a search provider. Restrict to HTTPS/public hosts, validate every redirect and asset host, reject loopback/private/link-local IPs, set short timeouts and strict byte/candidate limits, and never accept an arbitrary URL from the browser. Fetch HTML as untrusted text only; do not execute scripts. Respect site terms and crawler guidance. If these controls cannot be implemented and tested safely, stop at returning provider domains and do not fetch site assets server-side.
- This is an internal identification aid, but public brand websites do not automatically grant a right to rehost their assets. Keep the feature out of the storefront and review applicable reuse terms before production rollout.
- The current `branding` bucket serves public object URLs. V1 assumes “admin-only” means the UI does not show logos in the storefront, not that the files are confidential; anyone with an object URL can read the image. A private bucket/authenticated serving route is separate scope if that assumption is unacceptable.
- There is no immutable brand ID. Exact-name keys survive schema replacement but may stop joining if a brand name changes; the current taxonomy has no brand-rename CRUD route. Record this limitation and do not delete orphan metadata automatically.
- The backend SQL scripts are applied operationally. Deploying code before `arbitrage.sql`/`droits.sql` are applied will make the feature fail; deployment sequencing must run those scripts first.
- No project Logo.dev secret is available in chat, and no real catalog-site crawl or image quality check has been performed. Keep the key local; verify a representative pilot before enabling staff use in production.

## Open questions / assumptions

- **Search key provisioning:** assume the project owner will configure `LOGO_DEV_SECRET_KEY` in the backend's ignored `.env`/deployment secret store; never put it in source control or the admin runtime config.
- **Public file URLs:** V1 reuses `branding` because the image itself is public and the requirement is admin-only display. If “admin-only” means access-controlled file reads, pause and plan private storage before implementation.
- **Website rights:** the code can identify and copy candidate assets; it cannot grant rights to rehost them. Production enablement remains subject to owner/legal review.
