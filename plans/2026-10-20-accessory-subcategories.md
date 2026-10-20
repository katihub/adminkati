# Implementation Plan — Sous-catégories d’accessoires et suggestions d’achat

## 1. What the mockup shows

The screenshot shows the existing Operations → Marketplace categories administration screen: category groups and their subcategories, with counts/metadata and per-row management controls. The request is to extend that hierarchy by one level so a subcategory such as “Ordinateurs portables” can contain an accessory category, and to use that relationship for optional cross-sells on product and checkout pages. Keep the existing screen and management affordances; do not redesign unrelated admin navigation or category metadata.

### Structure
- **M1** — Global admin navigation at the top; “Catalogue” is selected.
- **M2** — “Operations” workspace with a horizontal operations-tab row; “Marketplace categories” is selected.
- **M3** — Category search field beneath the tabs; a “+ New” action is aligned on the right.
- **M4** — Vertically scrolling list grouped by root category (“Informatique”, then “Électroménager”). Each group has a summary row followed by indented subcategory rows.
- **M5** — Existing root-row actions include “+ Sub-category”, Edit, Deactivate, and Delete. Existing child rows have Edit, Deactivate, and Delete.

### Components and content
- **M6** — Root category name, minimum warranty, product count, subcategory count, and variant attributes.
- **M7** — Subcategory name, minimum warranty, product count, and variant attributes.
- **M8** — The Informatique group includes examples “Ordinateurs portables”, “Ordinateurs de bureau”, “Imprimantes et scanners”, “Réseau et Wi‑Fi”, “Stockage”, “Accessoires informatiques”, and “Bureautique et caisse”. This illustrates why a more specific accessory branch may be useful; sample data is not a requirement.

### Typography, colour, spacing, states
- **M9** — Compact neutral admin styling: white/light gray surfaces, fine separators, dark text, small secondary metadata, orange active navigation/action accents. No new visual tokens are needed.
- The image shows a populated/default state only. Loading, empty, error, inactive, mutation-pending, confirmation, and narrow-screen states are not shown; existing states should remain and the deeper node must work within them.

### Interaction and responsive
- **M10** — Search and category CRUD actions are visible. No interaction is shown for expanding/collapsing rows or cross-sell selection.
- Only a desktop screenshot is supplied; mobile behavior is unspecified. Reuse the current responsive wrapping/scrolling patterns rather than redesigning the page.

The mockup’s intent is to manage a marketplace taxonomy from the Operations workspace. The feature should add one explicitly identifiable accessory branch under an existing leaf category. That branch then drives relevant product suggestions in the storefront without automatically changing the customer’s cart.

## 2. What the requirement asks for

- **R1 (explicit)** — Allow a category administrator to create an additional child under an existing subcategory: Rayon → Sous-catégorie → Accessoires Xx.
- **R2 (explicit)** — Let the category structure identify the accessory branch so products in its parent subcategory can find the relevant accessories.
- **R3 (explicit)** — Suggest relevant accessories on the product detail page.
- **R4 (explicit)** — Suggest relevant accessories on the order/checkout page.
- **R5 (explicit)** — Suggestions are optional; never add an accessory to the cart or order without the customer’s explicit action.
- **R6* (implied)** — Continue to support existing two-level categories and products, category administration, localized admin labels, and existing product placement/validation.
- **R7* (implied)** — Recommendations must be active, purchasable offers and must not include the current product itself; gracefully omit the section when none are available or loading fails.
- **R8* (implied)** — Checkout suggestions must be based on items actually in the cart and avoid suggesting accessories already in the cart.

## 3. Mapping

