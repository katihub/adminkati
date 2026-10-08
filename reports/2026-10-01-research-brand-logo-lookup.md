# Brand-logo lookup research

## Question

Can a live name-search API reliably supply recognizable brand logos for the product-brand field, and is it a better fit than a local or curated alternative?

## Method and scope

- Read the product form, brand taxonomy types, image component, and Content Security Policy in this admin app.
- Queried the local development backend's read-only taxonomy endpoint. It returned 102 distinct brands. The 2026-09-30 inventory cutover assessment describes the associated 4,275-product database as a local development seed, not production data.
- Queried Brandfetch Search once for each of the 102 local brand names. Matching was measured by normalized exact name (case, accents, spaces, and punctuation ignored), not by manual adjudication of every company/domain.
- Reviewed Brandfetch's official Search API and Brand API documentation and compared the catalog against the current Simple Icons slug table.
- Followed up against Logo.dev's official API, self-hosting, fair-use, attribution, pricing, and terms pages. Its site returned HTTP 429 to direct requests, so the official markdown documentation was read through a text-rendering proxy; the source links below point to Logo.dev.
- Inspected the sibling backend's `StockageService`, administration taxonomy path, database grants, and catalogue ingestion/swap. No backend or admin code was changed and no file was uploaded.
- No product records or images were changed. No lookup result set or image files were saved.

## Findings

### Current app and catalog

- The product form stores `marque` as a nullable string. Taxonomy brands expose only `nom`, `slug`, and product count; no domain or logo reference exists.
- The local development taxonomy contains 102 brands across mainstream technology companies and less widely known/regional brands. It is not established that production has the same distribution.
- `img-src` in `nuxt.config.ts` allows the app, data/blob previews, and configured product-image origins. A Brandfetch image host would need an explicit CSP allowance to render directly.

### Brandfetch Search quality

- All 102 queries returned HTTP 200, at least one result, and an `icon` field in this probe.
- The first result's name exactly matched 77/102 inputs (75.5%). An exact-name result appeared somewhere in the returned candidates for 89/102 (87.3%). Thirteen queries had no exact-name candidate. These are string-match rates, not proof that a domain/logo is correct; they also undercount legitimate corporate-name variants.
- Some first results are potentially misleading. For example, `TECNO` ranked “Tecno Bet Brasil” first; `MERCURY` ranked “Mercury Bank” first; and `SKILL TECH` ranked “Skill lync” first even though an exact-name candidate appeared lower. A result list with visible name/domain and staff confirmation is safer than automatically accepting the top result.
- For five inspected popular/representative brands (HP, Apple, Hikvision, Tecno, and Mercury), the returned icon URLs used the `/fallback/lettermark/icon.webp` path. That is a generated lettermark fallback, not evidence that the Search API supplied each brand's actual logo. The URL paths were inspected; image pixels were not.
- The probe did not supply a client ID because none is configured for this project. The endpoint nevertheless returned results, but Brandfetch's API reference marks `c` as required. The probe therefore assesses search ranking only; it does not validate a supported production integration. A project-owned client ID is needed before relying on it.

### Provider terms and alternatives

