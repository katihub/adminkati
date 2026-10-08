import type {
  Granularite,
  ProfitDistributionPoint,
  RecentTransactionItem,
  SalesStatisticsPoint,
  TopSellingProductItem,
  TransactionStatus,
} from "@/types/api/statistiques"
import { DECALAGE_DOUALA_MS } from "./periode-bounds"

/**
 * The stand-in dataset for `GET /v1/statistiques/apercu` until the backend module
 * of `reports/2026-09-01-spec-statistiques-apercu.md` exists. It models one shop:
 * a Douala IT and telecom reseller, open 08:00-19:00, dead on Sunday, busiest at
 * the September school reopening and in December.
 *
 * Two rules hold everywhere below, and the endpoint's tests assert them rather
 * than the literals:
 *
 * 1. **Every figure is integer XAF.** `../NowTech-backend-/prisma/schema.prisma:12-14`
 *    — the franc has no subdivision. Nothing here is divided by 100.
 * 2. **Every figure derives from one revenue curve.** Units, returns, profit,
 *    profit distribution and the per-product rows are all functions of it, so no two cards
 *    can contradict each other the way independent literals would.
 */

const MS_JOUR = 86_400_000

/** ~18 orders a day at a ~79 000 XAF average basket. */
const BASE_JOURNALIERE_XAF = 1_430_000

/** Blended across the whole catalogue, accessories included — not the top rows. */
const PRIX_MOYEN_UNITE_XAF = 42_000

const TAUX_RETOUR = 0.024

/** Units on hand right now. A level, not a flow: it does not scale with the period. */
const STOCK_ACTUEL = 8430

/**
 * Net shelf movement, not the restocking rate. The shop buys a little ahead of
 * what it sells, so the level creeps up; deriving `precedent` from the gross
 * intake instead would have the shelves holding fewer units a year ago than the
 * year sold, which no warehouse can do.
 */
const CROISSANCE_STOCK_PAR_JOUR = 2.1

/** Sunday is nearly dead, Saturday is the best day. Indexed by local weekday. */
const POIDS_JOUR = [0.32, 1, 1.04, 0.98, 1.06, 1.12, 1.18]

/**
 * Indexed by local hour. Zero outside 07:00-20:00 — the first and last hours are
 * thin rather than absent, and `HEURE_OUVERTURE`/`HEURE_FERMETURE` below name the
 * same range, so revenue is never attributed to an hour no order can land in.
 */
const POIDS_HEURE = [
  0, 0, 0, 0, 0, 0, 0, 0.18, 0.62, 1.02, 1.26, 1.3, 0.71, 0.55, 1.08, 1.21, 1.16, 0.94, 0.58, 0.24, 0, 0, 0, 0,
]

/** Rentree scolaire in September and the December holidays carry the year. */
const POIDS_MOIS = [0.82, 0.88, 0.95, 0.97, 1, 0.93, 0.9, 1.08, 1.24, 1.02, 1.05, 1.3]

const SOMME_POIDS_HEURE = POIDS_HEURE.reduce((a, b) => a + b, 0)
const MOYENNE_POIDS_JOUR = POIDS_JOUR.reduce((a, b) => a + b, 0) / POIDS_JOUR.length

/**
 * Eight rows of the real catalogue's shape — `nowtech.produits` is networking,
 * print, power and mobile, not fashion. `unitesParJour` is what each one actually
 * moves; together they are ~62 % of revenue on ~18 % of the units, the rest being
 * cables, connectors and consumables that never reach a top-five list.
 */
const CATALOGUE = [
  {
    id: 4128,
    nom: "HP ProBook 450 G10 — i5 16 Go",
    prix: 625_000,
    unitesParJour: 0.3,
    image: "/mock/produits/portable.webp",
  },
  {
    id: 2077,
    nom: "Switch Cisco Catalyst 1000 24 ports",
    prix: 452_000,
    unitesParJour: 0.233,
    image: "/mock/produits/reseau.webp",
  },
  {
    id: 3391,
    nom: "Imprimante HP LaserJet Pro M404dn",
    prix: 318_000,
    unitesParJour: 0.367,
    image: "/mock/produits/impression.webp",
  },
  {
    id: 1844,
    nom: "Onduleur APC Back-UPS 1200 VA",
    prix: 147_500,
    unitesParJour: 0.867,
    image: "/mock/produits/energie.webp",
  },
  {
    id: 5023,
    nom: "Tecno Spark 20 Pro 256 Go",
    prix: 134_000,
    unitesParJour: 1.033,
    image: "/mock/produits/telephone.webp",
  },
  {
    id: 2610,
    nom: "Routeur TP-Link Archer AX55 Wi-Fi 6",
    prix: 86_500,
    unitesParJour: 1.267,
    image: "/mock/produits/reseau.webp",
  },
  {
    id: 1207,
    nom: "Câble UTP Cat 6 Nexans — touret 305 m",
    prix: 64_000,
    unitesParJour: 0.4,
    image: "/mock/produits/reseau.webp",
  },
  {
    id: 4455,
    nom: "Caméra Hikvision DS-2CD1043G2 4 MP",
    prix: 47_500,
    unitesParJour: 1.533,
    image: "/mock/produits/camera.webp",
  },
]

