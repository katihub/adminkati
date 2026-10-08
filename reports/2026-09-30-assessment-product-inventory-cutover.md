# Cutover runbook: durable product inventory

Slug of the feature: `product-inventory-descriptions`
(plan: `plans/2026-09-30-product-inventory-descriptions.md`, Phase 5;
walkthrough: `walkthroughs/2026-09-30-product-inventory-descriptions.md`).

Every value marked **PENDING** is a blank to be filled during the cutover by the named owner. Nothing
in this document is a real count, a real operator, or a real timestamp.

## Question

How do we move production from the legacy boolean `nowtech.produits.en_stock` to the durable
`boutique.produit_stocks` ledger without a period in which every product reads "out of stock", and
what tells us at each step that we must stop and go back?

## Method and scope limits

Written from the code on backend branch `feat/prod-stock-mgt` (head at the time of writing:
`9eb60b5`, plus the uncommitted Phase 5 script) and admin `28eab62`. Examined: the migration
`prisma/migrations/20260930100000_inventaire_produits`, `InventaireService`,
`scripts/ingerer-catalogue.mjs`, `scripts/importer-stock-initial.mjs`, `Dockerfile`,
`deploiement/deployer.sh`.

**Not examined:** the production host layout, how backups are restored, the storefront code (its
repository is not in this workspace), and whether `scripts/` and `@prisma/client` are available on
the production host. The commands below assume they are run from a checkout of the backend at the
deployed commit with `node_modules` installed; confirm where that is before the day (item O4).

Revised after the review of 2026-09-30 (`reviews/2026-09-30-product-inventory-descriptions.md`,
findings 4 and 8): in-flight confirmed orders and the confirmation freeze, the rollback SQL, smoke
check 1, and the admin/backend deploy window. The Q1 and Step 3b queries were run for syntax and
result shape against a throwaway database holding stand-in tables with the real names and columns
(dropped afterwards); they have not touched production or the dev database.

The import script was tested only against throwaway databases. It has never been run against a real
environment.

## Why the order matters

- `produit_stocks` is empty after the migration. `CatalogueService.verifier` reads
  `coalesce(s.statut, 'rupture')`, so a product without a stock row is out of stock. **Deploying the
  new backend before the opening import makes every product unorderable.**
- The migration is additive (two tables, two enums, grants). The old backend ignores it, so the
  migration can go first and safely.
- The container entrypoint (`Dockerfile`) runs `prisma migrate deploy` at start, so a plain deploy
  would also migrate. This runbook applies the migration explicitly and earlier, so the import can
  run between the two.
- **Orders already confirmed at cutover have no reservation.** The new backend decrements stock at the
  moment an order becomes `confirmee` (via `/confirmer`, and via `/avancer` once the in-flight backend
  fix lands). An order confirmed on the old backend never decremented anything, and its units are still
  on the shelf when the count is taken, so the ledger would treat them as free and they could be sold
  twice. The opening quantity therefore has to be **net of those commitments** (see "Opening quantity"
  below), and the old backend must stop confirming between the count and the switch.
- The backend keeps a derived `enStock` alias, so a not-yet-updated storefront keeps working while
  the storefront release catches up. That alias is the only thing that lets storefront go last.

## Rollout order

| # | Step | Owner | Gate to proceed |
| :-- | :-- | :-- | :-- |
| 0 | Pre-flight, then **start the confirmation freeze** (T0) | Backend + Operations | All pre-flight checks below pass; freeze announced and acknowledged |
| 1 | Apply migration | Backend | Tables exist, no rows |
| 2 | Opening import: dry run, then real run, then reconcile | Backend, signed by Operations | Reconciliation matches the signed count |
| 3 | Backend deploy | Backend | Health check green, smoke checks pass |
| 4 | Admin deploy, **immediately after step 3** (same window) | Admin | Inventory panel loads against production; **lift the confirmation freeze** |
| 5 | Storefront release | Storefront owner (**unknown**, O1) | Cards, detail, cart, checkout use `statutStock` |
| 6 | Post-cutover | Backend | No reader of the legacy column remains |

## Fields to fill

| Field | Value |
| :-- | :-- |
| Count source (file name, who produced it, date of count) | PENDING |
| Count signed off by (operations) | PENDING |
| Count reviewed by (direction) | PENDING |
| Operator running the import (`--operateur`) | PENDING |
| Import file SHA-256 | PENDING |
| Rows read | PENDING |
| Rows imported | PENDING |
| Rows skipped (already initialised) | PENDING |
| Total units imported | PENDING |
| Count worksheet (raw count and committed units per product) file and SHA-256 | PENDING |
| Freeze start (T0) / freeze lifted, by whom | PENDING / PENDING |
| In-flight confirmed orders at count time (references, output of query Q1, file name) | PENDING |
| Total units counted / total units committed / total units imported (must satisfy the formula) | PENDING / PENDING / PENDING |
| Delta check before the real import (query Q1 re-run, must show no new order) | PENDING |
| Count `en_stock` / `rupture` | PENDING / PENDING |
| Active sellable products missing from the file (must be empty, or explicitly accepted) | PENDING |
| Withdrawn product ids excluded | PENDING |
| Snapshot total after import (`inventory_snapshots`) | PENDING |
| Migration applied at | PENDING |
| Import (real run) at | PENDING |
| Backend deployed at / commit | PENDING |
| Admin deployed at / commit | PENDING |
| Storefront released at / repo / commit | PENDING |

