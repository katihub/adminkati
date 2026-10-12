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

describe("marketplace super-admin command center", () => {
  it("renders global metrics, operational queues and working destination links", async () => {
    const wrapper = await mountSuspended(StatsMarketplaceCommandCenter, {
      props: { marketplace },
    })

    expect(wrapper.text()).toContain("Marketplace GMV")
    expect(wrapper.text()).toContain("Active sellers")
    expect(wrapper.text()).toContain("TechStore")
    expect(wrapper.text()).toContain("Pending approvals")
    expect(wrapper.text()).toContain("Needs attention")
    expect(wrapper.find('[href="/operations"]').exists()).toBe(true)
    expect(wrapper.find('[href="/orders"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it("renders a calm empty state when no marketplace action is waiting", async () => {
    const wrapper = await mountSuspended(StatsMarketplaceCommandCenter, {
      props: {
        marketplace: {
          ...marketplace,
          approvals: { sellers: 0, products: 0, offers: 0 },
          topSellers: [],
          alerts: [],
        },
      },
    })

    expect(wrapper.text()).toContain("No marketplace alert")
    expect(wrapper.text()).toContain("No seller activity for this period")

    wrapper.unmount()
  })
})
