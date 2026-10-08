import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import IndexPage from "@/pages/index.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { apercuFixture, DATE_TRANSACTION, stubsGraphiques } from "./apercu-fixture"

interface CatalogueSummaryFixture {
  totalProducts: number
  totalBrands: number
  totalDepartments: number
  totalCategories: number
}

type OverviewWithCatalogueSummary = typeof apercuFixture & { catalogueSummary: CatalogueSummaryFixture }

const overviewWithCatalogueSummary: OverviewWithCatalogueSummary = {
  ...apercuFixture,
  catalogueSummary: {
    totalProducts: 4_273,
    totalBrands: 101,
    totalDepartments: 12,
    totalCategories: 46,
  },
}

async function mountOverview(data = apercuFixture) {
  useNuxtApp().$queryClient.setQueryData(["v1", "statistiques", "apercu", "30j"], data)
  return mountSuspended(IndexPage, {
    route: "/",
    global: { stubs: stubsGraphiques },
  })
}

async function mountPendingOverview() {
  const queryClient = useNuxtApp().$queryClient
  const queryKey = apiQueryKeys.statistics.overview("30j")
  let resolveRequest: (data: typeof apercuFixture) => void
  const pendingRequest = new Promise<typeof apercuFixture>(resolve => {
    resolveRequest = resolve
  })

  await queryClient.cancelQueries({ queryKey })
  queryClient.removeQueries({ queryKey })
  void queryClient
    .fetchQuery({
      queryKey,
      queryFn: () => pendingRequest,
    })
    .catch(() => {})

  return {
    completeRequest: () => resolveRequest(apercuFixture),
    wrapper: await mountSuspended(IndexPage, {
      route: "/",
      global: { stubs: stubsGraphiques },
    }),
  }
}

describe("overview block rendering", () => {
  it("announces itself as busy while the overview is initially loading", async () => {
    const { wrapper, completeRequest } = await mountPendingOverview()
    const queryClient = useNuxtApp().$queryClient
    const queryKey = apiQueryKeys.statistics.overview("30j")

    try {
      const loading = wrapper.get("[data-testid='overview-loading-skeleton']")

      expect(loading.attributes("aria-busy")).toBe("true")
    } finally {
      wrapper.unmount()
      completeRequest()
      queryClient.removeQueries({ queryKey })
    }
  })

  it("renders the catalogue summary's numeric values, with categories under the profit column", async () => {
    const wrapper = await mountOverview(overviewWithCatalogueSummary)
    const summary = wrapper.get("[data-testid='catalogue-summary']")
    const profitColumn = wrapper.get("[data-testid='overview-profit-column']")

    expect(summary.find("[data-testid='catalogue-summary-total-categories']").exists()).toBe(false)
    expect(profitColumn.find("h3").text()).toContain("Total Profit")
    expect(profitColumn.get("[data-testid='catalogue-summary-total-categories']").text()).toContain("46")
    expect(wrapper.get("[data-testid='catalogue-summary-total-products']").text()).toContain("4,273")
    expect(wrapper.get("[data-testid='catalogue-summary-total-brands']").text()).toContain("101")
    expect(wrapper.get("[data-testid='catalogue-summary-total-departments']").text()).toContain("12")

    wrapper.unmount()
  })

  it("renders every tier from the payload rather than from fixed markup", async () => {
    const wrapper = await mountOverview()
    const texte = wrapper.text()

    expect(texte).toContain(apercuFixture.recentTransactions[0]!.orderNumber)
    expect(texte).toContain(apercuFixture.recentTransactions[0]!.productName)
    expect(texte).toContain(apercuFixture.topSellingProducts![0]!.name)
    expect(wrapper.find(".stub-area-chart").exists()).toBe(true)
    expect(wrapper.find(".stub-bar-chart").exists()).toBe(true)

    wrapper.unmount()
  })

  it("prices the dashboard in the shop's own currency", async () => {
    const wrapper = await mountOverview()
    const texte = wrapper.text()

    // XAF has no subdivision and the shop bills in francs; a dollar sign anywhere
    // means a card has gone back to formatting money on its own.
    expect(texte).not.toContain("$")
    expect(texte).toContain("FCFA")

    wrapper.unmount()
  })

  it("formats transaction dates for the reader instead of echoing the wire format", async () => {
    const wrapper = await mountOverview()

    expect(wrapper.text()).not.toContain(DATE_TRANSACTION)

    wrapper.unmount()
  })
})
