# Stock export

Slug: `stock-export`.

## 1. Requirement, restated

Add an **Export** action next to **Adjust stock** on the products page. It opens a small dialog where the operator picks the **mode** the file is for (Count or Reception) and the **format** (XLSX or CSV), sees which filters will be applied and how many products match, and downloads a file listing **every** product matching the page's current filters (no page size, no pagination). The backend produces the file using the **same filter DTO and the same query builder** as the products list. The file is a ready-to-fill import file: it goes back into the existing "Adjust stock" importer unchanged.

The same change teaches the importer that a **blank quantity means "not touched"**: such a row is reported as skipped (not as an invalid quantity) in preview and result, in both modes.

### Fixed requirements (decided by the user, not reopened here)

1. Export respects the active filters with identical params and semantics; pagination and page size are not applied.
2. A new backend endpoint produces the file and shares the list's filter DTO and query logic. No browser paging. Direction-only access (see assumption A1).
3. CSV and XLSX, chosen at export time. CSV is UTF-8 with BOM and formula-injection safe (cells starting with `=` `+` `-` `@` are neutralised, with a test).
4. The dialog asks for the mode. Count pre-fills `quantity` with the current stock; Reception leaves it empty. Columns: `product` (numeric id), `name`, `brand`, `category`, `current_stock` (reference only), `quantity`, `reason` (empty).
5. Import change: blank quantity is "not touched", shown as skipped in preview and result, in both modes, backend and frontend. Such a row still counts toward the 2000-row cap.
6. More than 2000 matching products: the export still contains all of them, and the dialog warns that the file must be split before importing. A hard safety ceiling exists (section 4).
7. EN and FR copy, semantic tokens, Phosphor icons, AGENTS.md i18n rules, no text arrows. The filename is descriptive and dated.

### Assumptions (stated, with the default picked)

