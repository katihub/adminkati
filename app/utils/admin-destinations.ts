export const adminDestinations = {
  pilotage: "/",
  commerce: "/orders",
  catalogue: "/products",
  sellers: "/operations?tab=seller-onboarding",
  clients: "/users",
  logistics: "/operations?tab=delivery-fees",
  finance: "/operations?tab=seller-finance",
  marketing: "/content",
  administration: "/team",
} as const

export type AdminDomain = keyof typeof adminDestinations

export const operationalDestinations = {
  ordersReview: adminDestinations.commerce,
  sellerApprovals: adminDestinations.sellers,
  catalogueModeration: "/operations?tab=marketplace-catalogue",
  openDisputes: "/operations?tab=marketplace-disputes",
  cashDisputes: "/operations",
} as const

export const operationsDomainByTab: Readonly<Partial<Record<string, AdminDomain>>> = {
  "cash-registers": "finance",
  "customer-requests": "clients",
  "seller-onboarding": "sellers",
  "marketplace-catalogue": "catalogue",
  "marketplace-categories": "catalogue",
  "delivery-fees": "logistics",
  localities: "logistics",
  "shop-agents": "sellers",
  "verified-offers": "catalogue",
  "refused-lines": "logistics",
  "kati-points": "marketing",
  "order-services": "logistics",
  "marketplace-quotes": "commerce",
  "reported-reviews": "clients",
  "marketplace-disputes": "clients",
  "seller-finance": "finance",
  "seller-trust": "sellers",
  "legal-closure": "administration",
  "marketplace-pilot": "administration",
  "outbound-notifications": "marketing",
}