## Step 0: pre-flight

Run from a backend checkout at the commit that will be deployed. `DATABASE_URL_MIGRATION` is the
**owner** connection (as for `ingerer-catalogue.mjs`); the import needs it to read `nowtech` and to
write `boutique`.

1. **Branch and commit are the intended ones.**
   `git rev-parse HEAD` equals the commit named in "Fields to fill". PENDING.
2. **A verified backup of the production database exists, taken after the last catalogue
   ingestion.** Use `deploiement/sauvegarder.sh`. Record the file name and confirm it is readable.
   PENDING.
3. **The catalogue is current.** The most recent ingestion ran and the row counts look right:
   `select count(*), count(*) filter (where retire_le is null) from nowtech.produits;`
   The import refuses ids that are not in `nowtech.produits`, so ingesting *after* the count was
   taken would invalidate the count. Freeze the catalogue (no ingestion) between the count and the
   real import.
4. **Promotion schema check (open item O2).** Confirm before anything else:
   run
   `select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'nowtech' and proname = 'prix_effectif';`
   and
   `select column_name from information_schema.columns where table_schema = 'nowtech' and table_name = 'produits' and column_name in ('promo_debut','promo_fin');`
   Expected: one function and two columns. If absent, checkout price verification fails.
5. **The signed count exists** as `produit_id,quantite` (header required, `,` or `;`), one row per
   active sellable product, produced and signed by Operations and reviewed by direction. Its
   `quantite` is the **opening quantity** defined in "Opening quantity" below: the physical count
   *minus* the units committed to in-flight confirmed orders, **not** the raw count. Compute
   `shasum -a 256 <file>` and record it. Do not accept a count derived from `en_stock = true`.
6. **Nothing is already baselined.**
   `select count(*) from boutique.produit_stocks;` and
   `select count(*) from boutique.mouvements_stock;` are both `0` on a first cutover. If not,
   stop and find out why before going on.
7. **Time window.** Pick a window with no ingestion scheduled and low order volume. There must be no
   window where the new backend serves traffic before step 2 completes. Order volume matters less
   than the freeze in item 8, which is what actually protects the count.