- **A1. Access is `direction` only (confirmed by the user, 2026-10-01)**, the same as the import (`administration.controller.ts:253`). `comptoir` can read the list but cannot import, and the file exists to be imported. A bulk extract should also be limited to the role that can act on it. The button sits inside the existing `canCreate` gate (`app/pages/products.vue:26-27,186`).
- **A2. Withdrawn products in a Count file get an empty `quantity`.** The store's default state is `etat: "tous"` (`app/stores/product-list.ts:37`), so a default export includes withdrawn products. The importer only resolves active products (`stock-import.service.ts:268-279`), so a pre-filled withdrawn row would fail as `produit_introuvable` in every preview. With an empty quantity it is skipped instead (fixed requirement 5). Withdrawn rows still appear in the file because they match the filters (open question Q1).
- **A3. Headers are fixed English machine names** that match the existing template (`app/utils/stock-import-files.ts:16`) and the importer's aliases. They are not translated per locale (open question Q3).
- **A4. The `category` column is the primary category name** (`c.nom`, the same as the list's `categorie` field, `administration.service.ts:227`). The category filter matches the whole subtree through `produit_categories` (`:187-200`), so a row can show a descendant category name. That is correct, and it is the same thing the list shows.
- **A5. Stale-count drift detection is out of scope (decided by the user, 2026-10-01).** It is tracked in its own plan, `plans/2026-10-01-stock-drift-detection.md`, which builds on this file format and ships after or together with this export.

## 2. Reuse and verified context

### Backend: `/Users/michaelnji/Projects/nvc/NowTech-backend-` (branch `feat/prod-stock-mgt`, import in `51daa17` + `d9f26cb`)

- **List filter DTO**: `ListerProduitsDto`, `src/catalogue/administration.dto.ts:61-97`. The fields are `q` (1-120), `rayon`, `categorie` (int), `marque`, `stock` (`tous|en-stock|rupture|reapprovisionnement`), `etat` (`actifs|retires|tous`, default `actifs` server-side), `tri`, `page`, and `taille ≤ 200`. The cap's rationale is at `:91-96`.
- **List query**: `AdministrationCatalogueService.listerProduits`, `src/catalogue/administration.service.ts:165-257`. The WHERE builder is inline at `:168-209`: state at `:175-183`, full-text `q` at `:185`, brand at `:186`, the category subtree with its two-placeholder workaround at `:187-200`, department at `:201-207`, and stock status via `STATUT_PAR_FILTRE` (`:107-112`) at `:208-209`. The ORDER BY map is at `:212-218`. The stock join is `left join boutique.produit_stocks s`, and quantity is `coalesce(s.quantite, 0)` (`:224,235`), so a product without a stock row counts as 0. Nothing outside this method builds the filter today. **This is the code to extract.**
- **List route**: `GET produits` with `@Roles(direction, comptoir)`, `administration.controller.ts:128-133`. **Import route**: `@Roles(direction)` `POST produits/inventaire/import` at `:253-275`. Its Swagger text still says "500 data rows" (`:203`) after `d9f26cb` raised the cap to 2000.
- **Global `ValidationPipe`** strips undeclared fields and rejects unknown ones (`src/main.ts:130-139`, `whitelist` + `forbidNonWhitelisted`). Sending `page`/`taille` to an export DTO that does not declare them is a 400, so the frontend must strip them.
- **Binary download precedent**: the order PDF export, `src/commandes/commandes.controller.ts:50-64`. It uses `@Throttle({ moyen: 5/min, long: 60/h })` and returns `new StreamableFile(bytes, { type, disposition })`. Its date formatting uses `Africa/Douala` (`src/commandes/export/commande-pdf.service.ts:112`).
- **Importer parser**: `src/catalogue/stock-import.parser.ts`.
  - Header aliases are `product|produit`, `quantity|quantite`, `reason|motif` (`:64-66`). Headers are NFD-normalised, lowercased and matched exactly (`:96-101,113-116`). **Extra columns are ignored**, and `current_stock`, `name`, `brand`, `category` match no alias, so the export's columns import as they are. No parser change is needed for columns.
  - Fully blank rows are dropped (`:103,110`). A row with any content counts toward `IMPORT_MAX_LIGNES = 2000` (`:20,121`), which already satisfies "a blank-quantity row with other content counts toward the cap".
  - Cells are trimmed (`:125-131`), so a whitespace-only quantity arrives as `''`.
  - The CSV delimiter is auto-detected from the header, `;` or `,` (`:145-160`), and the BOM is stripped (`:163`).
  - XLSX is first-sheet, ≤ 10,000 sheet rows and ≤ 50 columns (`:22-23`). Numeric cells become `String(n)` (`:330-334`), so a numeric id cell round-trips as `"60066"`.
- **Importer service**: `src/catalogue/stock-import.service.ts`.
  - A blank quantity fails today as `quantite_invalide` through `lireQuantite` (`:375-383`), reached from `valider` (`:328-345`).
  - The duplicate check (`dejaVu`) runs **before** validation, both in preview (`:131-133`) and in the real run (`:255-259`). The resume path seeds `vus` from persisted rows (`:246`).
  - `ignore` currently means "zero delta in count mode" (`:363-364`, `:413`).
  - Counts are computed from `statut` (`:554-571`).
- **DB constraint**: `prisma/migrations/20261001090000_importations_stock/migration.sql:49` has `CHECK (("statut" = 'echec') = ("code_erreur" IS NOT NULL))`. **An `ignore` row cannot carry a `code_erreur`.** The blank-quantity reason must therefore not be stored in `code_erreur` (section 3.3).
- **XLSX writing**: `fflate` is already a dependency (`package.json:42`). The parser spec already builds a valid minimal OOXML workbook with `zipSync` and `t="inlineStr"` cells, and `read-excel-file` reads it (`src/catalogue/stock-import.parser.spec.ts:30-80`). The e2e spec does the same (`test/stock-import.e2e.spec.ts:7`).
- **Test infrastructure**: Jest, `*.spec.ts`. `test/stock-import.e2e.spec.ts` boots the real controller and services against a disposable PostgreSQL and skips itself when the database is unreachable.

### Frontend: this worktree

- **Filter source of truth**: `useProductListStore().filters`, `app/stores/product-list.ts:46-56`. It includes only the truthy fields (`categorie` is checked for presence), **plus `page` and `taille`**. The default `etat` is `"tous"` (`:37`). Quick-filter pills write `stock` + `etat` (`app/components/products/ListPanel.vue:36-42`). The toolbar writes `q`, `rayon`, `categorie`, `marque` and `tri` (`app/pages/products.vue:42-75`). The type is `ProductListQuery` (`app/types/api/produits.ts:136-146`).
- **Matching count, already loaded**: `products.vue:129` calls `useProduits(listFilters)` with the same query key as the list panel (`ListPanel.vue:56,60`). `listData.value?.pages[0]?.total` is the exact count for the active filters, at no extra cost. The full catalogue is 4,305 products (`ListPanel.vue:34`).
- **Page actions row**: `products.vue:184-205`. The "Adjust stock" trigger slot pattern is at `:187-194` (`ProductsStockImportDialog` with a `#trigger` slot and `PhUploadSimple`).
- **BFF**: `server/api/v1/[...path].ts`. The query string is forwarded verbatim (`:34`). GET sends no body (`:41`). `sendProxy` streams the upstream body and copies the response headers except `content-length`/`content-encoding` (h3). Download headers are proven to pass through by `test/unit/order-export-bff.test.ts:71-76`. CSRF protects only POST/PUT/PATCH/DELETE (`nuxt.config.ts:250`), so a GET download needs no token. The `/api/v1/**` limiter is 600 requests per 5 minutes (`nuxt.config.ts:266-268`).
- **Download precedent**: `app/components/orders/ExportDialog.vue:42-58` uses `$fetch` with `responseType: "blob"`, then `rehydrateExportError` (`app/utils/order-export.ts:16-25`) and `apiErrorText`. Saving the file is done by `downloadOrderExport` (`order-export.ts:28-35`). An identical copy of that body, string-based, is `downloadStockImportFile` (`app/utils/stock-import-files.ts:28-35`). This export would be the third copy, so T8 extracts it.
- **CSV neutralisation precedent**: `csvCell` (`stock-import-files.ts:7-10`) prefixes `'` on `^[=+\-@\t\r]`.
- **Import UI touched by fixed requirement 5**:
  - `StockImportResultRow.vue:13-19` labels every `ignore` as `noChange` ("Stock already at this quantity").
  - `StockImportPreview.vue:30,44` already hides Apply when `appliquees === 0`.
  - The error CSV only takes `statut === "echec"` rows (`stock-import-files.ts:24`).
  - The types are in `app/types/api/stock-import.ts:41-57`.
  - The mode picker (`NativeSelect` + `InfoTip`, labels `products.stockImport.modes.*`) is at `StockImportSetup.vue:52-58`.
  - The copy is in `i18n/locales/products/{en,fr}.json` under `products.stockImport`.
- **Filter labels**: `FilterBar.vue:22-44` resolves department, category and brand names through `useTaxonomie()`. The dialog's summary reuses the same composable and the existing `products.filterBar.*Label` and `products.quickFilters.*` keys.

## 3. Contracts

### 3.1 Export endpoint (new)

`GET /v1/catalogue/administration/produits/inventaire/export`. The browser calls it as `/api/v1/catalogue/administration/produits/inventaire/export`. It is `@Roles(Role.direction)`, with `@Throttle({ moyen: { limit: 5, ttl: 60_000 }, long: { limit: 60, ttl: 3_600_000 } })` copied from the PDF export. No other route matches this path: `produits/:id` has two segments, and the three-segment routes are `:id/inventaire` and `:id/couts`. A controller test pins this anyway.

**Query** (`ExporterStockDto extends FiltresProduitsDto`):

| Param | Rule | Source |
| :-- | :-- | :-- |
| `q`, `rayon`, `categorie`, `marque`, `stock`, `etat`, `tri` | exactly the list's validators and defaults (`etat` defaults to `actifs` server-side, `tri` to `recent`) | inherited from `FiltresProduitsDto` |
| `mode` | required, `reception` \| `count` (reuse `MODES_IMPORT`, `stock-import.dto.ts:14`) | new |
| `format` | required, `csv` \| `xlsx` | new |
| `page`, `taille` | **not declared**, so sending them is a 400 | deliberate |

**200 response**:

- `Content-Type: text/csv; charset=utf-8` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="stock-<mode>-<YYYY-MM-DD>-<HHmm>.<csv|xlsx>"`, for example `stock-count-2026-10-01-1430.xlsx`. The time is in `Africa/Douala`. The name is built only from the validated enum and digits, so it is pure ASCII and needs no escaping.
- `Cache-Control: no-store`
- The body is the full file, built in memory (section 7, R1). Zero matching rows returns a header-only file (still valid, still importable as "no rows").

**Errors**:

| Status | When | Body |
| :-- | :-- | :-- |
| 400 | DTO validation: bad or missing `mode`/`format`, an unknown param including `page`/`taille`, `q` > 120 | Nest default validation body (no `code_erreur`) |
| 400 | more than `EXPORT_MAX_LIGNES` (10,000) rows match | `{ statusCode: 400, error: "Bad Request", message, code_erreur: "export_trop_volumineux", maximum: 10000 }`. The shape is the import's `reponseHttp` (`stock-import.service.ts:69-74`). Nothing is generated. |
| 401 / 403 | no session / not `direction` | guard defaults |
| 429 | throttle | throttler default |

Ceiling detection is a single query with `limit EXPORT_MAX_LIGNES + 1`. If 10,001 rows come back, the request is refused, with no extra count query.

### 3.2 File columns

| Header | Value | Count | Reception |
| :-- | :-- | :-- | :-- |
| `product` | `p.id` (numeric; resolved by id first, `stock-import.service.ts:292-298`) | id | id |
| `name` | `p.nom` | text | text |
| `brand` | `p.marque`, `''` when null | text | text |
| `category` | primary category `c.nom`, `''` when null | text | text |
| `current_stock` | `coalesce(s.quantite, 0)`, for reference only (never read by the importer) | int | int |
| `quantity` | the editable cell | `current_stock` for active products, **empty for withdrawn (A2)** | **empty** |
| `reason` | always empty (the import dialog's default reason applies) | empty | empty |

Rows follow the list's `tri`.

**CSV encoding**: UTF-8 with BOM, `;` delimiter, CRLF line endings, and an RFC 4180 quote around any cell containing `;`, `"`, CR or LF (`"` is doubled).

Why `;`: the operators are French-speaking, and Excel in a fr-FR regional setting splits CSV on `;` only, so a comma file opens as one column. The importer auto-detects either delimiter. Every number is an integer, so there is no decimal-comma clash. XLSX is the locale-independent choice offered next to it. A `sep=;` first line is rejected because the importer would read it as the header (`colonnes_manquantes`), and Excel then ignores the BOM.

**Formula neutralisation (security)**: in **text columns only** (`name`, `brand`, `category`), a value starting with `=`, `+`, `-`, `@`, TAB or CR gets a leading `'`. The rule is the same as `csvCell` (`stock-import-files.ts:8`). The numeric columns hold non-negative integers written as digits, so they can never start with one of those characters and are never altered. This keeps `product` and `quantity` byte-exact for the round trip.

**XLSX encoding**: one sheet named `Stock`. Text cells are `t="inlineStr"`, numbers are `<v>`, and empty cells are omitted. A `<dimension>` element is present. The XML text is escaped, and characters that are invalid in XML 1.0 (C0 controls other than TAB, LF and CR) are stripped, because otherwise Excel refuses the workbook. There are no `<f>` elements, so a text cell is never evaluated as a formula and no prefix is applied.

**Count file** (CSV, BOM not shown):

```
product;name;brand;category;current_stock;quantity;reason
60066;Onduleur APC BV1000I 1000VA;APC;Onduleurs;12;12;
51210;'=Câble HDMI 2 m;;Câbles;0;0;
1000000004;"Clé USB 64 Go; noire";SanDisk;Stockage;3;;
```

The last row is a withdrawn product, with its `quantity` left empty (A2).

**Reception file**:

```
product;name;brand;category;current_stock;quantity;reason
60066;Onduleur APC BV1000I 1000VA;APC;Onduleurs;12;;
51210;'=Câble HDMI 2 m;;Câbles;0;;
```

### 3.3 Import change: blank quantity means "not touched"

- **Rule**: after parsing, a row whose trimmed `quantite === ''` gets `statut: "ignore"`. This is checked **before** the duplicate check and before any other validation, in both `apercu` (`stock-import.service.ts:131`) and `executer` (`:255`). The product is still resolved, so `produit_id`/`produit_nom` are shown when known. `variation`, `stock_avant`, `stock_apres`, `code_erreur` and `message` are all `null`. No movement is written.
- **Duplicates**: a blank row **does not** register its product in `vus`, so a later filled row for the same product is not called a duplicate. On resume, the `vus` seed (`:246`) excludes persisted rows whose `quantiteSaisie === ''`.
- **Reason, without a migration**: `code_erreur` stays null for `ignore`, as the CHECK at `migration.sql:49` requires. A new response-only field is derived on every line, in `resultat()` (`:515-530`) and `reponse()` (`:537-550`):

  ```ts
  // stock-import.dto.ts, on LigneResultatImport
  raison_ignore: "quantite_vide" | "aucun_ecart" | null
  // "quantite_vide": statut === "ignore" && quantite_saisie === ""
  // "aucun_ecart":   statut === "ignore" otherwise (count target equal to current stock)
  // null:            statut !== "ignore"
  ```

  This field is derived from columns that are already stored, so imports persisted before this change replay correctly as `aucun_ecart`. `statut` gets no new value.
- **Counts**: blank rows count in `total_lignes` and `ignorees`, never in `appliquees`/`echouees`. A file that is entirely blank produces `appliquees: 0`, and the preview already hides Apply in that case (`StockImportPreview.vue:30,44`).
- **Cap**: unchanged. Blank-quantity rows with any other content count toward 2000 (parser `:110,121`). Fully blank rows are still dropped.
- **Error CSV**: unchanged, and blank rows are excluded automatically because it filters on `echec` (`stock-import-files.ts:24`).
- **Idempotency hash**: unchanged (`:170-172`). The blank cell is already part of the hashed row.
- **Frontend type**: `LigneResultatImport.raison_ignore`, with a citation, in `app/types/api/stock-import.ts`.

## 4. Safety ceiling

`EXPORT_MAX_LIGNES = 10_000`, about 2.3 times today's 4,305-product catalogue. That is room for growth, but it keeps one request bounded:

- about 1.5 MB CSV and a few MB of uncompressed XLSX XML held in memory;
- one query without image subqueries;
- under the typical 4.5 MB serverless response cap if the BFF runs on Vercel (`server/utils/proxy-headers.ts:5-6` mentions Vercel IPs).

The frontend mirrors the constant with a citation.

**What the user sees at the ceiling**: if the known matching count is above 10,000, the dialog shows a destructive-tone notice ("More than 10,000 products match. Narrow the filters to export.") and Export is disabled. If the count is unknown or stale, and the backend answers `export_trop_volumineux`, the same translated message appears inline and the dialog stays open.

## 5. Tasks

Each task runs red then green: the failing spec comes first, then the minimum code to pass it. Backend specs use Jest (`pnpm test -- <file>`), frontend specs use Vitest (`bunx vitest run <file>`).

### Phase A: backend export

**T1. Shared filter: one DTO and one builder.**
Files: `src/catalogue/administration.dto.ts`, `src/catalogue/administration.service.ts`, `src/catalogue/administration.service.spec.ts`.
- What: Split `ListerProduitsDto` into `FiltresProduitsDto` (`q`, `rayon`, `categorie`, `marque`, `stock`, `etat`, `tri`, with the validators unchanged) and `ListerProduitsDto extends FiltresProduitsDto` (adds `page`, `taille`, the cap comment stays). Extract `listerProduits`' WHERE and ORDER BY construction (`:168-218`) into one exported pure function, for example `construireFiltreProduits(filtres: FiltresProduitsDto): { ou: string; valeurs: unknown[]; tri: string }`, in `administration.service.ts` or a new `src/catalogue/filtre-produits.ts`. `listerProduits` calls it. Its SQL and output stay byte-identical.
- Done when: a new spec pins the builder's `ou`/`valeurs`/`tri` for a matrix covering every field, including `categorie` with its double placeholder, `etat` default/`retires`/`tous`, each `stock` value and each `tri`. The existing `listerProduits` specs pass unchanged.

**T2. CSV writer.**
Files: `src/catalogue/stock-export.csv.ts`, `src/catalogue/stock-export.csv.spec.ts`.
- What: A pure `ecrireCsv(entetes: string[], lignes: CelluleExport[][]): Buffer`, where `CelluleExport = string | number | null`, following section 3.2. Neutralisation applies to `string` cells only. Numbers are written as digits and null is written as empty.
- Done when: the specs cover BOM, `;`, CRLF and quoting of `;`/`"`/newline. **Injection**: `=`, `+`, `-`, `@`, TAB and CR leading text cells are each prefixed with `'`, and a number is never prefixed. The output parses through the real `lireFichierImport` (`stock-import.parser.ts:72`) with `produit`/`quantite` exact and the delimiter detected as `;`.

**T3. XLSX writer (hand-built OOXML on `fflate`).**
Files: `src/catalogue/stock-export.xlsx.ts`, `src/catalogue/stock-export.xlsx.spec.ts`.
- What: A pure `ecrireXlsx(entetes, lignes, nomFeuille = "Stock"): Buffer` using `zipSync`. It writes the five parts already proven in `stock-import.parser.spec.ts:48-80` (`[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/worksheets/sheet1.xml`), with inline strings, numeric `<v>`, omitted empty cells, `<dimension>`, XML escaping and invalid-character stripping. No new dependency.
- Done when: the output passes `lireFichierImport` (including `inspecterClasseur`) with exact `produit`/`quantite`. A name `=1+1` reads back as the literal text, and the sheet XML contains no `<f>`. A name containing `\u0001` is stripped and `&<>"` survive the round trip. `<dimension>` equals the written range.

**T4. Export service and endpoint.**
Files: `src/catalogue/stock-export.dto.ts`, `src/catalogue/stock-export.service.ts`, `src/catalogue/administration.controller.ts`, `src/catalogue/catalogue.module.ts`, `src/catalogue/stock-export.service.spec.ts`, `src/catalogue/stock-export.controller.spec.ts`.
- What:
  - `ExporterStockDto extends FiltresProduitsDto` adds `mode` (`MODES_IMPORT`) and `format` (`csv|xlsx`), and defines `EXPORT_MAX_LIGNES = 10_000`.
  - The service runs one query using `construireFiltreProduits` and selects `p.id`, `p.nom`, `p.marque`, `c.nom`, `coalesce(s.quantite,0)::int` and `p.retire_le`, with the same joins as `:233-235`, no image subqueries, and `limit EXPORT_MAX_LIGNES + 1`. It refuses with `export_trop_volumineux` above the ceiling, builds the grid per section 3.2 (including A2), and returns `{ octets, typeMime, nomFichier }`.
  - The controller route follows section 3.1 (`@Roles(direction)`, `@Throttle`, `@Header('Cache-Control', 'no-store')`, `StreamableFile` with `type` + `disposition`) and Swagger docs that state the shared filters, the ceiling and that the file is an import template.
- Done when:
  - The **service specs** cover: Count pre-fill equals `current_stock`; Reception leaves `quantity` empty; a withdrawn product has an empty quantity in Count; a product without a stock row shows 0; row order follows `tri`; `limit` is 10,001 and 10,001 rows produce the 400 code; the filename matches `^stock-(count|reception)-\d{4}-\d{2}-\d{2}-\d{4}\.(csv|xlsx)$` in Douala time.
  - The **controller specs** cover: `direction` metadata only (403 for `comptoir`); content type, disposition and `no-store` headers; `page`/`taille`/unknown params rejected with 400; and `GET produits/inventaire/export` not captured by `produits/:id`.

### Phase B: backend import change

**T5. Blank quantity is "not touched".**
Files: `src/catalogue/stock-import.service.ts`, `src/catalogue/stock-import.dto.ts`, `src/catalogue/administration.controller.ts` (Swagger text only), `src/catalogue/administration.inventaire.spec.ts` (or the existing stock-import service spec), `test/stock-import.integration.spec.ts`.
- What: Section 3.3 exactly. Add `RaisonIgnore` and `raison_ignore` to `LigneResultatImport`, derived in `resultat()`/`reponse()`. Add the blank check before `dejaVu` in both paths, exclude blank rows from `vus`, and exclude them from the resume seed. In the import route description (`:201-222`), document blank-quantity rows and fix the stale "500 data rows" to 2000.
- Done when the specs cover, for **both modes and both preview and real run**:
  - a blank quantity gives `ignore` + `quantite_vide`, no movement, and counts in `ignorees`;
  - a zero-delta count gives `aucun_ecart`;
  - a blank row followed by a filled row for the same product: the filled row applies and is **not** `produit_en_double`;
  - a blank row for an unknown or withdrawn product is `ignore`, not `produit_introuvable`;
  - a whitespace-only quantity is treated as blank;
  - a 2000-row file of blank quantities is accepted, and 2001 rows are still `trop_de_lignes`;
  - an interrupted run resumed with the same key gives the same outcome;
  - the integration spec on the real DB proves the persisted `ignore` row satisfies the CHECK constraint.

### Phase C: backend round trip

**T6. Export, then importer, then preview, against a real database.**
Files: `test/stock-export.e2e.spec.ts` (same disposable-DB harness and skip rule as `test/stock-import.e2e.spec.ts`).
- What: Seed active and withdrawn products, with and without stock rows. Over HTTP (supertest), `GET` the export for each `mode` × `format`, then `POST` the received bytes unchanged to the import with `apercu=true`.
- Done when:
  - An untouched **Count** file gives every active row as `ignore`/`aucun_ecart` and every withdrawn row as `ignore`/`quantite_vide`, with `appliquees: 0`, `echouees: 0`.
  - An untouched **Reception** file gives every row as `ignore`/`quantite_vide`.
  - Editing one `quantity` cell gives exactly one `applique` with the expected `variation`.
  - **Filter parity**: for a filter matrix, the exported `product` ids equal the ids returned by paging `GET produits` with the same params, `taille=200`, over all pages, in the same order.
  - A name with `=` survives without breaking resolution.

### Phase D: frontend

**T7. Types and pure helpers.**
Files: `app/types/api/stock-export.ts`, `app/types/api/stock-import.ts`, `app/utils/stock-export.ts`, `test/unit/stock-export.test.ts`.
- What:
  - Types `FormatExportStock` and `CodeErreurExport`, and `raison_ignore` on `LigneResultatImport`. Each has a backend file:line citation, per AGENTS.md.
  - `STOCK_EXPORT_MAX_ROWS = 10_000`, with a citation.
  - `stockExportUrl(filters: ProductListQuery, mode, format)`: it drops `page`/`taille`, keeps only defined values (`categorie: 0` kept, as in `product-list.ts:19-21`), and appends `mode` and `format`.
  - `filenameFromDisposition(header: string | null, fallback: string)`.
  - `describeExportFilters(filters, taxonomy)`, which returns label-key/value pairs for the summary line. It excludes `tri` (sort is not a filter) and maps `stock`/`etat` to the quick-filter keys.
- Done when the unit specs cover: page/taille stripped; the params equal the list query minus page/taille for every filter field (this is the parity guard); encoding of `q`; `categorie: 0` kept; filename parsing (quoted, unquoted, missing, which falls back); and the summary for default, `retires` and fully filtered states.

**T8. One download helper.**
Files: `app/utils/download-file.ts`, `app/utils/order-export.ts`, `app/utils/stock-import-files.ts`, `test/unit/order-export.test.ts`, `test/unit/stock-import-files.test.ts`.
- What: Add `downloadBlob(blob, filename)`, a single copy of `order-export.ts:28-35`. `downloadOrderExport` and `downloadStockImportFile` delegate to it, and their signatures do not change.
- Done when: the existing order-export and stock-import-files specs pass unchanged, and no second copy of the create, click, revoke sequence remains.

**T9. `useStockExport` composable.**
Files: `app/composables/useStockExport.ts`, `test/nuxt/stock-export-run.test.ts`.
- What: It exposes `pending`, `error` and `exporter({ filters, mode, format })`. It calls `$fetch.raw<Blob>(stockExportUrl(...), { responseType: "blob" })` directly, the same way `ExportDialog.vue:48` uses `$fetch`. It takes the filename from `Content-Disposition`, with the fallback `stock-<mode>.<format>`, and saves with `downloadBlob`. On error it uses `rehydrateExportError`, then maps `code_erreur: export_trop_volumineux` to the translated ceiling copy, and everything else to `apiErrorText`. It ignores calls while pending. It does not retry.
- Done when the specs cover: exactly one GET to `/api/v1/catalogue/administration/produits/inventaire/export` with the expected query; the filename taken from the header; the ceiling code mapped; the Blob-wrapped JSON error surfaced; and no second request while pending.

**T10. Dialog, page wiring and copy.**
Files: `app/components/products/StockExportDialog.vue`, `app/pages/products.vue`, `i18n/locales/products/en.json`, `i18n/locales/products/fr.json`, `test/nuxt/stock-export-dialog.test.ts`, `test/nuxt/stock-import-page.test.ts`.
- What:
  - **Page wiring**: `ProductsStockExportDialog` has a `#trigger` slot, like the import. Its trigger is an outline `Button` with `PhDownloadSimple` and the label "Export", placed before "Adjust stock" inside the `canCreate` block (`products.vue:186`). The page passes `filters` (the store's) and `total` (`listData.value?.pages[0]?.total ?? null`, from `products.vue:129`).
  - **Dialog fields**: `Dialog` from `@/components/ui/dialog`. The mode is a `NativeSelect` + `InfoTip` reusing `products.stockImport.modes.*`, with new per-mode hints. Count: "Quantity is pre-filled with the current stock; change only what you counted." Reception: "Quantity is empty; fill in only what you received." The format is a `NativeSelect` defaulting to XLSX.
  - **Dialog summary lines**: the filters line comes from `describeExportFilters`, with names from `useTaxonomie()`. When nothing is filtered it reads "All products". The count line reads "{n} products".
  - **Dialog notices** use semantic tokens and Phosphor icons: the over-2000 split warning, the ceiling block, a withdrawn note when `etat !== "actifs"`, and a Count-mode staleness note ("Import soon after exporting: sales made in between would be undone by a count").
  - **Footer**: Cancel, and Export with a `Spinner`. A success toast is shown.
  - **Copy**: all EN/FR copy goes under `products.stockExport.*`, with no text arrows.
- Done when:
  - the specs cover every state in section 6;
  - the trigger renders for `direction` and not for `comptoir`;
  - Export sends the store's filters (after a quick-filter pill and a toolbar change) without `page`/`taille`;
  - `bun run i18n:check` passes.

**T11. Import UI for blank rows.**
Files: `app/components/products/StockImportResultRow.vue`, `app/components/products/StockImportSetup.vue`, `i18n/locales/products/{en,fr}.json`, `test/nuxt/stock-import-views.test.ts`.
- What: The headline for `ignore` uses `raison_ignore`. `quantite_vide` shows a new key `products.stockImport.notTouched` ("Quantity left empty, not changed" / "Quantité vide, non modifiée"). `aucun_ecart` and `null` keep `noChange`. Add one hint line to the setup: "Rows with an empty quantity are skipped."
- Done when the view specs show both headlines in preview and result, the counts badges are unchanged, the error CSV still excludes `ignore` rows, and `i18n:check` passes.

### Phase E: verification

**T12. Cross-repo and operational checks.**
- Backend: the focused Jest suites from T1-T6, then `pnpm build`.
- Frontend: `bunx vitest run`, `bun run typecheck`, `bun run lint`, `bun run i18n:check`, `oxfmt --check` on the touched files, `bun run fallow`, `git diff --check`.
- Manual, authenticated, EN and FR:
  - export the full catalogue (4,305 rows) in both formats through the **deployed** BFF and record the time and size (R5);
  - open the XLSX in Excel, LibreOffice and Google Sheets, and the CSV in Excel-fr, checking columns split correctly and accents are intact;
  - re-import an untouched Count file: the preview shows only "No change" or "Quantity left empty" rows;
  - re-import an edited Reception file: one row applies.
- Done when all of the above pass, and the results go in `walkthroughs/YYYY-MM-DD-stock-export.md`.

## 6. UI states and failure behaviour (export dialog)

| State | What the user sees |
| :-- | :-- |
| Count unknown (list loading or errored) | The filter summary shows; the count line is hidden; Export is enabled (the backend is authoritative). |
| No matches (`total === 0`) | Inline notice "No products match the current filters"; Export is disabled. |
| 1-2000 | Count line only. |
| 2001-10,000 | Warning: "{n} products: the import accepts 2,000 rows per file, so split the file before importing." Export is enabled. |
| > 10,000 (known count or backend `export_trop_volumineux`) | Destructive notice: "More than 10,000 products match. Narrow the filters to export." Export is disabled, or the error is shown inline. |
| `etat` is `tous` or `retires` | Note: "Withdrawn products are included with an empty quantity; the import skips them." |
| Pending | Spinner on Export, controls disabled, the dialog cannot be dismissed. A GET has no side effects, but this avoids duplicate downloads. |
| Request error (network, 5xx, 429, 403) | Inline `role="alert"` text from `apiErrorText` (after rehydrating the Blob body). The dialog stays open, and Export can be pressed again. |
| Success | The file downloads, the dialog closes, and a toast reads "Export downloaded". |

## 7. Risks and open questions

| # | Risk / question | Options | Recommendation / earliest check |
| :-- | :-- | :-- | :-- |
| R1 | Memory and streaming for large exports | Build in memory, or stream rows (a DB cursor plus a CSV stream; XLSX would need a streaming zip) | Build in memory. 10,000 rows is a few MB, and `zipSync` needs the whole sheet anyway. Revisit only if the ceiling is raised. T4 asserts the limit. |
| R2 | XLSX writer choice | (a) hand-built OOXML on the existing `fflate`; (b) `write-excel-file` (same author as the reader, maintained); (c) `exceljs` (heavy, broad); (d) SheetJS (the npm release is stale) | **(a)**: no new dependency, and the format is already proven readable by our own parser (`parser.spec.ts:30-80`). It is about 60 lines for one sheet with no styles. Its risk is Excel strictness, checked in T12 by opening the file in three apps. Fall back to (b) if Excel rejects it. |
| R3 | Filter parity drift between list and export | Duplicate the WHERE clause, or share it | Share both the DTO (T1) and the builder (T1). The frontend sends the store's own object minus `page`/`taille` (T7). The guards are the T6 id-parity e2e and the T7 param-parity unit spec. A new list filter added to `FiltresProduitsDto` reaches the export automatically. |
| R4 | **Stock goes stale between export and import (Count).** A pre-filled count re-imported after sales resets stock to the exported value, which silently undoes those sales. | (a) warn, date the filename, and rely on the preview's `stock_avant` → `stock_apres` column; (b) the importer reads `current_stock` and flags rows where the live stock differs (new scope) | Do (a) now: the dialog note, the time in the filename, and the preview, which already shows the variation before Apply. (b) is out of scope here (A5) and planned in `plans/2026-10-01-stock-drift-detection.md`. Reception is unaffected, because its quantities start empty. |
| R5 | Large-catalogue timing and size through the deployed proxy | — | One query with no image subqueries, about 4,305 rows. The import's 2000-row run took about 7.3 s locally (`d9f26cb`), and this is lighter. Measure in T12 through the deployed BFF. If the BFF is a serverless function, confirm its response-size and duration limits (about 4.5 MB is typical) against the 10,000-row worst case. If they are exceeded, lower the ceiling rather than adding streaming. |
| R6 | Preview of a 2000-row file where most rows are blank | — | Functionally correct (they are counted as skipped). The preview table lists every row. Out of scope here; note it for UX follow-up if operators complain. |
| Q1 | Withdrawn products in Count files | Empty quantity (A2); pre-fill and let the import fail them; or exclude withdrawn products from every export regardless of the filter | **Empty quantity.** It respects fixed requirement 1 and keeps previews free of failures. |
| Q2 | Should the importer detect stale counts (R4b)? | Yes, as a follow-up plan; or no | **Resolved (user, 2026-10-01): yes, as a separate follow-up**, `plans/2026-10-01-stock-drift-detection.md`. Not in this scope. |
| Q3 | Header language | Fixed English (A3); or per-UI-locale (`produit;nom;marque;categorie;stock_actuel;quantite;motif`) | **Fixed English.** It matches the template and keeps one file shape. Both forms would import. |
| Q4 | CSV delimiter | `;` (section 3.2); or `,` like the template and error CSV | **`;`**, for Excel-fr. The template and error CSV stay as they are (out of scope). |
| Q5 | Ceiling value | 10,000 (section 4); or another value | **10,000.** Lower it if R5 measures a proxy limit. |

## 8. Out of scope

- Changing the import template, the error CSV delimiter, or the import header aliases.
- Translated or per-locale headers (Q3).
- Cell locking or protection for `current_stock`, styles, and column widths in the XLSX.
- Streaming exports, background jobs, and emailed files.
- Splitting the export into 2000-row files automatically. The user splits them; the dialog warns.
- Exporting the price, cost, image, or other columns; any non-stock export.
- Stale-count drift detection in the importer (Q2, A5). It is tracked in `plans/2026-10-01-stock-drift-detection.md`.
- `comptoir` access (A1, confirmed direction-only).
- Changes to the products filter bar, the quick filters, or the list query semantics beyond the T1 extraction.
