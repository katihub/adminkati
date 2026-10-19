import type { CustomerSearchDashboard } from "@/types/api/customer-searches"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import CustomerSearchRequests from "@/components/stats/CustomerSearchRequests/CustomerSearchRequests.vue"
import IndexPage from "@/pages/index.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { apercuFixture, stubsGraphiques } from "./apercu-fixture"

const dashboard: CustomerSearchDashboard = {
  periodeJours: 30,
  resume: { total: 18, uniques: 7, aujourdhui: 4 },
  populaires: [
    { requete: "ordinateur portable", occurrences: 6, derniere: "2026-10-18T09:00:00.000Z" },
    { requete: "iphone 15", occurrences: 3, derniere: "2026-10-17T15:00:00.000Z" },
  ],
  recentes: [
    {
      id: "42",
      requete: "Ordinateur portable HP",
      rayon: "informatique",
      creeLe: "2026-10-18T09:00:00.000Z",
    },
  ],
}

describe("customer search requests dashboard block", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows the summary, popular searches and latest submitted wording", async () => {
    const wrapper = await mountSuspended(CustomerSearchRequests, { props: { data: dashboard, days: 30 } })

    expect(wrapper.get("[data-testid='customer-search-total']").text()).toContain("18")
    expect(wrapper.get("[data-testid='customer-search-unique']").text()).toContain("7")
    expect(wrapper.get("[data-testid='customer-search-today']").text()).toContain("4")
    expect(wrapper.get("[data-testid='customer-search-popular']").text()).toContain("ordinateur portable")
    expect(wrapper.get("[data-testid='customer-search-popular']").text()).toContain("6")
    expect(wrapper.get("[data-testid='customer-search-recent']").text()).toContain("Ordinateur portable HP")
    expect(wrapper.get("[data-testid='customer-search-recent']").text()).toContain("informatique")

    wrapper.unmount()
  })

  it("renders an explicit empty state", async () => {
    const wrapper = await mountSuspended(CustomerSearchRequests, {
      props: {
        data: { periodeJours: 30, resume: { total: 0, uniques: 0, aujourdhui: 0 }, populaires: [], recentes: [] },
        days: 30,
      },
    })

    expect(wrapper.get("[data-testid='customer-search-empty']").text()).toContain("No submitted searches")
    wrapper.unmount()
  })

  it("keeps an error local to the block and exposes a retry action", async () => {
    const wrapper = await mountSuspended(CustomerSearchRequests, {
      props: { days: 30, error: new Error("catalogue unavailable") },
    })

    expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(true)
    await wrapper.get("[data-testid='api-error-card'] button").trigger("click")
    expect(wrapper.emitted("retry")).toHaveLength(1)
    wrapper.unmount()
  })

  it("emits a supported period when the direction changes the window", async () => {
    const wrapper = await mountSuspended(CustomerSearchRequests, { props: { data: dashboard, days: 30 } })

    await wrapper.get("[data-testid='customer-search-period']").setValue("90")

    expect(wrapper.emitted("update:days")).toEqual([[90]])
    wrapper.unmount()
  })

  it("appears on the overview for direction and stays hidden from other roles", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(apiQueryKeys.statistics.overview("30j"), apercuFixture)
    queryClient.setQueryData(apiQueryKeys.customerSearches.overview(30), dashboard)
    queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Ada",
      courriel: "ada@example.com",
      roles: ["direction"],
    })
    const direction = await mountSuspended(IndexPage, { route: "/", global: { stubs: stubsGraphiques } })
    expect(direction.find("[data-testid='customer-search-requests']").exists()).toBe(true)
    direction.unmount()

    queryClient.setQueryData(["v1", "moi"], {
      userId: "u2",
      membreId: "m2",
      nom: "Chris",
      courriel: "chris@example.com",
      roles: ["comptoir"],
    })
    const counter = await mountSuspended(IndexPage, { route: "/", global: { stubs: stubsGraphiques } })
    expect(counter.find("[data-testid='customer-search-requests']").exists()).toBe(false)
    counter.unmount()
  })
})
