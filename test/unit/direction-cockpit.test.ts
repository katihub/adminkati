import type { MarketplaceCommandCenter } from "../../app/types/api/statistiques"
import { describe, expect, it } from "vitest"
import { buildDirectionQueues } from "../../app/utils/direction-cockpit"

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
    { id: "attention", count: 6 },
  ],
  approvals: { sellers: 2, products: 4, offers: 1 },
  topSellers: [],
  alerts: [
    { id: "open_disputes", severity: "danger", count: 99 },
    { id: "cash_disputes", severity: "warning", count: 5 },
    { id: "pending_approvals", severity: "info", count: 100 },
  ],
}

describe("direction cockpit queues", () => {
  it("derives the six actionable volumes from their documented API sources", () => {
    const queues = buildDirectionQueues(marketplace)

    expect(queues.map(queue => [queue.id, queue.count])).toEqual([
      ["orders-review", 6],
      ["seller-approvals", 2],
      ["product-moderation", 4],
      ["offer-moderation", 1],
      ["open-disputes", 3],
      ["cash-disputes", 5],
    ])
  })

  it("attaches policy and exact existing destinations without pretending to measure queue age", () => {
    const queues = buildDirectionQueues(marketplace)

    expect(queues.map(({ id, priority, owner, target, to }) => ({ id, priority, owner, target, to }))).toEqual([
      {
        id: "orders-review",
        priority: "critical",
        owner: "commerce",
        target: "4-business-hours",
        to: "/orders",
      },
      {
        id: "seller-approvals",
        priority: "high",
        owner: "sellers",
        target: "2-business-days",
        to: "/operations?tab=seller-onboarding",
      },
      {
        id: "product-moderation",
        priority: "high",
        owner: "catalogue",
        target: "1-business-day",
        to: "/operations?tab=marketplace-catalogue",
      },
      {
        id: "offer-moderation",
        priority: "high",
        owner: "catalogue",
        target: "1-business-day",
        to: "/operations?tab=marketplace-catalogue",
      },
      {
        id: "open-disputes",
        priority: "critical",
        owner: "clients",
        target: "72-hours",
        to: "/operations?tab=marketplace-disputes",
      },
      {
        id: "cash-disputes",
        priority: "high",
        owner: "finance",
        target: "1-business-day",
        to: "/operations",
      },
    ])
    expect(queues.every(queue => queue.icon.length > 0)).toBe(true)
    expect(queues.every(queue => !("age" in queue) && !("overdue" in queue))).toBe(true)
  })

  it("omits zero-volume work and never duplicates the aggregate pending approvals alert", () => {
    const queues = buildDirectionQueues({
      ...marketplace,
      kpis: { ...marketplace.kpis, openDisputes: { valeur: 0, precedent: null } },
      orderStatuses: [{ id: "attention", count: 0 }],
      approvals: { sellers: 0, products: 0, offers: 0 },
      alerts: [
        { id: "cash_disputes", severity: "warning", count: 0 },
        { id: "pending_approvals", severity: "info", count: 12 },
      ],
    })

    expect(queues).toEqual([])
  })

  it("treats a missing attention or cash-dispute aggregate as an empty queue", () => {
    const queues = buildDirectionQueues({
      ...marketplace,
      orderStatuses: [{ id: "submitted", count: 9 }],
      alerts: [{ id: "pending_approvals", severity: "info", count: 7 }],
    })

    expect(queues.map(queue => queue.id)).toEqual([
      "seller-approvals",
      "product-moderation",
      "offer-moderation",
      "open-disputes",
    ])
  })
})
