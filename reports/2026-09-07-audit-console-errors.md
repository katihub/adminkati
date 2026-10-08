# Console error audit

## Question

What in the supplied browser console output is an application defect, and what is an expected or
separate development issue?

## Method

Read the current frontend call sites, API types, locale files, proxy boundary, the backend catalogue
service, the existing products postmortem, and the live browser console. The worktree was clean at
the time of inspection. No files outside this report were changed.

## Findings with evidence

### Proposal detail crashes on a nullable backend change

`app/components/content/propositions/ProposalChangesTable.vue:14-25` assumes every entry in
`proposal.champs` is an object and reads `change.avant` and `change.apres`. The live browser
reported `Cannot read properties of null (reading 'avant')` from this exact component. The later
`vnode`, `nextSibling`, and unmount errors are Vue recovery failures after that render exception.

The product history contract already models this backend shape as
`Record<string, { avant: unknown, apres: unknown } | null>` in
`app/types/api/produits.ts`; the proposal contract in `app/types/api/catalogue.ts:34-36` still
does not. The minimal repair is to make the proposal change nullable and format both values through
optional access, as `app/components/products/HistoryEntry.vue` already does.

### Two proposal field labels are missing

The backend proposal contains `slug` and `images` fields in at least one live record. Both locale
files omit `content.propositions.fields.slug` and `.images`, which matches the two Intlify warnings.
Add those keys to `i18n/locales/content/en.json` and `i18n/locales/content/fr.json`.

### `/forgot-password` is an intentionally unfinished route

`app/components/auth/LoginForm.vue:119` links to `/forgot-password`, but `app/pages/` contains no
matching page. The login plan explicitly accepted this warning until the separate forgot-password
ticket lands. It is a real broken destination, but it is unrelated to the proposal or catalogue
failures. The warning disappears either when that page is implemented or when the link is removed or
temporarily disabled by an intentional product decision.

### Product-list HTTP 500 is caused by schema drift in the local backend database

The browser reports repeated 500 responses for
`GET /api/v1/catalogue/administration/produits?etat=tous&tri=recent&page=1&taille=50`. The frontend
uses the expected BFF route in `app/composables/useProduits.ts`, and
`server/api/v1/[...path].ts` forwards it to the configured backend with the authenticated session.
The backend list implementation is the SQL path in
`NowTech-backend-/src/catalogue/administration.service.ts`, which queries `nowtech.produits`,
`nowtech.produit_images`, and `nowtech.categories`.

An authenticated request reproduced HTTP 500 from `localhost:3001`. Running the same list query as
the database application role produced:

```text
ERROR: column p.promo_debut does not exist
```

The live `nowtech.produits` table has 4,277 rows but contains neither `promo_debut` nor `promo_fin`.
The current backend service reads both columns and passes them to `nowtech.prix_effectif(...)`.
Those columns are added by `NowTech-backend-/sql/promotions.sql`, which was not applied to this
database after the backend promotion-window code was introduced. This is why the authenticated
browser request fails while the unauthenticated direct request correctly returns 401.

The backend fix is to run the existing migration script against the local development database,
then restart the backend if it does not reload automatically:

```bash
cd /Users/michaelnji/Projects/nvc/NowTech-backend-
docker compose exec -T bd psql -U nowtech -d nowtech -v ON_ERROR_STOP=1 < sql/promotions.sql
```

The script is idempotent for the columns, constraints, functions, and index. Do not run the
production ingestion script for this repair. Verify afterward with `\\d nowtech.produits` and an
authenticated GET of the product list; the response should be 200.

### Missing mock SVGs are independent asset defects

`server/utils/apercu-mock.ts:64-70` references `/mock/produits/portable.svg`, `energie.svg`,
`telephone.svg`, `reseau.svg`, and `impression.svg`, but no matching files exist under `public/`.
Those requests produce `IPX_FILE_NOT_FOUND`. Either add the referenced mock assets or change the
mock dataset to assets that actually exist; this does not explain the catalogue API 500.

### Development-only messages

`ssr:start`, `ssr:info There was no request sent`, Vue Suspense's experimental notice, and Vercel
Analytics debug output are informational development messages. They are not failures in the
application path shown here.

## Recommendation

The frontend repairs are implemented: nullable proposal changes are rendered safely, field labels
are localized, the forgot-password link has a truthful informational route because no reset API
exists, and the mock dataset now points at the tracked WebP assets. Apply `sql/promotions.sql` to
the local backend database to remove the product-list 500.

## Not examined

- Production database state or whether the promotion SQL has been deployed there.
- Whether `/forgot-password` has already been implemented on another branch or is intentionally
  scheduled outside this workspace.
- Whether the mock SVG names should be replaced with a shared illustration system rather than adding
  five files.