| ID | Element | Requirement | Verdict | Note |
| :-- | :-- | :-- | :-- | :-- |
| M1 | Admin global navigation | — | MOCKUP-ONLY | Existing structural shell; preserve, no feature changes. |
| M2 | Operations tabs | R1 | MATCH | Keep the current marketplace categories workspace as the admin entry point. |
| M3 | Search and root “New” action | R1 | PARTIAL | Preserve search/root creation; search must include the third level and a child-creation affordance must be added to subcategory rows. |
| M4 | Root/subcategory list hierarchy | R1 | MATCH | Extend the displayed tree with a visibly indented third level. |
| M5 | Existing CRUD actions | R1 | PARTIAL | Preserve existing controls; add create/edit/activate/deactivate/delete behavior for a third-level accessory node, respecting deletion constraints. |
| M6 | Root metadata | — | MOCKUP-ONLY | Preserve existing warranty/product/attribute information; no unrelated data changes requested. |
| M7 | Subcategory metadata | R1, R2 | PARTIAL | Preserve metadata and show accessory designation/children count as useful context. |
| M8 | Example taxonomy labels | R1 | MATCH | “Ordinateurs portables → Accessoires pour ordinateurs portables” is a representative case only, not hard-coded content. |
| M9 | Existing visual style | R1 | MATCH | Reuse current neutral cards, indentation, orange action accent and spacing. |
| M10 | Existing management interactions | R1 | PARTIAL | Extend category CRUD; product and checkout suggestions are not represented in the screenshot. |
| — | Accessory suggestions on product page | R3, R5, R7 | REQUIREMENT-ONLY | Reuse existing product detail layout and offer card patterns; propose an “Accessoires compatibles” section. |
| — | Accessory suggestions at checkout | R4, R5, R8 | REQUIREMENT-ONLY | Reuse the current checkout/cart recommendation area and offer card patterns; scope suggestions to checked cart items. |
| — | Explicit accessory marker/association | R2 | REQUIREMENT-ONLY | Not designed or represented by current category data; choose an explicit backend contract before implementation. |

## 4. Cut from the mockup

No visible structural element is removed. Keep global navigation, workspace tabs, search, root category creation, warranty/attributes metadata, and existing category controls unchanged except for supporting the new node level. The sample list contents are illustrative and must not be seeded or hard-coded as feature behavior.

## 5. Gaps — required but not designed

- **Admin creation flow:** Current screen has a “+ Sub-category” action only on root rows. Proposal: add “+ Accessory subcategory” (or localized equivalent) to a subcategory row; reuse the existing category dialog and validation, with the selected subcategory as parent. Show the third level in the same tree and allow edit/activation/deactivation. Do not add a separate accessory-management screen.
- **Recommendation UI on product detail:** Proposal: add a titled “Accessoires compatibles” offer strip near the existing product recommendations, using relevant category offers and clear price/availability. Preserve the current “À découvrir dans cette boutique” section; it is shop-based, not category compatibility.
- **Recommendation UI at checkout:** Proposal: add a compact “Complétez votre commande” section for checked cart products, de-duplicated by offer/product and excluding products already selected. The customer must click an explicit add action; no cart mutation on render or selection alone.
- **Unshown states:** retain loading, empty, API error, inactive accessory category, unavailable/out-of-stock accessory offers, existing cart duplicate, add-to-cart pending/success/error, responsive overflow, and keyboard/screen-reader labels. Hide or explain an empty recommendation area rather than rendering an error-like blank block.

## 6. Build plan

### Phase 1 — Confirm taxonomy and recommendation contract
- [ ] **Task** — Define whether a third-level node is explicitly typed as an accessory category, or whether accessories are linked to a parent category by a dedicated relation. Do not rely on a category name prefix such as “Accessoires”. Confirm how a product’s terminal category identifies eligible accessory offers.
  - Files: `BackendKati/prisma/schema.prisma`, `BackendKati/src/marketplace/categories/categories.service.ts`, `BackendKati/src/marketplace/offres.service.ts`, `websitekati/src/lib/marketplace-data.ts`
  - Reuses: existing self-referential `CategorieMarketplace.parentId`, existing marketplace product category relation, and offers API.
  - Serves: R1–R4
  - Done when: the source category → accessory category → active offers mapping is specified and can be queried without guessing; API response and backward compatibility are documented.