8. **Confirmation freeze (T0 to the end of step 4).** The count is only valid if nothing moves an
   order into `confirmee` on the old backend while it is being taken and imported. Read from the code
   (`src/commandes/commandes.controller.ts`, `machine-etats.ts`): there are exactly two routes that do
   it, `POST /commandes/:reference/confirmer` and `POST /commandes/:reference/avancer` with
   `vers: confirmee`, both open to `direction` and `comptoir`. **There is no maintenance flag, feature
   toggle or "orders paused" switch in the backend**, and the old backend decrements nothing when it
   confirms; it only reads the boolean. So the freeze has two possible mechanisms, and neither is
   enforced by this repository:
   - **Operational freeze (minimum, always required).** Direction and comptoir are told, in writing,
     that from T0 nobody presses Confirm in the admin (the transition dialog calls `/confirmer`; both `/confirmer` and `/avancer` can confirm an order). Customers
     may keep submitting: a new order is `soumise`, which touches no stock and is confirmed on the new
     backend after step 3, where it reserves correctly. Record who was told and when.
   - **Enforced freeze (recommended if volume is not tiny).** Have the reverse proxy in front of the
     API answer `503` for `POST /api/v1/commandes/*/confirmer` and `POST /api/v1/commandes/*/avancer`
     (the backend's own paths are `/v1/commandes/...`; match whichever form the proxy sees)
     from T0 until the new backend is healthy. `deploiement/compose.yml` mentions Traefik but its
     routing rules for this are not in this repository and were not examined: **PENDING (owner: the
     person who runs the proxy)**. Note that blocking `/avancer` also blocks preparation, delivery and
     close transitions for the duration; only worth it if that pause is acceptable.
   Draining is **not** a realistic alternative: an order can sit in `en_preparation`,
   `prete_au_retrait` or `en_remise` for days, so waiting for every confirmed order to reach `close`
   does not terminate. The already-confirmed backlog is handled by subtraction (item 9), and the
   freeze only stops it from growing.
9. **List the in-flight confirmed lines (query Q1, read-only).** Run at T0, at the moment the count
   is taken, on the production database with a read-only role or the owner role in a read-only
   transaction (`begin read only; ... rollback;`). Save the output next to the count worksheet.
   Table and column names are from `prisma/schema.prisma` (`Commande`, `CommandeLigne`; tables live in
   the `boutique` schema).

   ```sql
   begin read only;

   -- Q1a: units per product, per order status. This drives the subtraction.
   select l.produit_id,
          p.slug,
          c.statut,
          count(distinct c.id) as commandes,
          sum(l.quantite)::int as unites
     from boutique.commandes c
     join boutique.commande_lignes l on l.commande_id = c.id
     left join nowtech.produits p on p.id = l.produit_id
    where c.statut in ('confirmee', 'en_preparation', 'prete_au_retrait',
                       'en_remise', 'retour_ouvert', 'annulation_demandee')
    group by l.produit_id, p.slug, c.statut
    order by l.produit_id, c.statut;

   -- Q1b: the order references behind it, for the record and for the delta check.
   select c.reference, c.statut, c.comptoir, l.produit_id, l.quantite
     from boutique.commandes c
     join boutique.commande_lignes l on l.commande_id = c.id
    where c.statut in ('confirmee', 'en_preparation', 'prete_au_retrait',
                       'en_remise', 'retour_ouvert', 'annulation_demandee')
    order by c.reference, l.rang;

   rollback;
   ```

   `l.quantite` is the same quantity the new backend reserves at confirmation
   (`reserverLignes` sends every line's `quantite`, whatever the line status), so subtracting it keeps
   the two sides on the same basis. Do **not** use `quantite_remise` (what was actually handed over).
   This query was written from the schema and its syntax checked against a throwaway database with
   the same table and column names, then dropped; it has **not** been run against production data.
   The same query is re-run before the real import as the delta check (Step 2b).

## Opening quantity: how it relates to physical stock

The ledger column `boutique.produit_stocks.quantite` means **units available to sell**: on premises
and not promised to an order. It is not "units on the shelf". After cutover the invariant is
`quantite = physical on shelf - units reserved by orders that are confirmed and not yet shipped or
closed`, because the new system takes units out of `quantite` at confirmation and never again
(closing an order does nothing to stock; cancelling one puts the units back). For orders confirmed on
the old backend that decrement never happened, so we do it once, in the opening quantity:

```
opening_p = counted_p - committed_p          (per product p, must be >= 0)

counted_p   = units physically on premises at count time, INCLUDING boxes already set aside or
              staged for an order (Operations counts everything that is physically there)
committed_p = sum of `quantite` over the lines of orders that were confirmed but not yet closed
              at count time AND whose goods were on premises at count time
```

Which orders count as "goods on premises" is decided per **status**, using the Q1a output. **Decision
recorded 2026-09-30 (from the project owner, still to be confirmed in writing by Operations):**
subtract `confirmee`, `en_preparation`, `prete_au_retrait` and `annulation_demandee`; do not subtract
`en_remise`; `retour_ouvert` was not decided and stays case by case. Q1a and Q1b list every
in-flight status on purpose, so the excluded ones stay visible.

| Order status at count time | Goods still counted on premises? | Subtract? |
| :-- | :-- | :-- |
| `confirmee`, `en_preparation` | Yes (not yet handed over) | Yes |
| `prete_au_retrait` | Yes if the staging area is counted (agreed counting rule above) | Yes |
| `annulation_demandee` | Yes; the order may still be refused back to normal, or become `annulee` | Yes (decision 2026-09-30), and see the cancellation rule in Step 3b |
| `en_remise` | No: already out for delivery, not on the shelf | No |
| `retour_ouvert` | No unless the return was physically received and counted: Operations decides per order | Case by case |

If the count did not include staged boxes, or included goods already out for delivery, change the
table row and record the decision: what matters is that each unit is counted **once** as either
sellable or committed. `committed_p > counted_p` means a unit is promised twice already: **stop**, do
not clamp to zero, and let direction decide which order to short or cancel. The import refuses
negative quantities on purpose.

**Import CSV guidance.** The file stays the strict two-column `produit_id,quantite`, and its
`quantite` is `opening_p`. Keep the raw count and the committed units in a separate signed worksheet
(`produit_id,counted,committed,opening`) and record its SHA-256 next to the CSV's. A product whose
`opening_p` is `0` still gets a row (it reads `rupture`). The script has **no reason option**: the
movement reason is fixed to `Ouverture de stock, comptage signe par <operateur>` and the actor id is
`import-stock:<operateur>` (`--operateur` is limited to 50 characters). The "net of in-flight orders"
fact therefore cannot be written into the history by the script; it lives in the signed worksheet
and in "Fields to fill" (the planned wording change was not possible without a script change).

**Reconciliation formula (used in 2c).** For the whole file:

```
sum(quantite in produit_stocks) = sum(counted_p) - sum(committed_p)
                                = total units imported = inventory_snapshots.total_quantity
```

## Step 1: apply the migration

```bash
cd <backend checkout>
DATABASE_URL="$DATABASE_URL_MIGRATION" DATABASE_URL_MIGRATION="$DATABASE_URL_MIGRATION" \
  ./node_modules/.bin/prisma migrate deploy
```

Set **both** variables on the command line. `prisma/schema.prisma` declares
`directUrl = env("DATABASE_URL_MIGRATION")`, and that is the URL `migrate` actually connects to. If
the variable is not exported in the shell and the checkout has a `.env`, Prisma loads the `.env`
value instead: in the rehearsal, `DATABASE_URL=<clone>` alone made `prisma migrate status` report
the dev database `nowtech`. Read the `Datasource "db": ... database "<name>"` line Prisma prints and
stop if it is not the intended database.

Verify:

```sql
select count(*) from boutique.produit_stocks;      -- 0
select count(*) from boutique.mouvements_stock;    -- 0
select typname from pg_type where typname in ('statut_stock', 'type_mouvement_stock');  -- 2 rows
```

**Rollback condition:** the command fails, or the tables are missing or non-empty. `migrate deploy`
runs each migration in a transaction, so a failure leaves the schema unchanged; stop and fix. The
migration is additive and the old backend ignores it, so after a *successful* step 1 you can leave
it applied even if a later step is aborted. Dropping the tables is only needed for a full revert,
and only while they are empty (nothing in the SQL enforces that: `drop table` also succeeds on
tables that hold rows, so check the two counts first). The full revert, in this order (the migration
also creates two enum types, and a re-run of `migrate deploy` fails on `CREATE TYPE` if they are
left behind), as owner. Run literally on a clone during the rehearsal: it worked, and
`migrate deploy` then re-applied the migration cleanly, tables and grants included:

```sql
begin;
drop table boutique.mouvements_stock, boutique.produit_stocks;
drop type boutique.type_mouvement_stock, boutique.statut_stock;
delete from boutique._prisma_migrations where migration_name = '20260930100000_inventaire_produits';
commit;
```

This matches `migration.sql`, which creates exactly those two tables and two types (the grants go
with the tables). `boutique.inventory_snapshots` comes from an earlier migration and is not dropped. `_prisma_migrations` lives in the schema named by the connection URL's
`?schema=` parameter (`boutique` in the repository's examples); check it before deleting. Once real stock exists, never drop; restore from
backup only with direction's decision.

## Step 2: opening import and reconciliation

The script: `scripts/importer-stock-initial.mjs`, npm script `pnpm stock:importer`.

**2a. Dry run (mandatory).** Full validation, reconciliation summary, zero writes.

```bash
DATABASE_URL_MIGRATION=<owner url> pnpm stock:importer -- \
  --source=/path/to/stock-initial.csv \
  --operateur="<operator name>" \
  --essai --rapport=/path/to/rapport-essai.md
```

Read the `base : host:port/db` line the script prints before anything else and stop if it is not
the production database (the script reads only the explicit `DATABASE_URL_MIGRATION`, and refuses
to start without it). Exit 0 means a real run would succeed. Exit 1 lists every problem with its line number (`ligne N`),
unknown ids, missing active products, and existing stock. Hand the list back to Operations; do not
patch the CSV yourself, because the file is the signed document. A corrected file is re-signed and
its SHA-256 recorded again.

Decide with Operations and direction, and write it down in "Fields to fill":

- **Active sellable products missing from the file** (refused by default). Either the count is
  incomplete (fix it) or the product is knowingly not sold: only then use `--autoriser-manquants`.
  A missing product will read `rupture` until it is baselined.
- **Withdrawn products present in the file** are excluded, not imported; their ids are listed in
  the reconciliation. Copy that list to the fields table.
- **Existing stock rows** (refused by default). On a first cutover there must be none. Use
  `--ignorer-existants` only for a deliberate second pass over a file that overlaps a previous
  import; the skipped ids are listed.

**2b-pre. Delta check (mandatory, right before the real run).** Re-run Q1b. Every order reference
must already be in the T0 list, and no order may have gained lines. A **new** reference means an order
was confirmed on the old backend after the count, i.e. the freeze leaked: subtract its lines from the
worksheet, have Operations re-sign the file, record the new SHA-256, and find out how the freeze
failed before going on. An order that has **left** the list (cancelled or closed since T0) is fine
for `close`, but for `annulee` the units went back to the shelf after the count: leave the opening
quantity as is and record it, because it will be corrected by the rule in Step 3b.

**2b. Real run.** Same command without `--essai`. One transaction: all products, their
`initialisation` movements, and one `inventory_snapshots` row commit together or not at all.

```bash
DATABASE_URL_MIGRATION=<owner url> pnpm stock:importer -- \
  --source=/path/to/stock-initial.csv \
  --operateur="<operator name>" \
  --rapport=/path/to/rapport-import.md
```

Paste the printed `RECONCILIATION STOCK INITIAL` block (or the `--rapport` file) into this document
under "Fields to fill".

**2c. Reconcile independently of the script.** These queries do not use the script's own counts:

```sql
select count(*) as lignes, coalesce(sum(quantite), 0) as unites,
       count(*) filter (where statut = 'en_stock') as en_stock,
       count(*) filter (where statut = 'rupture')  as rupture
  from boutique.produit_stocks;

select count(*) from boutique.mouvements_stock where type = 'initialisation';   -- equals lignes

select total_quantity, actor, captured_at
  from boutique.inventory_snapshots order by captured_at desc limit 1;          -- equals unites

-- Every active sellable product has exactly one stock row (expect 0 rows).
select p.id, p.slug from nowtech.produits p
 left join boutique.produit_stocks s on s.produit_id = p.id
 where p.retire_le is null and p.prix > 0 and s.produit_id is null;
```

The last query must return no rows unless `--autoriser-manquants` was used on purpose. Compare
`lignes`, `unites`, `en_stock`, `rupture` with the signed CSV, and `unites` with the formula in
"Opening quantity": `sum(counted) - sum(committed)` from the signed worksheet. Any mismatch is a
stop. This confirms the import matches the file; it cannot confirm the worksheet is right, which is
why Q1 output and the worksheet are signed too.

**Rollback condition for step 2:**

- The dry run or the real run refuses: nothing was written; fix the input and rerun. No rollback.
- The real run fails mid-way: the transaction rolled back; verify `select count(*) from
  boutique.produit_stocks;` is still `0` (first cutover) and rerun.
- The real run succeeded but reconciliation disagrees with the signed count, **before** step 3:
  the new backend is not serving yet, so nothing depends on the rows. Correcting means restoring
  the step 0 backup (or, on a first cutover, `truncate boutique.mouvements_stock,
  boutique.produit_stocks, boutique.inventory_snapshots;` as owner, an owner-only privileged act
  the application role does not have) and rerunning with a corrected, re-signed file. Record the
  decision and who took it. Do **not** correct quantities with ad-hoc SQL: use a signed correction
  through the admin after cutover, so the ledger carries the reason.
- Rerunning a successful import unchanged is refused by design; that is not an error to work around.

## Step 3: backend deploy

```bash
cd /opt/nowtech-api && ./deploiement/deployer.sh
```

`deployer.sh` builds, starts a dry image, tags the running image as the rollback point, switches,
and checks health. The entrypoint runs `migrate deploy`, which is a no-op after step 1.

Smoke checks (PENDING results):

1. The public product detail for a product whose opening quantity was `> 0` returns `statutStock` =
   `en_stock` and the `enStock` alias `true`. The public response **never** carries the quantity
   (`catalogue.service.ts`: only `statutStock` and the derived `enStock`; `quantiteDisponible` exists
   only inside the checkout `verifier` computation). To check the number, call the admin endpoint
   `GET /v1/catalogue/administration/produits/<id>/inventaire` (the backend's own path: its global
   prefix is `v1`, verified; the admin BFF exposes it as `/api/v1/...`) with a direction or comptoir
   session and compare `inventaire.quantite_stock` with the CSV's `quantite`.
2. A product baselined at `0` returns `statutStock: rupture` and `enStock: false`.
3. Order a single unit of a low-stock test product and confirm it **from the admin's Confirm
   button** (the transition dialog, which calls `/avancer`; this is the path staff really use). Check
   that `mouvements_stock` has one `commande_confirmee` and the quantity decreased by one; cancel and
   check the `commande_liberee` restores it. If confirming through `/avancer` does not write a
   `commande_confirmee` movement, the backend fix for review finding 1 is not in the deployed
   commit: stop and roll back. Use a product agreed with Operations, and reverse the
   test with a signed `correction` if the order cannot be cancelled.
4. Health check green in the `deployer.sh` output.

**Deploy window with the old admin.** Between this step and step 4 the *old* admin is still what
staff use, and it sends `en_stock` on every product PATCH. The new backend's update DTO no longer
accepts that field (`forbidNonWhitelisted: true` in `main.ts`), so **every product save from the old
admin returns 400** (and its old stock panel calls a route that no longer exists). The reverse pairing
is not safe either: the new admin against the old backend has no `inventaire` on the product detail,
so status badges would misread, and product **creation** fails because the old DTO does not know
`quantite_stock_initiale`. Least-risk ordering, decided here: **backend first, then admin immediately
in the same window**, with the admin build prepared and ready to promote before step 3 starts, and
with product editing frozen (staff told not to edit products) from step 3 until step 4 completes.
Backend-first fails loudly and only on saves; admin-first would silently show wrong badges. If the
admin cannot be promoted within minutes of the backend health check, the window is not acceptable
and the cutover should wait. Accepting a longer window is a decision only direction makes; write it
down in "Fields to fill".

**Rollback condition:** health check fails, or checkout admits an order for a `rupture` product, or
the stock decrement is wrong. `deployer.sh` keeps the previous image tagged as `precedent`; it
reverts automatically if the new container is unhealthy. For a manual rollback, retag `precedent`
to `latest` and `docker compose up -d`. The stock tables are additive and stay in place. Orders
confirmed on the new backend have already decremented durable stock: do not restore the old image
and then rely on the legacy boolean; if those orders exist, reconcile them before rolling back.

## Step 3b: pre-cutover orders that are cancelled or reopened afterwards

Orders confirmed before cutover were subtracted in the opening quantity but hold **no** reservation
movement, so the release path has nothing to release: cancelling one (`annulation_demandee` to
`annulee`), or reopening one (`confirmee` to `soumise`, which the customer can do to re-accept a
price), is a silent no-op on stock. The units are back on the shelf but the ledger is short by the
order's quantities (and a reopened order that is confirmed again reserves a second time). Rule: for
every order in the T0 list (Q1b) that later becomes `annulee` or returns to `soumise`, direction
records a signed `reception` per line with the order reference in the reason. To find them:

```sql
select c.reference, c.statut, l.produit_id, l.quantite
  from boutique.commandes c
  join boutique.commande_lignes l on l.commande_id = c.id
 where c.statut in ('annulee', 'soumise')
   and exists (select 1 from boutique.commande_transitions t
                where t.commande_id = c.id and t.vers_statut = 'confirmee')
   and not exists (select 1 from boutique.mouvements_stock m
                    where m.commande_id = c.id and m.type = 'commande_confirmee')
 order by c.reference;
```

(Orders confirmed before the cutover, now cancelled or reopened, with no reservation movement.) Run it
weekly until the T0 list is fully closed. Automating a backfill of the reservation movements is
deliberately not proposed: the ledger is append-only and the import is a one-time owner operation.

## Step 4: admin deploy

Deploy the admin at the recorded commit (bun build, not pnpm), **immediately after step 3** (see the
deploy-window note there). Checks:

1. Product detail shows the inventory panel with the imported quantity and history (one
   `initialisation` entry with the operator in the reason).
2. A comptoir user sees quantity, status and history but no adjust or restocking control; a direction
   user can adjust.
3. The dashboard stock total equals the snapshot total from step 2.
4. Lift the confirmation freeze (step 0, item 8) and record the time in "Fields to fill".

**Rollback condition:** the panel errors on production data. The admin is a separate deploy, so
revert it to the previous build; the backend and the ledger are unaffected.

## Step 5: storefront release

Owner and repository: **PENDING (O1: unknown)**. Required changes: product cards, detail, cart and
checkout consume `statutStock` (`en_stock`, `rupture`, `reapprovisionnement`), render Restocking,
block both zero-stock states, and render `ficheTechnique` as the long description. Record the
paths and release commit in the walkthrough and in "Fields to fill" before calling the feature
complete.

**Rollback condition:** the storefront shows a wrong state or lets a zero-stock product be added.
Revert the storefront release; the backend still serves the derived `enStock` alias, so the older
storefront keeps working.

## Step 6: after cutover

- **Finding 7 is fixed in code (see O2) and was rehearsed on a clone (see "Rehearsal results").**
  `scripts/ingerer-catalogue.mjs` now replays `sql/promotions.sql`, `sql/description-fiche.sql` and
  `sql/droits.sql` inside the swap transaction. Still required before the production ingestion: one
  `--essai` and one real run against a copy of production with the **real** vitrine `catalog.json`,
  and `DATABASE_URL_MIGRATION` exported explicitly on the command line (the ingestion script, unlike
  the importer, does not guard against a `.env` supplying it; see the rehearsal results).
- Nothing may read `nowtech.produits.en_stock` or the legacy column `quantite_stock` any more.
  `sql/inventaire.sql` adds `nowtech.produits.quantite_stock` (default `0`) only to keep local
  bootstrap and fresh ingestion on the same shape; it is not stock truth and is not maintained.
  Search every consumer (backend, storefront, reporting queries) and remove references. PENDING.
- Ingest the catalogue once after cutover in a maintenance slot and confirm `produit_stocks` and
  `mouvements_stock` are unchanged (the durability the plan requires; the automated test simulates
  the schema switch only).
- Close the PENDING fields and mark the walkthrough complete.

## Open items

| # | Item | Owner | Blocks |
| :-- | :-- | :-- | :-- |
| O1 | **Storefront: out of scope (decision 2026-09-30, project owner).** The storefront is not this project's concern, so its release (step 5) is not tracked here. Consequence to keep in mind: the derived `enStock` alias keeps the current storefront working, but customers see no Restocking state and the storefront does not render `ficheTechnique` until its owner ships. | Storefront owner (external) | Not tracked |
| O2 | **Resolved in code (2026-09-30), rehearsal still required.** `scripts/ingerer-catalogue.mjs` now replays `sql/promotions.sql`, `sql/description-fiche.sql` and `sql/droits.sql` inside the same transaction as the schema swap, so the rebuilt `nowtech` always has `promo_debut`/`promo_fin`, `promotion_active`, `prix_effectif`, the promotion constraints, the description index and the grants; a failing replay rolls the swap back and keeps the previous catalogue served. `sql/inventaire.sql` is deliberately not replayed (nothing reads its legacy column). New failure mode: a vitrine row whose `remise_pct` contradicts its `prix_reference` now fails the whole ingestion. Rehearsed 2026-09-30 on a clone with a synthetic catalog JSON derived from the dev data (see "Rehearsal results"); **still not run against the real vitrine `catalog.json`**: run `--essai`, then one real ingestion on a throwaway copy of production (pre-flight check 4), before any ingestion in production. | Backend | Step 6 (ingestion) |
| O3 | **Legacy `quantite_stock` column.** `sql/inventaire.sql` adds it; nothing should read it after cutover (Step 6). | Backend | Post-cutover cleanup |
| O4 | **Where the import runs in production.** Whether a checkout of the repo with `node_modules` and `sql/` is on the host, or whether the script must run from another machine with network access to the database using `DATABASE_URL_MIGRATION`. | Backend | Step 2 |
| O5 | **Counting source and sign-off.** Decided 2026-09-30: **Operations supplies the count, direction signs it.** Names, date and the file's SHA-256 still to be recorded. Release blocker until a signed file exists. | Operations + direction | Step 2 |
| O6 | Manual QA from the phase 6 walkthrough (roles, narrow widths, end-to-end checkout, cancellation restores stock) has not been done. | Admin + Backend | Feature complete |
| O8 | **Decided 2026-09-30: operational freeze only** (no proxy rule). **The confirmation freeze is not enforceable from this repository.** No backend flag exists (Step 0, item 8); the operational freeze relies on people, and the enforced freeze relies on proxy rules that were not examined. | Backend + Operations | Step 0 |
| O9 | The "goods on premises" table (Opening quantity) now reflects the 2026-09-30 decision (`confirmee`, `en_preparation`, `prete_au_retrait`, `annulation_demandee` subtracted). `retour_ouvert` is undecided; Operations must confirm the table in writing before counting. | Operations | Step 2 |
| O7 | The import is a one-time owner operation and is not designed to run while the new backend is taking orders. Run it only before step 3. | Backend | Step 2 timing |

## Recommendation

Do not schedule the cutover until O5 (a signed count, net of in-flight orders), O8 (a freeze owner)
and O2 (promotion schema; it also blocks Step 6's ingestion) are answered. The
technical path is otherwise rehearsed by the script's dry run, which can be run against a copy of
production at any time without writing anything.

## Rehearsal results (dev data, not production)

Run 2026-09-30 against three throwaway clones (`rehearsal_import`, `rehearsal_rollback`,
`rehearsal_ingest`) made by piping a `pg_dump` of the dev database `nowtech` into new databases in the
same Postgres container. The dev database `nowtech` was never written: `produit_stocks`,
`mouvements_stock`, `inventory_snapshots`, `_prisma_migrations`, `commandes` and `nowtech.produits`
have identical counts and checksums before and after. The clones were dropped afterwards. Every
command passed the clone's URL explicitly, and the importer's `base :` line was checked before each
write.

**What this is not.** The data is the local dev seed (4,275 products, 10 fixture orders `FIX-CMD-*`),
not production. The count CSV is synthetic (deterministic, 4,268 rows, 59.7% positive). The catalog
JSON is synthetic: generated from the clone's own `nowtech` tables, not the real vitrine
`catalog.json` (none exists in this workspace). Timings are a laptop with Postgres in Docker, idle.
A production-copy rehearsal with the real files is still required.

| # | Check | Result | Evidence |
| :-- | :-- | :-- | :-- |
| 1 | Importer `--essai` writes nothing | PASS | counts of `produit_stocks`, `mouvements_stock`, `inventory_snapshots` unchanged after; `--rapport` file written |
| 2 | Refusal: active products missing from the file | PASS | exit 1, 4,168 ids listed, "Rien n'a ete ecrit" |
| 3 | Refusal: unknown id, duplicate id, invalid quantity (-3, 1.5, abc, 99999999999), bad header, blank line, ids `0` and `01`, padded quantity | PASS | exit 1, each with its `ligne N` |
| 4 | Refusal: existing baseline without `--ignorer-existants` | PASS | exit 1, ids listed; with the flag the row is skipped and listed |
| 5 | Refusal: missing `--operateur`, `--source`, `DATABASE_URL_MIGRATION`; operator over 50 characters; unreadable source | PASS | exit 1, all missing items listed at once |
| 6 | Real run | PASS | 4,268 rows in about 0.3 s wall clock, transaction included |
| 7 | Reconciliation block equals independent SQL | PASS | both: 4,268 rows, 61,212 units, 2,549 `en_stock`, 1,719 `rupture`; equal to the CSV |
| 8 | One `initialisation` movement per product (`avant` 0, `apres` = `variation` = quantity), actor `systeme` / `import-stock:Rehearsal Op` | PASS | 4,268 movements over 4,268 distinct products, all match |
| 9 | Snapshot total and actor | PASS | `total_quantity` 61,212, actor `import-stock:Rehearsal Op` |
| 10 | Re-run of the same import | PASS | refused (4,268 existing), nothing written |
| 11 | Real run is atomic | PASS | forced the snapshot insert to fail on a clone: exit 1, `produit_stocks` and `mouvements_stock` both 0 afterwards |
| 12 | Withdrawn products in the file excluded and listed; two-pass import (`--autoriser-manquants`, then `--ignorer-existants`) | PASS | 98 then 4,168 rows, 2 withdrawn excluded, final 4,266 rows, sums consistent |
| 13 | CSV with BOM, CRLF and `;` separator | PASS | parsed |
| 14 | Read paths on the clone through a real backend (port 3012, role `nowtech_app`) | PASS | public detail: `statutStock` `en_stock` / `rupture` with the `enStock` alias and no quantity key; `verifier`: 31 of 31 ok, 32 of 31 `stock_insuffisant`, zero-stock `rupture`; admin list total 4,275, `stock=rupture` 1,726 (1,719 zero rows plus 7 never-stocked zero-price products, by the `coalesce`), `stock=en-stock` 2,549; admin detail and `/inventaire` show 31 and one `initialisation` entry |
| 15 | Q1a and Q1b against real `boutique.commandes` rows | PASS | both run in a read-only transaction; 7 lines from 7 fixture orders; all six in-flight statuses exist in the enum |
| 16 | Step 3b query | PASS | runs; returns `FIX-CMD-09` (annulee, no reservation movement), as expected |
| 17 | Pre-flight checks 3, 4, 6 queries | PASS | `prix_effectif` and both promo columns present; counts as expected |
| 18 | Rollback SQL, literally as written | PASS | tables and both enums gone, migration row deleted; `prisma migrate deploy` re-applied it cleanly, grants restored. Also works on non-empty tables |
| 19 | Ingestion refusal rules | PASS | `--essai` refused: under 1,000 products, size drift above 20%, median price drift above 50%, missing slug, duplicate slug, non-integer id, invalid `stockQuantity` (exit 2) |
| 20 | Ingestion `--essai`, then real run, on a clone already holding 4,268 stock rows and movements | PASS | 4,275 products, 268 categories, 14 rayons, 102 marques, 6,999 images |
| 21 | Stock and ledger survive the ingestion | PASS | counts and md5 identical before and after, including a full-row md5 of every movement |
| 22 | After ingestion: `prix_effectif`, `promotion_active`, `promo_debut`, `promo_fin`, description and fiche columns present; same columns, indexes and functions as before | PASS | differences listed in observation 4 |
| 23 | Grants after ingestion for `nowtech_app` | PASS | UPDATE and INSERT on `produits`, INSERT and DELETE on `produit_images`, UPDATE on `produit_stocks` work; `delete from nowtech.produits` is denied |
| 24 | `verifier`, admin list and detail after ingestion | PASS | same results as check 14 |
| 25 | Swap lock window | PASS | see timings |

**Timings.** Importer, real run, 4,268 rows: about 0.3 s. Ingestion, 4,275 products: 18.6 s total as
printed by the script, of which about 18.5 s is the preparation in `nowtech_prep` (row-by-row inserts,
about 20,000 statements) and **56 ms is the swap transaction** (`BEGIN` to `COMMIT` in the Postgres
statement log: schema rename plus 34 replayed statements, including the promotion index and the
description GIN index). A second connection running the catalogue price-and-stock query every few
milliseconds through the whole ingestion made 4,841 queries with **0 errors, slowest 45 ms, none above
50 ms**. The GIN index on `recherche` is built in the preparation phase, outside the swap. The worry
about 4,275 row updates inside the swap did not show up here: on this data the `update` statements in
`promotions.sql` touch few rows. On production the number of `prix_reference = 0` rows will differ
(the file mentions 141); re-measure there.

**Observations that need an owner (source not fixed here).**

1. `scripts/ingerer-catalogue.mjs` imports `@prisma/client` statically (line 31). Prisma loads the
   backend `.env` on import, so when `DATABASE_URL_MIGRATION` is not set in the environment the script
   silently uses the `.env` value (verified: the variable goes from unset to set on import). The check
   at lines 141-148 never fires on any checkout that has a `.env`, and the script prints no `base :`
   line. The importer avoids this with a dynamic import and prints its target. The ingestion script is
   destructive (drops and recreates `nowtech`). Fix: same pattern as the importer.
2. The same `.env` fallback applies to `prisma migrate deploy` through `directUrl` (Step 1, edited).
3. Re-ingestion resets what the panel owns in `nowtech.produits`: `description_editee` and
   `fiche_editee` went from one product each to zero, and any description, `fiche_technique`,
   `fiche_pdf`, `retire_le`, promotion window or price edit is replaced by the catalog JSON (the dev
   seed has none of those values set, so only the two flags were observable). This matches the script
   header but conflicts with Step 6 treating a post-cutover ingestion as routine.
4. After ingestion `nowtech_app` has only SELECT on `nowtech.meta` (before: also INSERT, UPDATE;
   nothing in `src/` writes it), and the legacy constraint is named `produits_quantite_stock_check`
   instead of `produits_quantite_stock_nonnegative`. Neither is referenced by code.
5. The movement reason and actor cannot carry "opening net of in-flight orders" (the script has no
   reason option); runbook text corrected.
6. In `--essai`, a refused catalog still runs `drop schema if exists nowtech_prep cascade`
   (`ingerer-catalogue.mjs` line 342). Harmless, but a dry run should not write.
7. Not exercised: the real vitrine `catalog.json`, a production-sized `commandes` table, concurrent
   order traffic during the import, a `_prisma_migrations` in a schema other than `boutique`.

**Runbook edits made by this rehearsal.**

- Step 1: the `prisma migrate deploy` command now sets `DATABASE_URL_MIGRATION` too, with the
  `directUrl` explanation and an instruction to read the `Datasource` line.
- Step 1 rollback: literal run recorded; `drop table` works on non-empty tables (the "only while
  empty" rule is procedural); `inventory_snapshots` is not dropped.
- "Import CSV guidance": removed the claim that `--operateur` can carry "opening net of in-flight
  orders"; the fixed reason text and the 50-character limit are stated.
- Step 2a: added "read the `base :` line".
- Step 0 item 8 and Step 3 smoke check 1: the backend's own paths are `/v1/...`; `/api/v1/...` is the
  admin BFF form.
- Step 6 first bullet and open item O2: the promotion-schema blocker is marked fixed in code and
  rehearsed on a clone, with the real-catalog rehearsal still required and the ingestion `.env` hazard
  stated.

**Still needed from the operator for a production rehearsal.** A restore of a recent production backup
into a throwaway database; the real count CSV (or the operator's draft); the real vitrine
`catalog.json` for `--essai` and one real ingestion on that copy; Q1a and Q1b on the copy with real
in-flight orders; timings of the importer and the swap at production row counts; and confirmation of
where the scripts run (O4) and of the proxy path form for the freeze (O8).
