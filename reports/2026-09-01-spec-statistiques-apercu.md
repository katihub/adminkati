# Spécification — `GET /v1/statistiques/apercu`

**Date:** 2026-09-01 · **Révision 2** · **Statut:** proposée, non implémentée · **Destinataire:**
développeur backend `NowTech-backend-`

> **Revision 2 replaced the response contract wholesale.** Revision 1 specified
> `blocs: BlocId[]` selecting among `encaisse`, `livraison`, `produits`, `mix`, `caisse`, `aTraiter`
> and `operations`. The admin panel's dashboard was redesigned against a different set of cards, and
> the shape it is now written against — `kpis`, `salesStatistics`, `saleGoal`, `totalProfit`,
> `recentTransactions`, `topSellingProducts` — shares **no field name** with revision 1. This is not
> five renamed fields; §4 and §5 are new documents. §1, §2, §3, §6 and §7 survive largely intact,
> because the route, the presets, the money rules and the throttler did not change.
>
> Revision 2 also records three things revision 1 did not have to: two blocks (§4.3, §4.4) and one
> tile (§4.1.2) have **no backing data in the schema at all**, and the role gating of §1.1 is
> **currently unexpressible** in the shipped contract (§5). Those are the parts to read first.

This document is **standalone**. It specifies one new endpoint end to end: route, guards, query
parameters, response shape with TypeScript types, the per-role block matrix, and — for every single
field — the Prisma model, the Postgres table and column it aggregates from, and the SQL shape that
produces it. You do not need to open the admin panel's plan to build from it.

> **Why it exists.** The admin panel's overview page (`app/pages/index.vue`) is being built now.
> There is **no statistics endpoint anywhere in the backend today** — the existing controllers are
> `caisse`, `catalogue` (+ `catalogue/administration`), `commandes`, `devis`, `equipe`, `profil`,
> `sante`, `vitrine`, and none of them aggregate. The panel therefore ships against a mock that
> returns exactly the contract below. When this endpoint lands, the panel deletes one file and
> changes nothing else. The contract in §4 is the interface both sides are already written against;
> **it is not a wish list, it is a signature.**

**Verified against** `../NowTech-backend-` on **2026-09-01**. Every citation is `file:line` at that
date. Note finding §6 of `BACKEND_TODO.md`: the deployed build is ahead of the local checkout, so
`git fetch` before acting on a line number.

---

## 1. The route

```
GET /v1/statistiques/apercu?periode=<preset>
```

| Aspect | Value |
| :-- | :-- |
| Suggested module | `src/statistiques/` — `statistiques.module.ts`, `statistiques.controller.ts`, `statistiques.service.ts`, `statistiques.dto.ts`, registered in `src/app.module.ts` alongside `CaisseModule` |
| Controller | `@Controller('statistiques')` |
| Handler | `@Get('apercu')` |
| Guard | `@Equipe()` — every team role may call it. **Not** `@Roles(...)`; see §2. |
| Idempotence | none — read-only |
| Cache | see §7.2 |

Guard decorators are `src/commun/garde/appelant.ts:31-40` — `Publique()`, `Roles(...roles)`,
`Equipe()`. `GardeAppelant` is registered globally in `src/app.module.ts:71-75`, deny-by-default.

### 1.1 The guard is `@Equipe()`, and the role logic lives in the service

This is the single most important structural decision in this document, so it is first.

`@Roles(...)` returns **403** when the caller lacks every listed role. That is wrong here: a
`livreur` is entitled to *part* of this response. If the route were `@Roles(direction, comptoir)` a
livreur would get 403 and the panel would have to build a second endpoint; if it were
`@Roles(direction, comptoir, preparation, livreur)` the guard would let everyone through and the
handler would still have to decide what to compute.

So: the route admits any team member, and **the service computes only the keys that caller's roles
permit and returns only those.** See §5.

**This is a requirement, not a suggestion.** Money must never cross the wire to a `livreur` — not
zeroed, not nulled, not present-but-empty. The key is **absent**. If the payload carries the number,
the boundary is already broken regardless of what the UI does with it.

> **Correction to revision 1.** That revision stated here that *"the admin panel has a component test
> asserting that a livreur payload contains no monetary figure anywhere in the rendered HTML."*
> **It does not, and it never did** — grepped across `test/` on 2026-09-01, the only `livreur`
> assertions in the suite are in the two `admin-navigation` specs, which cover which destinations the
> role sees in the navigation bar, not what the overview payload carries. Nor could such a test be
> written against the current contract: §4.0 makes every key required, so a livreur fixture without
> `kpis.productRevenue` does not type-check (§5). The claim was aspirational and it read as a
> statement of fact, which is worse than saying nothing. **The test is owed**, and it belongs with
> the three type amendments of §8 — not after them.

---

## 2. Query parameters

One parameter. Exactly one.

| Name | Type | Required | Default | Values |
| :-- | :-- | :-- | :-- | :-- |
| `periode` | string enum | no | `30j` | `aujourdhui`, `7j`, `30j`, `3mois`, `12mois` |

An unrecognised value **falls back to `30j`**; it does not 400. The panel already validates the
value client-side before sending it, so a bad value can only reach you from a hand-edited URL, and a
dashboard that errors on a typo in a query string is worse than one that shows the default month.

### 2.1 What each preset resolves to

Bounds are half-open, `[debut, fin)`, in **Africa/Douala (UTC+01:00, no DST)**. `maintenant` is the
request instant.

| `periode` | `debut` | `fin` | `granularite` | buckets |
| :-- | :-- | :-- | :-- | :-- |
| `aujourdhui` | start of today, local | `maintenant` | `heure` | ≤ 24 |
| `7j` | start of the day 6 days ago | `maintenant` | `jour` | 7 |
| `30j` | start of the day 29 days ago | `maintenant` | `jour` | 30 |
| `3mois` | start of the day 89 days ago | `maintenant` | `jour` | 90 |
| `12mois` | first day of the month 11 months ago, 00:00 | `maintenant` | `mois` | 12 |