### Phase 2 — Extend backend hierarchy and public contracts
- [ ] **Task** — Remove the two-level creation restriction and update category serialization/queries to return the required tree depth. Keep product assignment restricted to eligible terminal categories and calculate inherited warranty/variant attributes through all ancestors. Add a safe public recommendation query/response for active accessory offers, excluding the current product and unavailable/invalid offers; add migrations only if Phase 1 selects an explicit accessory marker/relation.
  - Files: `BackendKati/src/marketplace/categories/categories.service.ts`, `BackendKati/src/marketplace/categories/categories.dto.ts`, `BackendKati/src/marketplace/categories/categories.service.spec.ts`, `BackendKati/src/marketplace/offres.service.ts`, `BackendKati/src/marketplace/offres.controller.ts`, relevant Prisma schema/migration and marketplace tests.
  - Reuses: existing authenticated direction-only category mutations, public category endpoint, offer filtering/serialization, audit journal, and validation DTOs.
  - Serves: R1, R2, R3, R4, R6*, R7*
  - Done when: tests prove valid three-level creation/listing, refusal of invalid/deeper hierarchy if the chosen contract caps depth, active-parent and leaf assignment rules, inherited fields, recommendation exclusions, and unchanged two-level API behavior.

### Phase 3 — Manage third-level accessory nodes in admin
- [ ] **Task** — Generalize the category types and workspace tree/forms to render/search and manage third-level nodes; offer child creation from a subcategory row and show whether a child is designated for accessories. Preserve the existing category form, CRUD controls, async states, and i18n.
  - Files: `adminkati/app/types/api/marketplace-categories.ts`, `adminkati/app/components/operations/MarketplaceCategoriesWorkspace.vue`, `adminkati/app/composables/useMarketplaceCategories.ts`, `adminkati/i18n/locales/operations/fr.json`, `adminkati/i18n/locales/operations/en.json`, related `adminkati/test/nuxt/*marketplace-categories*` tests.
  - Reuses: existing TanStack Query hooks, `useToastAction`, category dialog, `ApiErrorCard`, `EmptyStateCard`, and operations translations.
  - Serves: R1, R2, R6*
  - Done when: an admin can create, search, edit, activate/deactivate and safely delete an accessory child; all three levels render with clear indentation and the existing two-level workflows still pass in both locales.

### Phase 4 — Suggest accessories on product and checkout pages
- [ ] **Task** — Hydrate compatible accessory offers for the product’s category and checked cart products; render optional accessory cards on the product detail and checkout pages. Add an explicit add-to-cart action that uses existing cart validation/line keys and never adds anything automatically.
  - Files: `websitekati/src/app/marketplace/produits/[slug]/page.tsx`, `websitekati/src/components/marketplace/MarketplaceProductDetail.tsx`, `websitekati/src/components/marketplace/checkout/MarketplaceCheckout.tsx`, `websitekati/src/components/marketplace/checkout/MarketplaceCart.tsx` only if the checkout route should include the cart screen, relevant `*.module.css`, and `websitekati/src/lib/marketplace-data.ts`.
  - Reuses: `selectShopRecommendations` only for existing shop-based suggestions (do not conflate it with compatibility), `useCart`, `cartLineKey`, `CatalogueProductCard` visual/offer rules, `useCheckedCart`, and existing product recommendation layout.
  - Serves: R3–R5, R7*, R8*
  - Done when: product detail suggests only accessories mapped to the product’s category; checkout suggestions derive from checked products and exclude selected/already-present offers; clicking explicit add updates cart once, while loading/failure/empty states do not block ordering.

## 7. Data contracts

- **Existing backend model:** `BackendKati/prisma/schema.prisma` defines `CategorieMarketplace` with self-relation `parentId`, `parent`, `sousCategories`; there is no structural database depth cap. `CategoriesService.creer()` currently rejects a parent that itself has a parent, and public/admin tree builders load only root plus one child. Product category is `ProduitMarketplace.categorieId`.
- **Existing admin endpoints:** `GET /v1/marketplace/categories/administration`, `POST /v1/marketplace/categories` with `{ nom, parentId?, garantie?, ordre?, attributsVariante? }`, `PATCH /v1/marketplace/categories/:id`, and `DELETE /v1/marketplace/categories/:id`. Access is direction-only. Admin API types currently hard-code `MarketplaceCategory.sousCategories: MarketplaceSubcategory[]`.
- **Existing public contracts:** `GET /v1/marketplace/categories` returns roots and one level; `GET /v1/marketplace/produits/:slug` returns `categorieDetail` with one parent; `GET /v1/marketplace/offres` accepts catalogue filters and returns offer pages. No accessory marker, category-to-accessory association, or accessory recommendation endpoint was found.
- **Required proposal:** Preserve the `parentId` tree and add an explicit semantic designation for accessory nodes (recommended over inferring from “Accessoires” in the display name). Provide a public bounded recommendation contract keyed by a product category ID (and optionally a set of cart category IDs), returning compatible accessory offers with the fields needed by existing offer cards. Decide whether designation is a boolean/type on the category or a relation from source category to accessory category before migrations/API implementation.
- **Website contract today:** `websitekati/src/lib/marketplace-data.ts` exposes `CategorieArbre` with only `sousCategories`; `MarketplaceProduct` in `websitekati/src/app/marketplace/apercu/MarketplacePreview.tsx` has `categorieDetail` with one parent. `MarketplaceCheckout` loads checked offers using `useCheckedCart`; it already has shop-related recommendations in `MarketplaceCart`, but no category compatibility contract.

