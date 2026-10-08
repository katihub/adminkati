import type { ApiStatistiquesApercu } from "@/types/api/statistiques"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import StatsKpiCard from "@/components/stats/KpiCard.vue"
import StatsKpiGrid from "@/components/stats/KpiGrid.vue"
import StatsOverviewBlocks from "@/components/stats/OverviewBlocks.vue"
import StatsRecentTransactionsCard from "@/components/stats/RecentTransactionsCard.vue"
import StatsTopSellingProductsCard from "@/components/stats/TopSellingProductsCard.vue"
import { apercuFixture, stubsGraphiques } from "./apercu-fixture"

type CompleteKpis = Required<NonNullable<ApiStatistiquesApercu["kpis"]>>
type TopSellingProducts = NonNullable<ApiStatistiquesApercu["topSellingProducts"]>

function completeKpis(): CompleteKpis {
  return apercuFixture.kpis as CompleteKpis
}

function preparationPayload(): ApiStatistiquesApercu {
  const { productRevenue: _productRevenue, ...kpis } = completeKpis()
  const {
    salesStatistics: _salesStatistics,
    totalProfit: _totalProfit,
    topSellingProducts: _topSellingProducts,
    ...payload
  } = apercuFixture

  return {
    ...payload,
    kpis: {
      ...kpis,
      totalStock: {
        ...kpis.totalStock,
        precedent: null,
      },
    },
    recentTransactions: [
      {
        id: "tx-redacted",
        orderNumber: "CM-REDACTED",
        productName: "Redacted product",
        date: "2026-09-01T12:00:00.000Z",
        status: "unverified",
      },
    ],
    topSellingProducts: [
      {
        id: "product-redacted",
        name: "Operational product",
        sales: 3,
      },
    ],
  } as unknown as ApiStatistiquesApercu
}

function redactedTransaction(status: "delivered" | "unverified") {
  return [
    {
      id: "tx-redacted",
      orderNumber: "CM-REDACTED",
      productName: "Redacted product",
      date: "2026-09-01T12:00:00.000Z",
      status,
    },
  ] as unknown as ApiStatistiquesApercu["recentTransactions"]
}

function redactedProduct(): TopSellingProducts {
  return [
    {
      id: "product-redacted",
      name: "Operational product",
      sales: 3,
    },
  ] as TopSellingProducts
}

describe("role-safe overview statistics", () => {
  it("does not render the stock KPI when the API omits it for a redacted role", async () => {
    const { totalStock: _totalStock, ...kpis } = completeKpis()
    const wrapper = await mountSuspended(StatsKpiGrid, {
      props: {
        kpis: kpis as unknown as ApiStatistiquesApercu["kpis"],
        periode: apercuFixture.periode.id,
      },
    })

    expect(wrapper.text()).not.toContain("Total Products in stock")

    wrapper.unmount()
  })

  it("renders an operational payload without attempting to render omitted financial cards", async () => {
    const wrapper = await mountSuspended(StatsOverviewBlocks, {
      props: { data: preparationPayload() },
      global: { stubs: stubsGraphiques },
    })

    expect(wrapper.text()).not.toContain("Product Revenue")
    expect(wrapper.text()).not.toContain("Sales Statistics")
    expect(wrapper.text()).not.toContain("Total Profit")

    wrapper.unmount()
  })

  it("marks stock movement unavailable until the backend provides a truthful snapshot baseline", async () => {
    const wrapper = await mountSuspended(StatsKpiCard, {
      props: {
        title: "Total Products in stock",
        valeur: 8_430,
        precedent: null as unknown as number,
        periodLabel: "Net movement",
        unit: "pcs",
        icon: "ph:package",
        showAbsoluteDelta: true,
      },
    })

    expect(wrapper.text()).toContain("N/A")
    expect(wrapper.text()).not.toContain("+8,430 pcs")

    wrapper.unmount()
  })

  it("does not render a monetary transaction column when the API redacts amounts", async () => {
    const wrapper = await mountSuspended(StatsRecentTransactionsCard, {
      props: { transactions: redactedTransaction("delivered") },
    })

    expect(wrapper.get("thead").text()).not.toContain("Amount")
    expect(wrapper.text()).not.toContain("NaN")

    wrapper.unmount()
  })

  it("labels an unproven delivery distinctly", async () => {
    const wrapper = await mountSuspended(StatsRecentTransactionsCard, {
      props: { transactions: redactedTransaction("unverified") },
    })

    expect(wrapper.text()).toContain("Unverified")

    wrapper.unmount()
  })

  it("does not render product earnings when the API redacts them", async () => {
    const wrapper = await mountSuspended(StatsTopSellingProductsCard, {
      props: { products: redactedProduct() },
    })

    expect(wrapper.get("thead").text()).not.toContain("Earnings")
    expect(wrapper.text()).not.toContain("NaN")

    wrapper.unmount()
  })
})