**The comparison window** — `precedent` — is *the same length, immediately preceding `debut`*:

```
precedent.fin   = debut
precedent.debut = debut - (fin - debut)
```

For `12mois`, use calendar months rather than a duration subtraction: `precedent.debut` is the first
day of the month 23 months ago and `precedent.fin` is `debut`. A duration subtraction over a leap
year drifts by a day and makes every delta on the page subtly wrong.

### 2.2 The comparison window is clamped to the elapsed length

Every `precedent` in §4 is computed over `[precedent.debut, precedent.debut + (fin - debut))`,
**not** over the whole of `[precedent.debut, precedent.fin)`.

This matters for exactly one preset, and it matters a lot. `12mois` runs from the first day of the
month eleven months ago to *now*, so it is eleven complete months plus a fraction of the current one
— about 335 days at mid-month. Its `precedent`, counted in calendar months, is a **complete** year of
365. Compared raw, the current window is ~8 % shorter than the one it is measured against, and every
comparable figure on the page reports a decline of roughly that size — on a shop that did nothing
wrong, every single time the year is selected. That is not a subtle delta error; it is a red arrow on
three of four tiles, permanently.

The clamp is a no-op for `aujourdhui`, `7j`, `30j` and `3mois`, whose windows are already equal by
construction. Keep the calendar-month bounds — they are right, and they are what stops a leap year
from drifting the buckets — and clamp the *comparison*, which is a different question from where the
window starts.

Every field carrying a `precedent` in §4 is therefore computed **twice** with identical logic: once
over `[debut, fin)` and once over the clamped comparison window. The panel derives the percentage
itself (`app/utils/delta.ts`), so you never have to decide what a delta against zero means.

---

## 3. Money, timezone, and counting rules

Read these before §4; they apply to every field.

1. **All monetary values are integer XAF.** `prisma/schema.prisma:12-14` — *"LES MONTANTS SONT DES
   ENTIERS. Le franc CFA n'a pas de subdivision: 550000 vaut cinq cent cinquante mille."* Never
   divide by 100, never emit a decimal, never emit a string. The panel formats with
   `Intl.NumberFormat(locale, { style: "currency", currency: "XAF" })`, which renders `FCFA`.
2. **Timestamps are `Timestamptz(3)`.** Emit ISO 8601 **with offset** (`2026-09-01T00:00:00+01:00`).
   Bucket boundaries are computed in Africa/Douala, because a shop day is a local day.
3. **Cancelled and refused orders are excluded from every monetary and product aggregate**, i.e.
   `statut NOT IN ('annulee', 'refusee')`. The one exception is `recentTransactions` (§4.5), which is
   a feed of what happened rather than an aggregate: an order cancelled ten minutes ago is exactly
   what the counter needs to see.
4. **Every bucketed series is zero-filled across the whole window, ordered ascending.** A missing
   bucket is drawn as a gap by the chart and reads as "we have no data", which is a different claim
   from "we took nothing that day". Generate the spine with `generate_series` and left-join.
5. **Empty is not zero, and absent is not empty.** A measure with nothing to measure is an omitted
   key, never a `0` — `0` means "measured, and it was zero". This is the rule §4.3 and §4.4 turn on:
   a `saleGoal` with an invented target, or a `totalProfit` with an assumed margin, is a lie the
   panel cannot detect. It is also §5's rule: money withheld from a role is **absent**, not zeroed.
6. **A list ranked by a measure omits rows with none of it.** A product that sold nothing in the
   window is not a zero row (§4.6); a short window legitimately returns fewer than five.

---

## 4. Response

### 4.0 Top level

```ts
type Periode = "aujourdhui" | "7j" | "30j" | "3mois" | "12mois"
type Granularite = "heure" | "jour" | "mois"

interface StatistiquesApercu {
  periode: {
    id: Periode
    debut: string                 // ISO 8601 with offset
    fin: string
    granularite: Granularite
  }
  /** Request instant. Lets the panel show "mis à jour à HH:mm" without trusting the client clock. */
  genereLe: string

  kpis: BlocKpis                          // §4.1
  salesStatistics: BlocSalesStatistics    // §4.2
  saleGoal: BlocSaleGoal                  // §4.3 — NOT COMPUTABLE TODAY
  totalProfit: BlocTotalProfit            // §4.4 — NOT COMPUTABLE TODAY
  recentTransactions: RecentTransaction[] // §4.5
  topSellingProducts: TopSellingProduct[] // §4.6
}
```

**Every key is required.** The `blocs: BlocId[]` selector of the previous revision is gone, and with
it the mechanism §1.1 relied on to withhold money from a `livreur`. That is a regression, it is not
an oversight of this document, and §5 is now a specification of what has to be restored rather than
a description of what exists.

#### `precedent`, not `delta`

```ts
/**
 * Two integers, current window and comparison window, same logic both times.
 * The panel derives the percentage — including the divide-by-zero case — with
 * `app/utils/delta.ts`, so the backend never has to decide what "+∞ %" means.
 */
interface KpiMetric {
  valeur: number
  precedent: number
  unit?: string          // "pcs" for counts; absent for money
  isCurrency?: boolean   // true ⇒ integer XAF, rendered as FCFA
}
```

The previous revision had the backend send `delta` and `deltaSens` alongside `valeur`. It no longer
does: two representations of the same fact are two things that can disagree, and the panel already
owns the arithmetic. **Send the two measurements; send nothing derived from them.**

#### Dates and labels are instants, never strings