- Brandfetch documents Search as free with a published allowance of 500,000 requests/month. It requires a client ID, direct embedding in the user-facing application, live retrieval without caching/persisting search data, and hotlinking of its image URLs; those URLs expire after 24 hours. Search also documents per-IP and per-client throughput limits. These constraints fit an ephemeral admin autocomplete better than a durable logo mapping.
- Brandfetch's separate Brand API returns broader brand assets but requires a bearer API key and documents 100 free requests. That is already below the 102 distinct local brands before repeat lookups, and its storage/asset terms would need separate verification.
- A normalized exact-title comparison against the current Simple Icons slug table matched 34/102 names (33.3%). This is conservative and does not include aliases, but it leaves most catalog brands uncovered without manual mappings. The project also asks users to read its legal disclaimer; trademark ownership remains with the brands.
- Logo.dev's Search API is available on every plan and supports exact/near-exact matching (`strategy=match`), returning up to ten candidates with name, domain, and a logo URL. Search requires a secret key and therefore belongs in the backend. The image endpoint accepts a domain and a publishable key; Logo.dev documents that key as safe for browser use. The separate name-image endpoint returns only its top search match, so it is not appropriate for a confirmation modal.
- Logo.dev's Community plan is listed at $0 with 500,000 logo displays, 500,000 searches, and 100 Brand API brand retrievals. That 100 limit is for Brand API retrievals, not Search API lookups; the latter is the relevant workflow for a 102-brand local catalog. The Community plan does not include self-hosting. Commercial use—including an internal company tool—requires visible attribution on the free plan. Logo.dev's attribution instructions say an app behind login can place attribution on its public marketing site.
- Logo.dev's current pricing page lists Pro at $150/month, with 5,000,000 logo displays, 5,000,000 searches, 3,000 Brand API retrievals, and self-hosting. Its self-hosting documentation explicitly licenses storing logos on the customer's infrastructure while the Pro/Enterprise/custom subscription is active. Fair-use guidance prohibits bulk downloads except for this licensed self-hosting use and says requests should be user-driven. This is a documented route to persist image bytes, subject to keeping the subscription active and confirming the commercial terms before launch.
- The backend already has `StockageService.televerser()` with Supabase-backed persistent object storage, a local development mode, MIME/size checks, and short-lived service JWTs. It has `produits`, `branding`, and `documents` buckets; `branding` accepts common image types up to 15 MiB. However, `urlPublique()` creates public Supabase object URLs. A separate private brand-logo bucket and authenticated serving path would be needed if “admin-only” means the image bytes themselves must not be publicly readable.
- Brand rows live in `nowtech.marques`, which the catalogue importer rebuilds by preparing and swapping the entire `nowtech` schema. Storing the selected logo column there would lose it on the next import. Existing durable admin decisions live in `arbitrage`, which is kept separate from the swapped schema and deliberately avoids foreign keys into it. The existing taxonomy API reads name, slug, and product count; it can be extended to join durable logo metadata.
- No Logo.dev token was available, so the actual result candidates, image pixels, and coverage for the 102 local names remain unverified. Documentation establishes that the integration is technically and contractually plausible on Pro; it does not establish that the returned assets are recognizable or correct for this catalog.

### Official-website extraction alternative

- This is technically viable, but it is not a reliable “search the internet for a logo” primitive. The catalog has brand names, not verified official domains. Product source URLs identify where an offer was found; they are not a safe substitute for the manufacturer's official domain.
- Site metadata is inconsistent. Some homepages provide a structured `Organization.logo`; many only expose favicon/manifest icons, while Open Graph images are often social cards rather than logos. Sites may also redirect, block automated requests, or build their pages client-side. A crawler can collect candidates, but cannot reliably determine the correct brand/entity and logo variant without human review.
- A site may publish a semantic `Organization.logo`, but coverage is not guaranteed. `og:image` is the image representing a web page/object in social previews, not necessarily a brand logo; favicons and manifest icons are site/app icons and may be poor substitutes. These are candidate signals, not authoritative results.
- Fetching and rehosting a public image is not automatically permission to reuse it. Respect the site's terms, robots guidance, and rate limits; `robots.txt` is crawler guidance, not access authorization or a reuse license. Confirm the intended internal-use rights where unclear. Logos remain trademark/copyright assets even when they are displayed only in an admin panel.
- A broad or user-controlled URL fetch in the backend also creates SSRF and resource-exhaustion risk. Any production fetcher needs verified HTTPS domains, redirect/IP checks, strict byte/time limits, image MIME/decoder validation, and no recursive crawl. Returning arbitrary remote image URLs to the browser would also require widening the current restrictive `img-src` CSP.
- For the 102-brand local development catalog, a one-time, human-reviewed ingestion script is much more manageable than a live general-purpose crawler: start from a staff-verified domain list, fetch only a small number of pages/assets per domain, gather structured logo and icon candidates, produce a review contact sheet, then save only approved files to backend storage. Treat favicons and social cards as lower-confidence candidates, not confirmed logos.
- If staff need ongoing selection in the product form, add a controlled “official domain” fetch action for one verified brand at a time, not open-web crawling. This still has greater implementation and maintenance complexity than Logo.dev's consistent Search/Image APIs, but avoids an ongoing provider fee and dependency when the domain list and rights are curated.

## Recommendation

Do **not** automatically display Brandfetch Search's top icon as the selected brand's logo. Search quality is useful for suggestions, but results can rank the wrong entity first, sampled icons were lettermark fallbacks, and the documented Search API does not let the app persist the selected result for stable later display.

Logo.dev is the strongest provider candidate for the stated persistence requirement, **provided the team accepts the current $150/month Pro price**. Before committing, obtain project-owned keys and run a staff-reviewed pilot across popular, ambiguous, regional, and obscure names. Verify the rendered pixels and candidate/domain match; docs cannot guarantee the quality of this catalog's matches.

If the pilot succeeds, proposed implementation:

1. Add a durable `arbitrage` brand-logo metadata table keyed to the catalog brand identity (the current brand name is the source table's primary key; define how name changes are reconciled). Store the selected Logo.dev domain, provider, object key, and selection audit fields. Do not add the field only to `nowtech.marques`, because imports replace that schema.
2. Add backend-only Logo.dev Search integration using the secret key. A direction-role-protected endpoint should return candidates for the modal; staff choose by visible name/domain. Show previews directly from `img.logo.dev` with the safe publishable key and add that host to the admin CSP. Do not proxy live candidate images through the backend: Logo.dev's fair-use guidance explicitly rejects a generic proxy as a use case.
3. On explicit save, have the backend fetch the selected domain's Logo.dev image using the fixed Logo.dev image host, request WebP at a small size, validate response type/size, and pass the bytes through the existing storage abstraction. Prefer a dedicated private bucket and authenticated admin image route; reusing `branding` is simpler but the current URL contract makes its files publicly readable.
4. Persist the object key and source domain in `arbitrage`, enrich taxonomy responses with the saved logo for product forms, and provide a change/refresh action. Upload the replacement first, update metadata, then delete the prior object; retain initials when no saved logo exists. Limit provider calls/downloads to staff actions rather than bulk-importing the catalog.
5. Document that the Logo.dev self-host license lasts only while the eligible subscription is active. Define a remove/migrate process if the subscription ends, and confirm any remaining contract questions with Logo.dev before storing production assets.

If the Pro fee is not acceptable, Community can support live Logo.dev previews but not the documented self-hosted-image requirement, and commercial attribution applies. Do not persist image bytes on Community. Options are to obtain written confirmation before persisting only a selected Logo.dev domain/reference, or use a one-time staff-verified official-domain extraction with human approval and rights review, or accept staff-uploaded/otherwise licensed assets with initials fallback. Simple Icons alone matched only 34/102 normalized names in the prior comparison.

If a reliable live logo source cannot be validated, use a curated domain/icon mapping for the most common brands and initials for the rest. Simple Icons alone is not sufficient for this catalog at its current exact-name coverage.

## Scope limits

- The catalog assessment is from local development data, not production.
- No registered Brandfetch client ID or Logo.dev token was available. Brandfetch's no-client-ID probe is not a supported integration test, and Logo.dev candidates/images were not exercised.
- Exact-name metrics do not establish semantic correctness for aliases, regional subsidiaries, or ambiguous brands; only a handful of top candidates were inspected manually.
- No image bytes were visually reviewed, and Simple Icons alias coverage was not curated.
- The backend investigation was source-level only: no running API, Supabase bucket configuration, credentials, or upload was tested. The current code constructs public URLs for the existing buckets; deployed bucket policy was not independently queried.
- No official brand websites were crawled, and no specific brand-site rights or robots policies were reviewed. The extraction assessment is architectural, not a measured success rate for this catalog.
- Logo.dev prices and plan features are the published values retrieved on 2026-10-01, not a quote. The documentation was not legal advice; obtain provider confirmation for any ambiguity and for termination handling.
- Wikidata/Wikimedia and favicon-based approaches were not tested end-to-end.

## Sources

- Local product form: `app/components/products/OverviewMedia.vue`, `app/components/products/DetailForm.vue`
- Local API contracts: `app/types/api/produits.ts`
- Local image policy: `nuxt.config.ts`
- Local dev data caveat: `reports/2026-09-30-assessment-product-inventory-cutover.md`
- [Brandfetch Search API overview](https://docs.brandfetch.com/brand-search-api/overview)
- [Brandfetch Search API reference](https://docs.brandfetch.com/reference/brand-search-api)
- [Brandfetch Brand API](https://docs.brandfetch.com/docs/brand-api)
- [Simple Icons repository and disclaimer](https://github.com/simple-icons/simple-icons)
- [Logo.dev Search API](https://www.logo.dev/docs/brand-search/introduction)
- [Logo.dev Search endpoint reference](https://www.logo.dev/docs/api-reference/rest-api/search-brands-by-name)
- [Logo.dev logo images by domain](https://www.logo.dev/docs/logo-images/get)
- [Logo.dev self-hosting](https://www.logo.dev/docs/platform/self-hosting)
- [Logo.dev fair-use guidelines](https://www.logo.dev/docs/platform/fair-use)
- [Logo.dev attribution requirements](https://www.logo.dev/docs/platform/attribution)
- [Logo.dev pricing](https://www.logo.dev/pricing)
- [Logo.dev terms of service](https://www.logo.dev/docs/support/terms)
- [Schema.org `logo` property](https://schema.org/logo)
- [Open Graph protocol](https://ogp.me/)
- [RFC 9309: Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- Sibling backend: `../../nvc/NowTech-backend-/src/stockage/stockage.service.ts`, `src/catalogue/administration.service.ts`, `src/catalogue/administration.controller.ts`, `sql/arbitrage.sql`, `sql/droits.sql`, and `scripts/ingerer-catalogue.mjs`
