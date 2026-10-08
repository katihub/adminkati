/**
 * `GET /v1/statistiques/apercu` — overview dashboard API contracts.
 */

export type Periode = "aujourdhui" | "7j" | "30j" | "3mois" | "12mois"
export type Granularite = "heure" | "jour" | "mois"

/**
 * `precedent` is the same measure over the immediately preceding window of equal
 * length (spec §2.1). The panel derives the percentage itself with `computeDelta`,
 * so the payload never carries a delta the backend and the UI could disagree on.
 */
/** Mirrors `src/statistiques/statistiques.service.ts:306-314` in NowTech-backend-. */
export interface KpiMetric {
  valeur: number
  precedent: number | null
  unit?: string
  isCurrency?: boolean
}

/** `debut` is the bucket's opening instant; the label is formatted per locale. */
export interface SalesStatisticsPoint {
  debut: string
  current: number
  previous: number
}

/** Mirrors `src/statistiques/statistiques.service.ts:323-324,376-400` in NowTech-backend-. */
export interface SalesStatisticsData {
  total: number
  currency: string
  serie: SalesStatisticsPoint[]
}

/** Mirrors `src/statistiques/statistiques.service.ts:28-34` in NowTech-backend-. */
export interface CatalogueSummaryData {
  totalProducts: number
  totalBrands: number
  totalDepartments: number
  totalCategories: number
}

/** `profit + cout` is the bucket's revenue, which is what makes the bar stackable. */
export interface ProfitDistributionPoint {
  debut: string
  profit: number
  cout: number
}

/** Mirrors `src/statistiques/statistiques.service.ts:405-445` in NowTech-backend-. */
export interface TotalProfitData {
  status: "complete"
  total: number
  currency: string
  serie: ProfitDistributionPoint[]
}

/** Mirrors `src/statistiques/statistiques.service.ts:421-435` in NowTech-backend-. */
export interface IncompleteTotalProfitData {
  status: "incomplete"
  missingCostLines: number
}

export type TotalProfit = TotalProfitData | IncompleteTotalProfitData

/** Mirrors `src/statistiques/statistiques.service.ts:229-235` in NowTech-backend-. */
export type TransactionStatus = "in_progress" | "delivered" | "canceled" | "unverified"

/** Mirrors `src/statistiques/statistiques.service.ts:277-285` in NowTech-backend-. */
export interface RecentTransactionItem {
  id: string
  orderNumber: string
  productName: string
  productImage?: string | null
  date: string
  amount?: number
  status: TransactionStatus
}

/** Mirrors `src/statistiques/statistiques.service.ts:299-305` in NowTech-backend-. */
export interface TopSellingProductItem {
  id: number | string
  name: string
  image?: string | null
  sales: number
  earnings?: number
}

/** Mirrors `src/statistiques/statistiques.service.ts:316-339` in NowTech-backend-. */
export interface ApiStatistiquesApercu {
  periode: {
    id: Periode
    debut: string
    fin: string
    granularite: Granularite
  }
  genereLe: string
  catalogueSummary?: CatalogueSummaryData
  kpis?: {
    totalSales?: KpiMetric
    totalStock?: KpiMetric
    returnProducts?: KpiMetric
    productRevenue?: KpiMetric
  }
  salesStatistics?: SalesStatisticsData
  totalProfit?: TotalProfit
  recentTransactions: RecentTransactionItem[]
  topSellingProducts?: TopSellingProductItem[]
}