No field on this contract carries a human-readable date, a month abbreviation, or an English label.
The panel renders in English and French and formats everything itself, in `Africa/Douala`,
through `app/utils/dates.ts`. A bucket carries `debut` (ISO 8601 with offset); a transaction carries
`date` (ditto). `"Jan"`, `"8 May 2025"` and `"In 24 hours"` were all in the previous revision's
sample data and all three are now contract violations.

---

### 4.1 `kpis` — the four-tile strip

```ts
interface BlocKpis {
  totalSales: KpiMetric      // units sold        · unit: "pcs"
  totalStock: KpiMetric      // stock on hand     · unit: "pcs"   — see 4.1.2
  returnProducts: KpiMetric  // units returned    · unit: "pcs"
  productRevenue: KpiMetric  // XAF               · isCurrency: true
}
```

Throughout this section: `$1,$2` are `debut, fin`; `$3,$4` are the comparison window of §2.2. **`$4`
is not always `$1`** — for `12mois` it is earlier, and a query that assumes otherwise reintroduces
the artificial decline §2.2 exists to remove.

#### 4.1.1 `totalSales`, `returnProducts`, `productRevenue`

| Field | Model | Table | Columns | Citation |
| :-- | :-- | :-- | :-- | :-- |
| `totalSales` | `CommandeLigne` | `commande_lignes` | `quantite`, `commande_id` | `:510-531`, `:521` |
| window / exclusion | `Commande` | `commandes` | `cree_le`, `statut` | `:497`, `:443` |
| `returnProducts` | `Commande` | `commandes` | `statut = 'retour_ouvert'` | enum `:354-367` |
| `productRevenue` | `Commande` | `commandes` | `total_facturable_ttc`, `total_ferme_ttc`, `total_estime_ttc` | `:462`, `:459`, `:455` |

```sql
-- totalSales — units ordered, both windows in one pass
select
  coalesce(sum(cl.quantite) filter (where c.cree_le >= $1 and c.cree_le < $2), 0) as valeur,
  coalesce(sum(cl.quantite) filter (where c.cree_le >= $3 and c.cree_le < $4), 0) as precedent
from commande_lignes cl
join commandes c on c.id = cl.commande_id
where c.cree_le >= $3 and c.cree_le < $2
  and c.statut not in ('annulee', 'refusee');

-- productRevenue — billed, not collected
select
  coalesce(sum(coalesce(total_facturable_ttc, total_ferme_ttc, total_estime_ttc))
           filter (where cree_le >= $1 and cree_le < $2), 0) as valeur,
  coalesce(sum(coalesce(total_facturable_ttc, total_ferme_ttc, total_estime_ttc))
           filter (where cree_le >= $3 and cree_le < $4), 0) as precedent
from commandes
where cree_le >= $3 and cree_le < $2
  and statut not in ('annulee', 'refusee');
```

The `coalesce` ladder follows the schema's own account of those three columns: `total_estime_ttc` is
what the client saw before confirmation (`:454-455`), `total_ferme_ttc` is frozen at confirmation and
never changes (`:456-459`), `total_facturable_ttc` is recomputed on accepted lines only in a partial
delivery — *"On facture sur celui-ci, sinon on facturerait 850 000 à qui a reçu 120 000"*
(`:460-462`). Most-specific first is the only correct order.

**`productRevenue` is billed revenue, not cash collected.** It comes from `commandes`, not from
`encaissements`. The two differ by whatever is still owed, and the card is labelled "Product
Revenue". If the shop wants the collected figure instead, that is a different query on
`encaissements` and it needs a different label — do not silently swap the source.

**`returnProducts` counts units on orders currently in `retour_ouvert`**, which is the only return
signal the schema carries as a status:

```sql
select
  coalesce(sum(cl.quantite) filter (where c.cree_le >= $1 and c.cree_le < $2), 0) as valeur,
  coalesce(sum(cl.quantite) filter (where c.cree_le >= $3 and c.cree_le < $4), 0) as precedent
from commande_lignes cl
join commandes c on c.id = cl.commande_id
where c.cree_le >= $3 and c.cree_le < $2
  and c.statut = 'retour_ouvert';
```

There is a second, defensible reading: the shortfall `sum(quantite - quantite_remise)` on closed
orders (`:521-522`), which counts goods that never reached the customer rather than goods that came
back. It measures a different thing. Pick one, say which, and do not swap it later without saying so.

#### 4.1.2 `totalStock` is the one tile the schema cannot fill — GAP

The panel renders this as **a count of units, `8 430 pcs`, with a period-over-period movement.** The
backend has neither number.

- **There is no stock quantity anywhere.** `prisma/schema.prisma` has no inventory model, no
  `quantite_disponible`, no movement ledger — grepped in full on 2026-09-01. The only stock
  signal in the system is `nowtech.produits.en_stock`, a **boolean** flag
  (`src/catalogue/administration.service.ts:52`, written at `:211-213,220`, filtered at `:134-135`).
- **A boolean gives a count of products, not a count of units.** `select count(*) from
  nowtech.produits where en_stock = true and retire_le is null` answers *"how many distinct products
  are flagged available"* — a real and useful number, but not the one the tile's `pcs` unit claims.
- **There is no history at all**, so `precedent` cannot be computed by any query. `nowtech` is
  dropped and recreated wholesale on every ingestion (`prisma/schema.prisma:4-10`), so even the flag
  has no yesterday.

Three ways out, in ascending cost. **This document does not choose; it refuses to let the tile ship
on an invented number.**

1. **Relabel the tile** to "Products available" and emit the `count(*)` above, with `unit` dropped
   and `precedent` made nullable on `KpiMetric` (the panel's `computeDelta` already renders `—` for
   a null comparison — `app/utils/delta.ts`). Cheapest, honest, loses the unit count.
2. **Add a stock quantity** to `nowtech.produits` and a daily snapshot table so `precedent` exists.
   This is an ingestion change, not a Prisma migration, because that schema belongs to the vitrine.
3. **Drop the tile** until inventory is a real subsystem.