/**
 * The reference alphabet of `../NowTech-backend-/src/commun/reference.ts:15` — the
 * confusable pairs are already gone from it because a reference gets dictated
 * over the phone.
 */
const ALPHABET_REFERENCE = "34679ACDEFGHJKMNPQRTUVWXY"

/**
 * Deterministic, so a refetch and the SSR pass agree and the chart never jumps
 * under the user. Seeded by the bucket's own instant rather than by call order,
 * so a bucket keeps its value whichever period asked for it.
 */
function bruit(graine: number, amplitude = 0.14): number {
  let t = (graine | 0) + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const u = ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  return 1 - amplitude + u * amplitude * 2
}

function graineDe(instant: Date, sel: number): number {
  return Math.floor(instant.getTime() / 1000) + sel * 7919
}

interface PartsLocales {
  heure: number
  jourSemaine: number
  mois: number
  joursDansLeMois: number
}

/** Africa/Douala has no DST, so one fixed shift is the whole timezone. */
function partsLocales(instant: Date): PartsLocales {
  const local = new Date(instant.getTime() + DECALAGE_DOUALA_MS)
  return {
    heure: local.getUTCHours(),
    jourSemaine: local.getUTCDay(),
    mois: local.getUTCMonth(),
    joursDansLeMois: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate(),
  }
}

function avanceLocale(instant: Date, granularite: Granularite): Date {
  const local = new Date(instant.getTime() + DECALAGE_DOUALA_MS)
  if (granularite === "heure") local.setUTCHours(local.getUTCHours() + 1)
  else if (granularite === "jour") local.setUTCDate(local.getUTCDate() + 1)
  else local.setUTCMonth(local.getUTCMonth() + 1)
  return new Date(local.getTime() - DECALAGE_DOUALA_MS)
}

/** Opening instants of every bucket of `[debut, fin)`, in order. */
function seaux(debut: Date, fin: Date, granularite: Granularite): Date[] {
  const liste: Date[] = []
  let curseur = debut
  while (curseur.getTime() < fin.getTime() && liste.length < 400) {
    liste.push(curseur)
    curseur = avanceLocale(curseur, granularite)
  }
  return liste
}

/**
 * How much of a bucket has actually happened. Without it the current day always
 * draws as a full day and the last point of every chart is a cliff.
 */
function fractionEcoulee(debutSeau: Date, fin: Date, granularite: Granularite): number {
  const finSeau = avanceLocale(debutSeau, granularite)
  if (fin.getTime() >= finSeau.getTime()) return 1
  if (granularite === "heure") return Math.max(0, (fin.getTime() - debutSeau.getTime()) / 3_600_000)

  const { heure } = partsLocales(fin)
  if (granularite === "jour") return POIDS_HEURE.slice(0, heure + 1).reduce((a, b) => a + b, 0) / SOMME_POIDS_HEURE

  return (fin.getTime() - debutSeau.getTime()) / (finSeau.getTime() - debutSeau.getTime())
}

/**
 * The shop's expected revenue for one bucket before the day's luck is applied.
 * The realised series applies deterministic noise to this baseline.
 */
// fallow-ignore-next-line complexity
function revenusAttendusSeau(debutSeau: Date, fin: Date, granularite: Granularite): number {
  const { heure, jourSemaine, mois, joursDansLeMois } = partsLocales(debutSeau)
  const saison = POIDS_MOIS[mois] ?? 1

  let brut: number
  if (granularite === "heure")
    brut =
      BASE_JOURNALIERE_XAF * ((POIDS_HEURE[heure] ?? 0) / SOMME_POIDS_HEURE) * (POIDS_JOUR[jourSemaine] ?? 1) * saison
  else if (granularite === "jour") brut = BASE_JOURNALIERE_XAF * (POIDS_JOUR[jourSemaine] ?? 1) * saison
  else brut = BASE_JOURNALIERE_XAF * joursDansLeMois * MOYENNE_POIDS_JOUR * saison

  return brut * fractionEcoulee(debutSeau, fin, granularite)
}

