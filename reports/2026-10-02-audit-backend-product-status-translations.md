# Backend product statuses vs admin panel translations

## Question

Does `NowTech-backend-` define or emit any product status that the admin panel has no translation for?

## Method and scope limits

Read the backend's product/stock status definitions — Prisma schema, migrations, SQL DDL, catalogue and inventory services and DTOs — and matched every value against the admin panel's translation catalogs and the mappers that build translation keys at runtime. Checked all five admin worktrees plus the remote branches (`origin/main`, `origin/development`, both updated today). Ran `bun run i18n:check` and a scripted exact-path check of every product-flow key the UI builds dynamically, in both EN and FR.

**Not examined:** the storefront repository and rendered screens; database contents; non-product statuses (orders, quotes, payments, caisse, assistant) except where a product status flows through them. Whether a value is displayed was judged from source, not by exercising the screens.

## Findings

### 1. No product status is missing a translation on any live branch

`origin/main` (updated today by PR #25 from `development`), `origin/development` (PR #26), and the current `feat/ai-integration` worktree all cover the full backend vocabulary in EN and FR:

| Backend vocabulary | Values (source) | Admin key(s) |
| :-- | :-- | :-- |
| Stock status | `en_stock`, `rupture`, `reapprovisionnement` (`prisma/schema.prisma:138`, `src/inventaire/inventaire.service.ts:17`) | `products.listItem.status.en-stock/rupture/reapprovisionnement`; `app/utils/product-status.ts` maps `en_stock → "en-stock"` |
| Withdrawal lifecycle | `retire_le` non-null (`administration.service.ts` list/detail) | `products.listItem.status.retire`, `quickFilters.withdrawn`, `lifecycleControls.restore`, `stockExport` state `retires` |
| List filters | `stock: tous/en-stock/rupture/reapprovisionnement`; `etat: actifs/retires/tous` (`administration.dto.ts:88-96`) | `products.quickFilters.*`, `products.stockExport.filters.stateActive`, `app/utils/stock-export.ts` value-key maps |
| Status-change endpoint | `rupture`, `reapprovisionnement` (`administration.dto.ts:232-234`) | `products.inventory.markRestocking` / `clearRestocking` |
| Order-confirmation refusal motifs | `inconnu`, `retire`, `rupture`, `reapprovisionnement`, `stock_insuffisant`, `prix_nul`, `quantite` (`catalogue.service.ts:103-110`) | `orders.actions.transitionDialog.conflictMotives.*` — 7/7, plus `autre` fallback in `ConfirmConflict.vue:14` |
| Stock movement types | `initialisation`, `reception`, `correction`, `commande_confirmee`, `commande_liberee` (`schema.prisma:146`) | `products.inventory.movementType.*` — 5/5 |
| Import row statuses | `applique`, `ignore`, `echec` (`stock-import.dto.ts:64`) | `products.stockImport.statuses.*` and `preview.statuses.*` (+ client-side `stockChanged`) |
| Import ignore reasons | `quantite_vide`, `aucun_ecart`, `stock_modifie` (`stock-import.dto.ts:73`) | `app/utils/stock-import-row.ts` maps them to `notTouched` / `noChange` / `stockChanged.skipped` |
| Import line error codes | 10 codes (`stock-import.dto.ts:47-58`) | `products.stockImport.rowCodes.*` — 10/10, unknown falls back to `echec_inattendu` |
| Import request errors | 11 file codes + `cle_idempotence_conflit` + `importation_en_cours` (`stock-import.parser.ts:29-40`, dto:62) | `products.stockImport.requestErrors.*`; `importation_en_cours` is classified to `failure.inProgress` in `stock-import-errors.ts:10` |
| Export error | `export_trop_volumineux` (`stock-export.dto.ts:15`) | `stockExport.headings.blocked` via `isExportTooLarge` |
| Proposition status/type | `en_attente`/`acceptee`/`refusee`; `creation`/`modification`/`disparition` (`sql/arbitrage.sql:55,60`) | `content.propositions.status.*`, `.type.*` |
| Product history type | `creation`/`modification`/`disparition` | `products.historyEntry.type.*` and `.title.*` |

The exact-path check (every key built from a backend value at runtime, including import heading ids and export headings) found zero missing keys in either locale; `bun run i18n:check` passed.

### 2. Only the stale local checkouts lack a status

The `main/` worktree (commit `09462a8`, 2026-09-22, 74 commits behind `origin/main`) and the `feat-product-delivery/` worktree predate the stock work: their `ProductStatus` is `en-stock | rupture | retire` derived from the legacy `en_stock` boolean, with no `reapprovisionnement` key. They are stale checkouts, not branch gaps — `origin/main` received the `development` merge today (PR #25) and has full coverage. If the missing status was seen in a local `main` checkout, updating that worktree is the fix.

### 3. Backend statuses with no admin translation because nothing displays them

`EtatIdempotence` (`en_cours`/`termine`, internal import lock), `TypeAjustement` (`remise`/`frais`/`correction`, order adjustments — no admin UI), `LieuEncaissement.en_ligne`, and `GenreConnaissance.faq`/`depannage` have no admin keys and are not returned to the admin today. They become translation work only if a screen surfaces them.

### 4. One product-status concept the admin does not represent — not a translation gap

Commit `10d72fd` (just merged into backend `main`) made the storefront and order confirmation fall back to the legacy catalogue flag for products nobody has counted: `enStock()` is `coalesce(ps.statut = 'en_stock', p.en_stock)` (`src/catalogue/vitrine-catalogue.sql.ts:39`) and `reserverCommande` lets uncounted lines pass without a movement (`inventaire.service.ts:399-419`). The admin list and detail were not changed and still derive the badge as `coalesce(s.statut::text, 'rupture')` (`administration.service.ts:375,419`).

Consequence: with the register empty at deploy, an uncounted but sellable product badges as "Rupture"/"Out of stock" in the admin while the storefront shows it and orders can be confirmed for it. The admin has no "not counted yet" state to distinguish this from a genuine zero. That is the only product-status concept from the backend the admin does not account for; it would need a backend projection change (or a new admin status label), not a translation.

## Recommendation

No translation work is required for product statuses today. Confirm the intended display for never-counted products: either apply the same `coalesce` fallback to the admin list/detail projection, or add a distinct "not counted" status label so an empty register does not read as "everything is out of stock" while the shop is selling. Ignore the stale `main/` and `feat-product-delivery/` checkouts unless work happens there — update them from `origin/main` first.