Until one is chosen, the panel is running on `server/utils/apercu-mock.ts`'s figure and the backend
must not pretend otherwise.

---

### 4.2 `salesStatistics` — the dual-curve area chart

```ts
interface SalesStatisticsPoint {
  debut: string     // ISO 8601 with offset — the bucket's opening instant
  current: number   // XAF
  previous: number  // XAF
}

interface BlocSalesStatistics {
  total: number     // XAF — MUST equal the sum of serie[].current
  currency: "XAF"
  serie: SalesStatisticsPoint[]
}
```

Same source and same `coalesce` ladder as `productRevenue` (§4.1.1), bucketed:

```sql
select date_trunc($granularite, cree_le at time zone 'Africa/Douala') as t,
       sum(coalesce(total_facturable_ttc, total_ferme_ttc, total_estime_ttc)) as montant
from commandes
where cree_le >= $1 and cree_le < $2
  and statut not in ('annulee', 'refusee')
group by 1;
```

Run it twice — once over `[$1,$2)` for `current`, once over `[$3,$4)` for `previous` — and **emit one
entry per bucket of the current window, zero-filled, ordered ascending.** Generate the spine with
`generate_series` and left-join; a missing bucket is drawn as a gap and reads as "we have no data",
which is a different claim from "we took nothing that day".

**The two series are paired positionally.** `serie[i].previous` must be the bucket of the comparison
window at the same offset from its own start as `serie[i].current` is from `debut`. Because §2.2
clamps the comparison window to the same elapsed length, the two bucket lists have the same length
by construction; if your implementation can produce a shorter `previous` list, zero-fill the tail
rather than shifting.

**`total` must equal the sum of `serie[].current`.** The panel's headline figure and its chart are
the same money; a total computed by a separate query that rounds differently is the class of
contradiction this contract exists to prevent. The admin panel has a test asserting exactly this
equality (`test/unit/apercu-endpoint.test.ts`).

---

### 4.3 `saleGoal` — the radial gauge — NOT COMPUTABLE TODAY

```ts
interface BlocSaleGoal {
  target: number      // XAF
  achieved: number    // XAF
  remaining: number   // XAF — max(0, target - achieved)
  percentage: number  // round(achieved / target * 100); may exceed 100
}
```

`achieved` is `salesStatistics.total` and needs no new query.

**`target` does not exist.** There is no sales-objective model, table, or column in
`prisma/schema.prisma` — grepped in full on 2026-09-01. The only `cible_*` columns in the schema
(`:45-46`) are `EntreeJournal`'s polymorphic audit target and have nothing to do with sales. A
target is a management input, not a derivable figure, so no aggregate can produce it.

**The minimum that makes this block real** is somewhere to put the number:

```prisma
model ObjectifVente {
  id         String   @id @default(uuid()) @db.Uuid
  /// Half-open [debut, fin) in Africa/Douala, like every other window here.
  debut      DateTime @map("debut") @db.Timestamptz(3)
  fin        DateTime @map("fin")   @db.Timestamptz(3)
  /// Integer XAF, like every other amount in this schema.
  montant    Int
  definiPar  String   @map("defini_par") @db.Uuid
  creeLe     DateTime @default(now()) @map("cree_le") @db.Timestamptz(3)

  @@index([debut, fin])
  @@map("objectifs_vente")
}
```

With that, `target` is the objective covering the request window, pro-rated by the elapsed fraction
when the window is still running — the panel's own mock already pro-rates, so the two agree.

Until the table exists: **omit `saleGoal` from the response and make the key optional on the panel
type.** Do not emit a target computed from the shop's own recent revenue — a goal the shop cannot
miss is not a goal, and the gauge would be decoration.

---

### 4.4 `totalProfit` — the stacked margin bar — NOT COMPUTABLE TODAY

```ts
interface ProfitDistributionPoint {
  debut: string     // ISO 8601 with offset
  profit: number    // XAF
  cout: number      // XAF — cost of goods
}

interface BlocTotalProfit {
  total: number     // XAF — MUST equal the sum of serie[].profit
  currency: "XAF"
  serie: ProfitDistributionPoint[]   // at most 6 buckets, spanning the window
}
```

The stack means something: **`profit + cout` is the bucket's revenue.** The previous revision paired
`profit` with `revenue` and stacked them, which drew the margin twice and made every bar taller than
the money that came in.

**Cost of goods does not exist in the system.** Nothing in `prisma/schema.prisma` or in
`nowtech.produits` records what the shop paid for anything — grepped for `cout`, `achat`,
`prix_achat`, `marge`, `revient` on 2026-09-01, no hits. Every price in the system is a selling
price: `CommandeLigne.prixCapture` and `prixFerme` (`:519-520`), and `nowtech.produits`' `prix`,
`prix_reference`, `remise_pct` (`administration.service.ts:211-213`). `prix_reference` is a
strike-through *was-price*, not a cost, and using it as one would report a discount as a margin.

**The minimum that makes this block real** is a purchase price captured on the order line:

```prisma
/// PRIX D'ACHAT AU MOMENT DE LA VENTE, capture comme prixCapture et pour la meme
/// raison: le schema `nowtech` est remplace en bloc a chaque ingestion, donc une
/// marge recalculee plus tard depuis le catalogue est une marge inventee.
prixAchatCapture Int? @map("prix_achat_capture")
```

It has to be **captured on the line**, not looked up at report time, for the reason the schema
already gives about `nomCapture` and `prixCapture` (`:315-323`): the catalogue is a dead copy by
design, and a margin recomputed against next month's catalogue is fiction.

Until the column exists: **omit `totalProfit` from the response and make the key optional on the
panel type.** A margin assumed at a flat percentage is not a measurement, and a card that looks like
one is worse than an absent card.

---

### 4.5 `recentTransactions` — the latest orders table