function revenusSeau(debutSeau: Date, fin: Date, granularite: Granularite): number {
  return Math.round(revenusAttendusSeau(debutSeau, fin, granularite) * bruit(graineDe(debutSeau, 1)))
}

function serieRevenus(debut: Date, fin: Date, granularite: Granularite): { debut: Date; valeur: number }[] {
  return seaux(debut, fin, granularite).map(d => ({ debut: d, valeur: revenusSeau(d, fin, granularite) }))
}

function somme(valeurs: number[]): number {
  return valeurs.reduce((a, b) => a + b, 0)
}

export interface FenetreApercu {
  debut: Date
  fin: Date
  precedentDebut: Date
  precedentFin: Date
  granularite: Granularite
}

/** Days of real elapsed time in the window — fractional for a period still running. */
function dureeEnJours(fenetre: FenetreApercu): number {
  return (fenetre.fin.getTime() - fenetre.debut.getTime()) / MS_JOUR
}

/**
 * The slice of the older window the current one can honestly be measured against.
 *
 * `resolvePeriodeBounds` hands `12mois` a **complete** calendar year to compare a
 * still-running one against — spec §2.1 counts in calendar months so that a leap
 * year cannot drift the bounds, which is right, but it leaves the older side ~8 %
 * more days. Summed raw, that gap alone paints a red arrow on sales, revenue and
 * returns every time the year is selected, with nothing in the model behind it.
 * Truncating the comparison to the elapsed length is the like-for-like reading the
 * delta pill claims to show. Every other preset already compares equal windows, so
 * the clamp is a no-op there.
 */
export function fenetreComparable(fenetre: FenetreApercu): { debut: Date; fin: Date } {
  const ecoule = fenetre.fin.getTime() - fenetre.debut.getTime()
  return {
    debut: fenetre.precedentDebut,
    fin: new Date(Math.min(fenetre.precedentDebut.getTime() + ecoule, fenetre.precedentFin.getTime())),
  }
}

export function revenusPeriode(fenetre: FenetreApercu): { courant: number; precedent: number } {
  const comparable = fenetreComparable(fenetre)
  return {
    courant: somme(serieRevenus(fenetre.debut, fenetre.fin, fenetre.granularite).map(p => p.valeur)),
    precedent: somme(serieRevenus(comparable.debut, comparable.fin, fenetre.granularite).map(p => p.valeur)),
  }
}

export function buildKpis(fenetre: FenetreApercu) {
  const revenus = revenusPeriode(fenetre)
  const unites = Math.round(revenus.courant / PRIX_MOYEN_UNITE_XAF)
  const unitesPrecedentes = Math.round(revenus.precedent / PRIX_MOYEN_UNITE_XAF)
  const mouvementStock = Math.round(CROISSANCE_STOCK_PAR_JOUR * dureeEnJours(fenetre))

  return {
    totalSales: { valeur: unites, precedent: unitesPrecedentes, unit: "pcs" },
    // The stock on hand is the same number whatever period is selected; what the
    // period changes is how far back `precedent` reaches for the comparison.
    totalStock: { valeur: STOCK_ACTUEL, precedent: STOCK_ACTUEL - mouvementStock, unit: "pcs" },
    returnProducts: {
      valeur: Math.round(unites * TAUX_RETOUR),
      precedent: Math.round(unitesPrecedentes * TAUX_RETOUR),
      unit: "pcs",
    },
    productRevenue: { valeur: revenus.courant, precedent: revenus.precedent, isCurrency: true },
  }
}

export function buildSalesStatistics(fenetre: FenetreApercu): {
  total: number
  currency: string
  serie: SalesStatisticsPoint[]
} {
  const comparable = fenetreComparable(fenetre)
  const courant = serieRevenus(fenetre.debut, fenetre.fin, fenetre.granularite)
  const precedent = serieRevenus(comparable.debut, comparable.fin, fenetre.granularite)

  return {
    total: somme(courant.map(p => p.valeur)),
    currency: "XAF",
    serie: courant.map((point, i) => ({
      debut: point.debut.toISOString(),
      current: point.valeur,
      previous: precedent[i]?.valeur ?? 0,
    })),
  }
}

