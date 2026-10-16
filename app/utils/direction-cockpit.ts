import type { MarketplaceCommandCenter } from "@/types/api/statistiques"
import { operationalDestinations } from "./admin-destinations"

export type DirectionQueueId =
  | "orders-review"
  | "seller-approvals"
  | "product-moderation"
  | "offer-moderation"
  | "open-disputes"
  | "cash-disputes"

export interface DirectionQueue {
  id: DirectionQueueId
  count: number
  priority: "critical" | "high"
  owner: "commerce" | "sellers" | "catalogue" | "clients" | "finance"
  target: "4-business-hours" | "2-business-days" | "1-business-day" | "72-hours"
  to: string
  icon: string
}

export function buildDirectionQueues(marketplace: MarketplaceCommandCenter): DirectionQueue[] {
  const attention = marketplace.orderStatuses.find(status => status.id === "attention")?.count ?? 0
  const cashDisputes = marketplace.alerts.find(alert => alert.id === "cash_disputes")?.count ?? 0
  const queues: DirectionQueue[] = [
    {
      id: "orders-review",
      count: attention,
      priority: "critical",
      owner: "commerce",
      target: "4-business-hours",
      to: operationalDestinations.ordersReview,
      icon: "ph:shopping-cart-simple",
    },
    {
      id: "seller-approvals",
      count: marketplace.approvals.sellers,
      priority: "high",
      owner: "sellers",
      target: "2-business-days",
      to: operationalDestinations.sellerApprovals,
      icon: "ph:storefront",
    },
    {
      id: "product-moderation",
      count: marketplace.approvals.products,
      priority: "high",
      owner: "catalogue",
      target: "1-business-day",
      to: operationalDestinations.catalogueModeration,
      icon: "ph:cube",
    },
    {
      id: "offer-moderation",
      count: marketplace.approvals.offers,
      priority: "high",
      owner: "catalogue",
      target: "1-business-day",
      to: operationalDestinations.catalogueModeration,
      icon: "ph:tag",
    },
    {
      id: "open-disputes",
      count: marketplace.kpis.openDisputes.valeur,
      priority: "critical",
      owner: "clients",
      target: "72-hours",
      to: operationalDestinations.openDisputes,
      icon: "ph:warning-octagon",
    },
    {
      id: "cash-disputes",
      count: cashDisputes,
      priority: "high",
      owner: "finance",
      target: "1-business-day",
      to: operationalDestinations.cashDisputes,
      icon: "ph:cash-register",
    },
  ]

  return queues.filter(queue => queue.count > 0)
}