```ts
type TransactionStatus = "in_progress" | "delivered" | "canceled"

interface RecentTransaction {
  id: string             // Commande.id (uuid)
  orderNumber: string    // Commande.reference — "CM-9TXQR4"
  productName: string    // first line's nom_capture
  productImage?: string  // nullable; the panel renders the initial when absent
  date: string           // ISO 8601 with offset
  amount: number         // XAF
  status: TransactionStatus
}
```

Five rows, newest first.

| Field | Model | Table | Columns | Citation |
| :-- | :-- | :-- | :-- | :-- |
| `id`, `orderNumber`, `date`, `status` | `Commande` | `commandes` | `id`, `reference`, `cree_le`, `statut`, `motif_cloture` | `:436-437`, `:497`, `:443`, `:493` |
| `amount` | `Commande` | `commandes` | the `coalesce` ladder of §4.1.1 | `:455-462` |
| `productName` | `CommandeLigne` | `commande_lignes` | `nom_capture`, `rang` | `:517`, `:513` |
| `productImage` | raw SQL, schema `nowtech` | `nowtech.produit_images` | `produit_id`, `rang`, `url_source` | `administration.service.ts:150-151` |

```sql
select c.id, c.reference, c.cree_le, c.statut, c.motif_cloture,
       coalesce(c.total_facturable_ttc, c.total_ferme_ttc, c.total_estime_ttc) as montant,
       l.nom_capture, l.produit_id
from commandes c
left join lateral (
  select cl.nom_capture, cl.produit_id
  from commande_lignes cl
  where cl.commande_id = c.id
  order by cl.rang
  limit 1
) l on true
where c.cree_le >= $1 and c.cree_le < $2
order by c.cree_le desc
limit 5;
```

**Cancelled and refused orders are included here**, unlike every monetary aggregate (§3 rule 3). This
table is a feed of what happened, and an order that was cancelled ten minutes ago is exactly what the
counter needs to see.

**The status mapping is lossy, and that is a finding, not a detail.** `StatutCommande` has ten values
(`:354-367`) and `MotifCloture` six (`:397-408`); the panel's enum has three:

| `TransactionStatus` | Maps from |
| :-- | :-- |
| `delivered` | `close` with `motif_cloture in ('livree', 'livree_partielle', 'retiree')` |
| `canceled` | `annulee`, `refusee`, and `close` with `motif_cloture in ('echec_livraison', 'expiree_retrait')` |
| `in_progress` | `soumise`, `confirmee`, `en_preparation`, `prete_au_retrait`, `en_remise`, `annulation_demandee`, `retour_ouvert` |

`close` with `motif_cloture = 'sans_preuve'` fits none of them. The schema is explicit that it is
*"JAMAIS comptee comme une livraison reussie"* (`:400-404`), so it must not be `delivered`; it was
not cancelled either, and it is not in progress — it is closed and unproven. **Map it to
`in_progress` only as a stopgap and say so**, or give the panel a fourth value. A shipment nobody can
prove arrived is a category the business cares about, and flattening it into "still going" hides it.

`retour_ouvert` mapping to `in_progress` is likewise a compromise: it is counted as a return by
§4.1.1 and as in-progress here, which is consistent (the order is not finished) but means the two
cards read the same order differently. Intended; stated so nobody "fixes" it.

---

### 4.6 `topSellingProducts` — the ranked list

```ts
interface TopSellingProduct {
  id: number | string   // produit_id
  name: string          // nom_capture — never nowtech.produits.nom
  image?: string        // nullable
  sales: number         // units
  earnings: number      // XAF
}
```

Five rows, **ranked by `earnings` descending.**

```sql
with lignes as (
  select cl.produit_id, cl.quantite, cl.nom_capture, c.cree_le,
         cl.quantite * coalesce(cl.prix_ferme, cl.prix_capture) as montant
  from commande_lignes cl
  join commandes c on c.id = cl.commande_id
  where c.cree_le >= $1 and c.cree_le < $2
    and c.statut not in ('annulee', 'refusee')
)
select produit_id,
       (array_agg(nom_capture order by cree_le desc))[1] as nom,
       sum(quantite)                                     as sales,
       sum(montant)                                      as earnings
from lignes
group by produit_id
order by earnings desc
limit 5;
```

Then the thumbnail, per returned `produit_id` — the exact expression the catalogue service already
uses (`administration.service.ts:150-151`):

```sql
select i.url_source from nowtech.produit_images i
where i.produit_id = $1 order by i.rang limit 1
```

Three things that will bite you, carried forward from the previous revision because they have not
changed:

1. **`name` comes from `commande_lignes.nom_capture`, never from `nowtech.produits`.** The line
   carries a dead copy on purpose — `:315-323`: *"`slug` et `produitId` désignent le catalogue mais
   ne le RÉFÉRENCENT pas: le schéma `nowtech` est remplacé en bloc à chaque ingestion."* Most recent
   capture wins, so a renamed product shows its current name.
2. **`image` is nullable and must stay nullable.** A `produit_id` that sold last month may not exist
   after the next ingestion. Return `null`; do not fail the block and do not substitute a placeholder
   URL — the panel renders the product's initial.
3. **`sales` is `quantite`, not `quantite_remise`** (`:521-522`). `quantite` is what was ordered — the
   demand signal, which is what "top selling" means. If you prefer the fulfilment reading, say so and
   the panel relabels; do not silently swap the column.

**A product with zero units in the window is omitted, not returned as a zero row.** A short window
legitimately returns fewer than five rows, and the panel renders an empty state for zero.

**`earnings` is not `sales × a unit price`, and no consumer may assume it is.** Real lines carry
`prix_ferme` and `prix_capture` that differ between orders, so the quotient is not an integer. The
mock satisfies that divisibility only because it multiplies one shelf price, and the assertion in
`test/unit/apercu-endpoint.test.ts` that relies on it is a property of the mock, not of this
contract.