const SEAUX_PROFIT = 6

export function buildTotalProfit(fenetre: FenetreApercu): {
  total: number
  currency: string
  serie: ProfitDistributionPoint[]
} {
  const points = serieRevenus(fenetre.debut, fenetre.fin, fenetre.granularite)
  if (points.length === 0) return { total: 0, currency: "XAF", serie: [] }

  const groupes = Math.min(SEAUX_PROFIT, points.length)
  const taille = Math.ceil(points.length / groupes)
  const serie: ProfitDistributionPoint[] = []

  for (let i = 0; i < points.length; i += taille) {
    const tranche = points.slice(i, i + taille)
    const revenu = somme(tranche.map(p => p.valeur))
    // Hardware resale runs on a thin margin, and it moves with the mix: a month
    // heavy on laptops earns less of every franc than one heavy on consumables.
    const marge = 0.235 * bruit(graineDe(tranche[0]!.debut, 2), 0.18)
    const profit = Math.round(revenu * marge)
    serie.push({ debut: tranche[0]!.debut.toISOString(), profit, cout: revenu - profit })
  }

  return { total: somme(serie.map(p => p.profit)), currency: "XAF", serie }
}

function reference(graine: number): string {
  let sortie = ""
  for (let i = 0; i < 6; i++) {
    const u = bruit(graine + i * 31, 0.5) - 0.5
    sortie += ALPHABET_REFERENCE[Math.floor(u * ALPHABET_REFERENCE.length * 2) % ALPHABET_REFERENCE.length]
  }
  return `CM-${sortie}`
}

/** Roughly one order every 80 minutes of opening time, walked back from now. */
const ESPACEMENT_COMMANDE_MS = 80 * 60 * 1000
const HEURE_OUVERTURE = 7
const HEURE_FERMETURE = 20
const NB_TRANSACTIONS = 5

function statutSelonAge(instant: Date, fin: Date, graine: number): TransactionStatus {
  const ageHeures = (fin.getTime() - instant.getTime()) / 3_600_000
  if (ageHeures < 4) return "in_progress"
  return bruit(graine, 0.5) < 0.56 ? "canceled" : "delivered"
}

// fallow-ignore-next-line complexity
export function buildRecentTransactions(fenetre: FenetreApercu): RecentTransactionItem[] {
  const transactions: RecentTransactionItem[] = []

  for (let k = 0; transactions.length < NB_TRANSACTIONS && k < 400; k++) {
    const instant = new Date(fenetre.fin.getTime() - k * ESPACEMENT_COMMANDE_MS)
    if (instant.getTime() < fenetre.debut.getTime()) break

    const { heure } = partsLocales(instant)
    if (heure < HEURE_OUVERTURE || heure >= HEURE_FERMETURE) continue

    const graine = graineDe(instant, 3)
    const produit = CATALOGUE[Math.floor(bruit(graine, 0.5) * CATALOGUE.length) % CATALOGUE.length]!
    // Big-ticket items leave one at a time; accessories go out by the handful.
    const quantite = produit.prix > 300_000 ? 1 : 1 + Math.floor(bruit(graine + 11, 0.5) * 3)

    transactions.push({
      id: `mock-${instant.getTime()}`,
      orderNumber: reference(graine),
      productName: produit.nom,
      productImage: produit.image,
      date: instant.toISOString(),
      amount: produit.prix * quantite,
      status: statutSelonAge(instant, fenetre.fin, graine + 23),
    })
  }

  return transactions
}

const NB_TOP_PRODUITS = 5

export function buildTopSellingProducts(fenetre: FenetreApercu): TopSellingProductItem[] {
  const jours = dureeEnJours(fenetre)

  return (
    CATALOGUE.map(produit => {
      const ventes = Math.round(produit.unitesParJour * jours * bruit(graineDe(fenetre.debut, produit.id)))
      // `earnings` is never an independent figure: it is the units times the shelf
      // price, so the two columns of the card can never disagree.
      return { id: produit.id, name: produit.nom, image: produit.image, sales: ventes, earnings: ventes * produit.prix }
    })
      // A day that has not sold a laptop yet must not claim it sold one.
      .filter(produit => produit.sales > 0)
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, NB_TOP_PRODUITS)
  )
}
