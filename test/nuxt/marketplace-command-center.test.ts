import type { MarketplaceCommandCenter } from "@/types/api/statistiques"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import StatsMarketplaceCommandCenter from "@/components/stats/MarketplaceCommandCenter.vue"

const marketplace: MarketplaceCommandCenter = {
  kpis: {
    gmv: { valeur: 1_250_000, precedent: 1_000_000, isCurrency: true },
    orders: { valeur: 17, precedent: 10 },
    activeSellers: { valeur: 8, precedent: null },
    clients: { valeur: 43, precedent: null },
    activeProducts: { valeur: 21, precedent: null },
    commissions: { valeur: 125_000, precedent: 100_000, isCurrency: true },
    openDisputes: { valeur: 3, precedent: null },
  },
  orderStatuses: [
    { id: "submitted", count: 2 },
    { id: "preparing", count: 3 },
    { id: "shipping", count: 4 },
    { id: "delivered", count: 5 },
    { id: "cancelled", count: 1 },
    { id: "attention", count: 2 },
  ],
  approvals: { sellers: 2, products: 4, offers: 1 },
  topSellers: [{ boutiqueId: "boutique-1", name: "TechStore", orders: 7, revenue: 750_000 }],
  alerts: [
    { id: "open_disputes", severity: "danger", count: 3 },
    { id: "pending_approvals", severity: "info", count: 7 },
  ],
}

describe("marketplace direction cockpit", () => {
  it("composes priorities, health, flow, alerts, and quick actions from the marketplace payload", async () => {
    const wrapper = await mountSuspended(StatsMarketplaceCommandCenter, {
      props: { marketplace },
    })

    expect(wrapper.get("[data-testid='marketplace-kpi-gmv']").text()).toContain("1.3M")
    expect(wrapper.get("[data-testid='marketplace-kpi-orders']").text()).toContain("17")
    expect(wrapper.get("[data-testid='marketplace-kpi-activeSellers']").text()).toContain("8")
    expect(wrapper.get("[data-testid='marketplace-kpi-clients']").text()).toContain("43")
    expect(wrapper.get("[data-testid='marketplace-kpi-activeProducts']").text()).toContain("21")
    expect(wrapper.get("[data-testid='marketplace-kpi-commissions']").text()).toContain("125,000")
    expect(wrapper.get("[data-testid='marketplace-kpi-openDisputes']").text()).toContain("3")
    expect(wrapper.get("[data-testid='direction-priority-queues']").text()).toContain("2")
    expect(wrapper.get("[data-testid='direction-health']").text()).toContain("1,250,000")
    expect(wrapper.get("[data-testid='direction-operational-flow']").text()).toMatch(/2.*3.*4.*5/s)
    expect(wrapper.get("[data-testid='direction-alerts']").text()).toContain("3")
    expect(wrapper.get("[data-testid='direction-quick-actions']").text()).toContain("2")

    wrapper.unmount()
  })

  it("opens each headline metric in its existing operational destination", async () => {
    const wrapper = await mountSuspended(StatsMarketplaceCommandCenter, {
      props: { marketplace },
    })

    expect(wrapper.get("[data-testid='marketplace-kpi-gmv'] a").attributes("href")).toBe("/orders")
    expect(wrapper.get("[data-testid='marketplace-kpi-activeProducts'] a").attributes("href")).toBe(
      "/operations?tab=marketplace-catalogue",
    )
    expect(wrapper.get("[data-testid='marketplace-kpi-openDisputes'] a").attributes("href")).toBe(
      "/operations?tab=marketplace-disputes",
    )

    wrapper.unmount()
  })

  it("renders the six real queues with their exact destinations and no aggregate approval duplicate", async () => {
    const wrapper = await mountSuspended(StatsMarketplaceCommandCenter, {
      props: { marketplace },
    })

    const queues = wrapper.findAll("[data-testid^='direction-queue-']")
    expect(queues.map(queue => queue.attributes("data-testid")?.replace("direction-queue-", ""))).toEqual([
      "orders-review",
      "seller-approvals",
      "product-moderation",
      "offer-moderation",
      "open-disputes",
    ])
    expect(wrapper.get("[data-testid='direction-queue-orders-review']").text()).toContain("2")
    expect(wrapper.get("[data-testid='direction-queue-orders-review'] a").attributes("href")).toBe("/orders")
    expect(wrapper.get("[data-testid='direction-queue-seller-approvals'] a").attributes("href")).toBe(
      "/operations?tab=seller-onboarding",
    )
    expect(wrapper.get("[data-testid='direction-queue-product-moderation'] a").attributes("href")).toBe(
      "/operations?tab=marketplace-catalogue",
    )
    expect(wrapper.get("[data-testid='direction-queue-offer-moderation'] a").attributes("href")).toBe(
      "/operations?tab=marketplace-catalogue",
    )
    expect(wrapper.get("[data-testid='direction-queue-open-disputes'] a").attributes("href")).toBe(
      "/operations?tab=marketplace-disputes",
    )
    wrapper.unmount()
  })

  it("does not render mockup-only metrics, payment stages, timestamps, or references", async () => {
    const wrapper = await mountSuspended(StatsMarketplaceCommandCenter, {
      props: { marketplace },
    })

    expect(wrapper.text()).not.toMatch(/average basket|panier moyen/i)
    expect(wrapper.text()).not.toMatch(/on-time|à l'heure/i)
    expect(wrapper.text()).not.toMatch(/payments?|paiements?/i)
    expect(wrapper.text()).not.toMatch(/\b\d{1,2}:\d{2}\b/)
    expect(wrapper.text()).not.toMatch(/(?:CMD|ORD|INC)-\d+/i)

    wrapper.unmount()
  })

  it("renders calm priority and alert states when every actionable volume is zero", async () => {
    const wrapper = await mountSuspended(StatsMarketplaceCommandCenter, {
      props: {
        marketplace: {
          ...marketplace,
          kpis: { ...marketplace.kpis, openDisputes: { valeur: 0, precedent: null } },
          orderStatuses: marketplace.orderStatuses.map(status =>
            status.id === "attention" ? { ...status, count: 0 } : status,
          ),
          approvals: { sellers: 0, products: 0, offers: 0 },
          alerts: [],
        },
      },
    })

    expect(wrapper.get("[data-testid='direction-priority-queues-empty']").text()).toContain("No priority work")
    expect(wrapper.find("[data-testid^='direction-queue-']").exists()).toBe(false)
    expect(wrapper.get("[data-testid='direction-alerts-empty']").text()).toContain("No marketplace alert")
    expect(wrapper.find("[data-testid='direction-quick-actions']").exists()).toBe(false)

    wrapper.unmount()
  })
})