## 8. Test plan

- Backend unit/service tests: create and list third-level nodes, reject invalid parent/depth and cycles as applicable; verify terminal-only product assignment and inherited warranty/attributes; verify accessory query filters inactive categories/offers, excludes source product, and returns a bounded result; retain two-level compatibility.
- Admin component tests: third-level rendering/indentation, search matching a child while retaining ancestors, create child under correct subcategory, edit/status/delete constraints, localized accessible labels, and loading/error/empty states.
- Website tests: correct recommendations for one product and multi-product checkout, no self/accessory duplicates, no recommendations when none are eligible, no cart mutation until explicit add, exactly one add when clicked, and checkout remains usable if recommendation fetch fails.
- Run relevant repo quality gates separately for backend, admin, and website; do not treat the admin typecheck as coverage for backend or storefront behavior.

## 9. Risks

- **Semantic association is the blocking risk.** A name like “Accessoires ordinateur portable” cannot safely indicate which parent products it complements. Surface the marker/relation decision in Phase 1 before changing category storage.
- **Depth assumptions are spread beyond category admin.** Product seller forms, category menus/pages, warranty/variant inheritance, and product DTO serialization currently assume a root with one child. Find/cover each consumer before relaxing the backend guard; otherwise products can be listed under an unrenderable or invalid branch.
- **Product categories are currently terminal nodes.** Adding an accessory node changes whether the existing parent category can continue receiving products. Product assignment behavior and existing products need migration/reclassification policy; identify affected records before deployment.
- **Checkout data fan-out and latency.** Suggestions based on several cart lines could multiply requests. Prefer one bounded backend request for the unique eligible category IDs and fetch only checkout-visible content; degrade independently from order validation.
- **Depth and loop safety.** Self-relational data has no DB-level depth cap. If exactly three levels are intended, validate it consistently and prevent moving/creating cycles; do not inadvertently support arbitrary recursive trees throughout the app.
- **Response caching.** Public category endpoints are cached by the website. New category relationships must be reflected after admin edits within a documented cache freshness window.

## 10. Needs a decision

1. **How is an accessory branch marked and linked?** Options: (a) a typed accessory node under each subcategory (recommended for this request’s “create an Accessoires Xx subcategory” flow), or (b) an explicit relation from any source subcategory to a separate accessory category. Recommendation: (a) with a stable `type/usage` field, not name parsing; a plain third-level child alone is ambiguous if it has other purposes.
2. **Should three levels be a strict maximum?** Options: (a) cap Marketplace taxonomy at Rayon → Sous-catégorie → Accessoires (recommended, matches the request and limits app-wide recursive work), or (b) allow arbitrary nesting. Recommendation: strict maximum of three levels for this feature, while retaining the existing generic taxonomy system separately.
3. **What happens to products already assigned to a subcategory that gains children?** Options: (a) keep and grandfather existing assignments while requiring new products to use leaves, or (b) require admins to reassign them before enabling accessory children. Recommendation: (b) if the category is the accessory-designated child and it is not a product category; for ordinary child branches, preserve the existing terminal-only rule and report affected product counts before activation.
4. **How many suggestions and what ordering?** Options: fixed 4–8 by stock/availability then relevance; expose pagination; or no cap. Recommendation: bounded 4 per section with deterministic availability/stock then price/order, and a “view all” category link only if a public category page exists.
5. **Does “page de commande” mean checkout only or also the cart page?** Recommendation: add to the combined checkout page at `/marketplace/commande` first; include `/panier` only if the user expects suggestions before clicking “Passer la commande”. The screenshot/requirement does not distinguish these screens.