---

## 5. Role gating — a requirement the shipped contract cannot express

The previous revision carried a `blocs: BlocId[]` selector and a role matrix. **Both are gone from
the contract the panel is written against**, and §4.0 makes every key required. The consequence is
stated plainly:

> **There is no authorization boundary on this endpoint's payload today, on either side.** The mock
> returns every block, money included, to every caller. §1.1's requirement — *money must never cross
> the wire to a `livreur`, not zeroed, not nulled, absent* — is currently unmet by the panel's own
> type, because `kpis.productRevenue` is not optional.

This is the single most important gap in this document. It is not a code review finding against the
panel; it is a contract defect that has to be closed before the real module ships, and closing it
needs a decision on both sides.

### What has to change

| Side | Change |
| :-- | :-- |
| Panel (`app/types/api/statistiques.ts`) | `saleGoal`, `totalProfit`, and `kpis.productRevenue` become optional; every card already renders conditionally, and `OverviewBlocks.vue` skips a missing block |
| Backend | Compute per-role, as §1.1 requires, and **omit** the keys a role may not see |

### The matrix, once the keys are optional

Computed from `appelant.roles` (`src/commun/garde/appelant.ts:21-24`, roles enum
`prisma/schema.prisma:256-263`). A member may hold several roles (`:227-229`: *"LES ROLES SONT UN
ENSEMBLE"*), in which case **the caller receives the union**.

| Key | `direction` | `comptoir` | `preparation` | `livreur` |
| :-- | :--: | :--: | :--: | :--: |
| `kpis.totalSales` / `totalStock` / `returnProducts` | ✅ | ✅ | ✅ | ❌ |
| `kpis.productRevenue` — **money** | ✅ | ✅ | ❌ | ❌ |
| `salesStatistics` — **money** | ✅ | ✅ | ❌ | ❌ |
| `saleGoal` — **money** | ✅ | ✅ | ❌ | ❌ |
| `totalProfit` — **money** | ✅ | ❌ | ❌ | ❌ |
| `recentTransactions.amount` — **money** | ✅ | ✅ | ❌ | ❌ |
| `recentTransactions` (rest) | ✅ | ✅ | ✅ | ✅ |
| `topSellingProducts.earnings` — **money** | ✅ | ✅ | ❌ | ❌ |
| `topSellingProducts` (rest) | ✅ | ✅ | ✅ | ❌ |

`totalProfit` is `direction` only where every other money block is `direction` + `comptoir`: the
counter handles the day's takings and hiding those from the person holding them is theatre, but the
shop's **margin** is not the counter's business and knowing it changes nothing they can act on.

### Why `comptoir` sees the money

`comptoir` receives the cash at the counter (`LieuEncaissement.comptoir`, `:592-597`) and is one of
the two roles allowed to count and validate a caisse (`caisse.controller.ts:47-70`).

### Why `livreur` sees almost nothing

`livreur` may record an encaissement and read caisses (`caisse.controller.ts:17-18`, `:28-29`) but
has no business with shop-wide revenue. A livreur payload carries `recentTransactions` **with
`amount` absent from every row**, and no other key — see §1.1. The admin panel has a component test
asserting a livreur payload renders no monetary figure anywhere in the HTML; that test is the
boundary's last line of defence, and it can only pass if the number never arrives.

### Per-counter scoping is not buildable today

Scoping a `comptoir` member's figures to their own counter is the obvious next request, and it
cannot be built:

- `MembreEquipe` has **no `comptoir` column** (`prisma/schema.prisma:236-254`). It has `ville`
  (`:244`), which is not the same thing — several counters share a city.
- `Commande.comptoir` is a free `VarChar(40)` with no reference table (`:447`), so even if members
  had one, joining on it would join on a typed string.

**The one backend change per-counter dashboards would need** is a `comptoir` column on
`MembreEquipe`, drawn from the same vocabulary as `Commande.comptoir` and ideally with that
vocabulary promoted to a table.

---

## 6. Errors

Follow the existing convention; do not invent one for this endpoint.

| Case | Status | Body |
| :-- | :-- | :-- |
| No session / expired token | 401 | Nest default — `BACKEND_TODO.md` §2 |
| Not a team member, or deactivated | 403 | `'Acces refuse'`, `garde-appelant.ts:60-72` |
| Unknown `periode` | **200** | Falls back to `30j` — §2 |
| Aggregation failure | 500 | Nest default |

There is no exception filter and no error codes anywhere in the tree
(`grep -rn "ExceptionFilter\|useGlobalFilters\|@Catch" src` → 0 matches, `BACKEND_TODO.md` §2), so
the panel maps HTTP status to a translated headline and prints your French `message` verbatim
underneath. Nothing new is required of you here — just do not start returning 200 with an error
object in the body, which would defeat that mapping.

**Do not fail the whole response because one block failed.** The cross-schema reads are the fragile
ones: `nowtech.produit_images` (§4.5, §4.6) and `nowtech.produits` (§4.1.2) live in a schema the
vitrine ingestion drops and recreates wholesale. When one of them is mid-ingestion, emit the block
without its thumbnails — `productImage` and `image` are nullable precisely so this degrades instead
of 500-ing a dashboard that is otherwise fine.

---

## 7. Performance and why the shape is what it is

### 7.1 One request, one response — this is not negotiable

`src/app.module.ts:49-55` registers three throttle windows: **10 req/s, 120/min, 1000/hour**. The
`ThrottlerGuard` runs *before* the auth guard (`:71-75`), its default tracker is `req.ip`, and
`grep -rn "trust proxy" src` returns nothing — so behind Traefik, `req.ip` is the proxy's container
address and **the entire internet shares one 10 req/s bucket**. This is `BACKEND_TODO.md` §3 and it
is live today.

Consequences that are already baked into §4:

- The overview page issues **exactly one request**. A dashboard that fired one request per block
  would spend six of the ten requests available that second, and two people loading it
  simultaneously would 429 each other.
- **Changing the period re-fetches once**, and the Weekly/Monthly/Yearly tabs on the sales card
  write the same `periode` the header's range picker does — deliberately, so that two controls can
  never issue two requests for two different windows.
- **Both comparison windows are computed in the same pass** wherever possible (the `filter (where …)`
  pattern of §4.1.1), rather than as a second query. §2.2's clamp changes the bounds of the second
  filter; it does not cost an extra round trip.

If you ever fix the throttler — `app.set('trust proxy', 1)` plus a caller-keyed `getTracker` — the
BFF **already forwards `x-forwarded-for`**, so it starts working with no frontend change.

### 7.2 Caching

A 30-second server-side cache keyed on `(periode, sorted roles)` is safe and would absorb the
refresh button entirely. `staleTime` on the panel's query is already 30 s
(`app/plugins/vue-query.ts`), so the two would line up.

**Key the cache on the role set, never on the user.** Keying on `periode` alone would serve a
`direction` payload to a `livreur`, which is the exact failure §1.1 exists to prevent.

### 7.3 Indexes to add

Revision 1 listed four. Revision 2's blocks read from `commandes` and `commande_lignes` only — no
block aggregates `encaissements`, `remises_caisse` or `close_le` any more — so two of them are no
longer on this endpoint's hot path and two remain:

| Model | Index | Serves | Currently |
| :-- | :-- | :-- | :-- |
| `Commande` | `@@index([creeLe])` | §4.1, §4.2, §4.5, §4.6 — **every window in every block** | only `(client_id, cree_le)` and `(statut, cree_le)` (`:505-506`), neither of which leads on `cree_le`, so a bare window scan uses neither |
| `CommandeLigne` | `@@index([produitId])` | §4.6's `group by produit_id` | only `(slug)` and the `(commande_id, rang)` unique (`:528-529`) |

Both are additive migrations; neither changes a column, a type or a constraint.

`Encaissement(creeLe)` and `RemiseCaisse(journee)` were revision 1's other two. They are **not**
needed by this endpoint any more, because no block in §4 reads those tables. They remain good ideas
for whatever reports the cash blocks eventually move to; they are simply not this endpoint's problem.

### 7.4 Response size

Worst case is **`3mois`**, not `12mois`: its granularity is `jour`, so `salesStatistics.serie` runs to
90 points of three fields, against 12 for the year. Add at most 6 profit buckets, 5 transactions, 5
products and ~16 scalars. **Under 12 KB uncompressed.** Nothing here needs pagination, and the
`limit 5` on §4.5 and §4.6 is a design choice about the cards, not a response to a row count.

---

## 8. Response types, verbatim

Paste-ready. This is the exact contract the admin panel is written against; it lives on our side as
`app/types/api/statistiques.ts`.

```ts
export type Periode = "aujourdhui" | "7j" | "30j" | "3mois" | "12mois"
export type Granularite = "heure" | "jour" | "mois"

/**
 * `precedent` is the same measure over the comparison window of §2.2. The panel
 * derives the percentage — including the divide-by-zero case — so the payload
 * never carries a delta the backend and the UI could disagree on.
 */
export interface KpiMetric {
  valeur: number
  precedent: number
  unit?: string
  isCurrency?: boolean
}

/** `debut` is the bucket's opening instant; the label is formatted per locale. */
export interface SalesStatisticsPoint {
  debut: string
  current: number
  previous: number
}

export interface SalesStatisticsData {
  total: number
  currency: string
  serie: SalesStatisticsPoint[]
}

export interface SaleGoalData {
  target: number
  achieved: number
  remaining: number
  percentage: number
}

/** `profit + cout` is the bucket's revenue, which is what makes the bar stackable. */
export interface ProfitDistributionPoint {
  debut: string
  profit: number
  cout: number
}

export interface TotalProfitData {
  total: number
  currency: string
  serie: ProfitDistributionPoint[]
}

export type TransactionStatus = "in_progress" | "delivered" | "canceled"

export interface RecentTransactionItem {
  id: string
  orderNumber: string
  productName: string
  productImage?: string
  date: string
  amount: number
  status: TransactionStatus
}

export interface TopSellingProductItem {
  id: number | string
  name: string
  image?: string
  sales: number
  earnings: number
}

export interface ApiStatistiquesApercu {
  periode: {
    id: Periode
    debut: string
    fin: string
    granularite: Granularite
  }
  genereLe: string
  kpis: {
    totalSales: KpiMetric
    totalStock: KpiMetric
    returnProducts: KpiMetric
    productRevenue: KpiMetric
  }
  salesStatistics: SalesStatisticsData
  saleGoal: SaleGoalData
  totalProfit: TotalProfitData
  recentTransactions: RecentTransactionItem[]
  topSellingProducts: TopSellingProductItem[]
}
```

**This is the shape as it stands, not the shape that should ship.** Three amendments follow from §4
and §5 and have to be made before the real module is built:

| Amendment | Because |
| :-- | :-- |
| `saleGoal?` and `totalProfit?` optional | §4.3 and §4.4 have no backing data; the backend must be able to omit them rather than invent them |
| `kpis.productRevenue?` optional, and `amount?` / `earnings?` optional on the two lists | §5 — a `livreur` payload must carry no monetary key at all, and today the type forbids omitting one |
| `KpiMetric.precedent` → `number \| null` | §4.1.2 — stock has no history, and `computeDelta` already renders `—` for a null comparison |

---

### 8.1 One request, if you are willing

If you add `@ApiOkResponse({ type: … })` and response DTO classes for this one handler, it becomes
the first typed response in the API (`BACKEND_TODO.md` §1 — 27 operations render as
`{"type":"object"}`, 28 have no schema at all, and only the Terminus health check is genuinely
typed). We would still hand-write the type, because one typed endpoint does not make codegen
viable — but it would be the first brick, and this is the cheapest possible place to lay it.

---

## 9. Method, and what this document did not examine

**Method (revision 2).** Re-read `../NowTech-backend-` at the local checkout on 2026-09-01 against
the shipped panel contract. New for this revision: `prisma/schema.prisma` grepped in full for stock,
cost and target vocabulary (`stock`, `inventaire`, `quantite_disponible`, `cout`, `achat`,
`prix_achat`, `marge`, `revient`, `objectif`, `cible`, `target`) — the three negative results in
§4.1.2, §4.3 and §4.4 are that grep, not an impression; `src/catalogue/administration.service.ts`
re-read for `nowtech.produits`' real column list, which is where `en_stock`'s being a boolean comes
from (`:52`, `:211-213`, `:220`); `StatutCommande` (`:354-367`) and `MotifCloture` (`:397-408`)
enumerated in full for §4.5's mapping table; `src/commun/reference.ts` for the `CM-` reference
format. Revision 1's method follows, unchanged, and its citations were spot-checked rather than
re-derived.

**Method (revision 1).** Read `../NowTech-backend-` at the local checkout on 2026-09-01:
`prisma/schema.prisma` in full (700 lines), the eight existing controllers for route shape and role
guards, `src/catalogue/administration.service.ts` for the two raw-SQL cross-schema access patterns
(`nowtech.produit_images`, `arbitrage.propositions`), `src/commun/garde/appelant.ts` for the guard
decorators, and `src/app.module.ts` for guard ordering and throttler configuration. Cross-checked
against `BACKEND_TODO.md`, which records findings verified against the running deployment on the
same date.

**Not examined, and therefore not claimed:**

- **No query was executed and no query plan was measured.** Every performance statement in §7 is
  read off the schema's declared indexes, not off `EXPLAIN`. The two indexes in §7.3 are reasoned
  from the predicates, not benchmarked.
- **No production data volumes were seen.** "Under 12 KB" (§7.4) is arithmetic on the contract, not
  a measurement. The `limit 5` in §4.5 and §4.6 is a design choice about the cards, not a response to
  an observed row count.
- **`arbitrage.propositions` was read only through the service that queries it**, for revision 1's
  action-queue block. No block in revision 2's §4 reads it, so nothing here depends on that reading.
- **`nowtech.*` was read only through the same route.** Its DDL is generated by the vitrine's
  `export/schema.sql`, which was not opened.
- **The deployed build is ahead of the local checkout** (`BACKEND_TODO.md` §6). The 47 paths matched
  at last check and no structural fact here depends on a line that has moved, but re-verify a
  citation before editing at it.
- **Nothing about authentication, session refresh, or the BFF** — those are settled elsewhere and
  are unaffected by this endpoint.
- **No opinion on whether per-counter scoping should be built.** §5 states only that the schema
  cannot support it today and names the single column that would change that.
- **No opinion on what the sales target should be, or what the shop's margin is.** §4.3 and §4.4
  name where those numbers would have to live; choosing them is a management decision and this
  document does not make it.
- **The panel's mock was not audited as a source of truth.** `server/utils/apercu-mock.ts` models a
  plausible shop so the UI can be built and reviewed; none of its constants — the 1 430 000 XAF daily
  base, the 23.5 % margin, the 42 000 XAF blended unit price — is a claim about NowTech's real
  trading, and no figure in this document is derived from it.

---

## 10. Summary for a hurried reader

1. New route `GET /v1/statistiques/apercu`, guard `@Equipe()`, one optional query parameter
   `periode` from a five-value enum, defaulting to `30j`.
2. **Revision 2 replaced the response wholesale.** It is
   `{ periode, genereLe, kpis, salesStatistics, saleGoal, totalProfit, recentTransactions,
   topSellingProducts }`. Revision 1's `blocs`/`encaisse`/`livraison`/`produits`/`mix`/`caisse`/
   `aTraiter`/`operations` share no field name with it. Do not build from §4 of revision 1.
3. **Three things on this page have no data behind them.** `saleGoal.target` (§4.3 — no objective
   exists anywhere), `totalProfit` (§4.4 — no cost of goods exists anywhere), and `totalStock`
   (§4.1.2 — `nowtech.produits.en_stock` is a boolean flag, so there is no unit count and no
   history). Each section names the minimum schema change. **Omit the key; do not invent the number.**
4. **Role gating is currently unexpressible** (§5). Every key on the shipped type is required, so
   `kpis.productRevenue` cannot be withheld from a `livreur`. Three fields must become optional
   before §1.1's boundary can exist at all. This is the gap to close first.
5. Send `valeur` and `precedent`; send nothing derived from them. The panel owns the percentage.
6. **Clamp the comparison window to the elapsed length** (§2.2). `12mois` otherwise measures ~335
   days against 365 and reports a permanent ~8 % decline that never happened.
7. All money is integer XAF. No field carries a formatted date, a month name, or an English label —
   the panel formats every instant itself, in Africa/Douala.
8. `salesStatistics.total` must equal the sum of its own series, and `totalProfit.total` the sum of
   its `profit` values. `profit + cout` is the bucket's revenue — the stack has to add up.
9. **One request per page load.** The throttler is a shared 10 req/s ceiling across the whole
   internet; this shape exists because of it.
10. Two additive indexes are needed: `Commande(creeLe)` and `CommandeLigne(produitId)`.
11. `close` + `motif_cloture = 'sans_preuve'` fits none of the panel's three transaction statuses
    (§4.5). It is never a successful delivery (`:400-404`); flattening it into `in_progress` is a
    stopgap that hides a category the business cares about.
12. Per-counter scoping needs a `comptoir` column on `MembreEquipe`. It does not exist.
