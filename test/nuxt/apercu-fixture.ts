import type { ApiStatistiquesApercu } from "@/types/api/statistiques"

export const DATE_TRANSACTION = "2026-08-31T15:20:00.000Z"

/** One coherent `30j` payload in the shape returned by the statistics backend. */
export const apercuFixture: ApiStatistiquesApercu = {
  periode: {
    id: "30j",
    debut: "2026-08-03T00:00:00+01:00",
    fin: "2026-09-01T12:00:00+01:00",
    granularite: "jour",
  },
  genereLe: "2026-09-01T12:00:00+01:00",
  kpis: {
    totalSales: { valeur: 1024, precedent: 968, unit: "pcs" },
    totalStock: { valeur: 8430, precedent: 7920, unit: "pcs" },
    returnProducts: { valeur: 25, precedent: 31, unit: "pcs" },
    productRevenue: { valeur: 43_008_000, precedent: 40_656_000, isCurrency: true },
  },
  salesStatistics: {
    total: 43_008_000,
    currency: "XAF",
    serie: [
      { debut: "2026-08-03T00:00:00+01:00", current: 1_420_000, previous: 1_310_000 },
      { debut: "2026-08-04T00:00:00+01:00", current: 1_505_000, previous: 1_402_000 },
    ],
  },
  totalProfit: {
    status: "complete",
    total: 10_106_880,
    currency: "XAF",
    serie: [
      { debut: "2026-08-03T00:00:00+01:00", profit: 5_053_440, cout: 16_450_560 },
      { debut: "2026-08-18T00:00:00+01:00", profit: 5_053_440, cout: 16_450_560 },
    ],
  },
  recentTransactions: [
    {
      id: "tx-1",
      orderNumber: "CM-9TXQR4",
      productName: "Routeur TP-Link Archer AX55 Wi-Fi 6",
      date: DATE_TRANSACTION,
      amount: 173_000,
      status: "in_progress",
    },
  ],
  topSellingProducts: [
    {
      id: 4128,
      name: "HP ProBook 450 G10 — i5 16 Go",
      sales: 9,
      earnings: 5_625_000,
    },
  ],
}

/**
 * The chart pair is stubbed everywhere the overview is mounted: `vue-chrts`
 * measures and animates against a real layout engine, which happy-dom never
 * settles, and an unstubbed mount hangs until the test times out.
 */
export const stubsGraphiques = {
  AreaChart: { template: '<div class="stub-area-chart" />' },
  BarChart: { template: '<div class="stub-bar-chart" />' },
}
