import type { PublicSession, Role } from "@/types/session"
import type { RouteLocationNormalizedLoaded } from "vue-router"
import { adminDestinations, operationsDomainByTab } from "./admin-destinations"

export interface AdminNavigationLink {
  id: string
  labelKey: string
  to: string
  routeNames: readonly string[]
  icon: string
  roles?: readonly Role[]
  query?: Readonly<Record<string, string | boolean>>
}

export interface AdminNavigationItem extends AdminNavigationLink {
  children?: readonly AdminNavigationLink[]
}

export const adminNavigationItems: readonly AdminNavigationItem[] = [
  {
    id: "pilotage",
    labelKey: "admin.navigation.pilotage",
    to: adminDestinations.pilotage,
    routeNames: ["index"],
    icon: "ph:chart-donut",
    roles: ["direction", "comptoir", "preparation", "livreur"],
  },
  {
    id: "focal",
    labelKey: "admin.navigation.focal",
    to: adminDestinations.focal,
    routeNames: [],
    icon: "ph:map-pin-area",
    roles: ["point_focal"],
  },
  {
    id: "commerce",
    labelKey: "admin.navigation.commerce",
    to: adminDestinations.commerce,
    routeNames: ["orders"],
    icon: "ph:shopping-bag",
    roles: ["direction", "comptoir", "preparation", "livreur"],
    children: [
      {
        id: "orders",
        labelKey: "admin.navigation.items.orders",
        to: "/orders",
        routeNames: ["orders"],
        icon: "ph:receipt",
        roles: ["direction", "comptoir", "preparation", "livreur"],
        query: { quote: false },
      },
      {
        id: "quotes",
        labelKey: "admin.navigation.items.quotes",
        to: "/orders?quote=1",
        routeNames: ["orders"],
        icon: "ph:file-text",
        roles: ["direction", "comptoir"],
        query: { quote: true },
      },
    ],
  },
  {
    id: "catalogue",
    labelKey: "admin.navigation.catalogue",
    to: adminDestinations.catalogue,
    routeNames: ["products", "taxonomy"],
    icon: "ph:book-open",
    roles: ["direction", "comptoir"],
    children: [
      {
        id: "products",
        labelKey: "admin.navigation.items.products",
        to: "/products",
        routeNames: ["products"],
        icon: "ph:cube",
        roles: ["direction", "comptoir"],
      },
      {
        id: "taxonomy",
        labelKey: "admin.navigation.items.taxonomy",
        to: "/taxonomy",
        routeNames: ["taxonomy"],
        icon: "ph:tree-structure",
        roles: ["direction", "comptoir"],
      },
      {
        id: "catalogue-moderation",
        labelKey: "admin.navigation.items.catalogueModeration",
        to: "/operations?tab=marketplace-catalogue",
        routeNames: ["operations"],
        icon: "ph:checks",
        roles: ["direction", "comptoir"],
        query: { tab: "marketplace-catalogue" },
      },
      {
        id: "catalogue-offers",
        labelKey: "admin.navigation.items.catalogueOffers",
        to: "/operations?tab=marketplace-offers",
        routeNames: ["operations"],
        icon: "ph:package",
        roles: ["direction"],
        query: { tab: "marketplace-offers" },
      },
    ],
  },
  {
    id: "sellers",
    labelKey: "admin.navigation.sellers",
    to: adminDestinations.sellers,
    routeNames: [],
    icon: "ph:storefront",
    roles: ["direction", "comptoir"],
    children: [
      {
        id: "seller-onboarding",
        labelKey: "admin.navigation.items.sellerOnboarding",
        to: "/operations?tab=seller-onboarding",
        routeNames: ["operations"],
        icon: "ph:storefront",
        roles: ["direction"],
        query: { tab: "seller-onboarding" },
      },
      {
        id: "shop-agents",
        labelKey: "admin.navigation.items.shopAgents",
        to: "/operations?tab=shop-agents",
        routeNames: ["operations"],
        icon: "ph:user-check",
        roles: ["direction"],
        query: { tab: "shop-agents" },
      },
      {
        id: "seller-trust",
        labelKey: "admin.navigation.items.sellerTrust",
        to: "/operations?tab=seller-trust",
        routeNames: ["operations"],
        icon: "ph:shield-check",
        roles: ["direction", "comptoir"],
        query: { tab: "seller-trust" },
      },
    ],
  },
  {
    id: "clients",
    labelKey: "admin.navigation.clients",
    to: adminDestinations.clients,
    routeNames: ["users", "assistant"],
    icon: "ph:users",
    roles: ["direction", "comptoir"],
    children: [
      {
        id: "customer-directory",
        labelKey: "admin.navigation.items.customerDirectory",
        to: "/users",
        routeNames: ["users"],
        icon: "ph:address-book",
        roles: ["direction", "comptoir"],
      },
      {
        id: "customer-assistance",
        labelKey: "admin.navigation.items.customerAssistance",
        to: "/assistant",
        routeNames: ["assistant"],
        icon: "ph:headset",
        roles: ["direction", "comptoir"],
      },
      {
        id: "reported-reviews",
        labelKey: "admin.navigation.items.reportedReviews",
        to: "/operations?tab=reported-reviews",
        routeNames: ["operations"],
        icon: "ph:star",
        roles: ["direction"],
        query: { tab: "reported-reviews" },
      },
      {
        id: "disputes",
        labelKey: "admin.navigation.items.disputes",
        to: "/operations?tab=marketplace-disputes",
        routeNames: ["operations"],
        icon: "ph:warning",
        roles: ["direction", "comptoir"],
        query: { tab: "marketplace-disputes" },
      },
    ],
  },
  {
    id: "logistics",
    labelKey: "admin.navigation.logistics",
    to: adminDestinations.logistics,
    routeNames: [],
    icon: "ph:truck",
    roles: ["direction"],
    children: [
      {
        id: "delivery-fees",
        labelKey: "admin.navigation.items.deliveryFees",
        to: "/operations?tab=delivery-fees",
        routeNames: ["operations"],
        icon: "ph:truck",
        roles: ["direction"],
        query: { tab: "delivery-fees" },
      },
      {
        id: "localities",
        labelKey: "admin.navigation.items.localities",
        to: "/operations?tab=localities",
        routeNames: ["operations"],
        icon: "ph:map-pin",
        roles: ["direction"],
        query: { tab: "localities" },
      },
      {
        id: "order-services",
        labelKey: "admin.navigation.items.orderServices",
        to: "/operations?tab=order-services",
        routeNames: ["operations"],
        icon: "ph:shield-plus",
        roles: ["direction"],
        query: { tab: "order-services" },
      },
      {
        id: "refused-lines",
        labelKey: "admin.navigation.items.refusedLines",
        to: "/operations?tab=refused-lines",
        routeNames: ["operations"],
        icon: "ph:receipt-x",
        roles: ["direction"],
        query: { tab: "refused-lines" },
      },
    ],
  },
  {
    id: "finance",
    labelKey: "admin.navigation.finance",
    to: adminDestinations.finance,
    routeNames: ["caisse"],
    icon: "ph:wallet",
    roles: ["direction"],
    children: [
      {
        id: "cash-registers",
        labelKey: "admin.navigation.items.cashRegisters",
        to: "/operations?tab=cash-registers",
        routeNames: ["operations"],
        icon: "ph:cash-register",
        roles: ["direction"],
        query: { tab: "cash-registers" },
      },
      {
        id: "seller-finance",
        labelKey: "admin.navigation.items.sellerFinance",
        to: "/operations?tab=seller-finance",
        routeNames: ["operations"],
        icon: "ph:wallet",
        roles: ["direction"],
        query: { tab: "seller-finance" },
      },
      {
        id: "installment-plans",
        labelKey: "admin.navigation.items.installmentPlans",
        to: "/operations?tab=installment-plans",
        routeNames: ["operations"],
        icon: "ph:calendar-check",
        roles: ["direction"],
        query: { tab: "installment-plans" },
      },
      {
        id: "kati-points",
        labelKey: "admin.navigation.items.katiPoints",
        to: "/operations?tab=kati-points",
        routeNames: ["operations"],
        icon: "ph:coins",
        roles: ["direction"],
        query: { tab: "kati-points" },
      },
    ],
  },
  {
    id: "marketing",
    labelKey: "admin.navigation.marketing",
    to: adminDestinations.marketing,
    routeNames: ["content", "site-texts"],
    icon: "ph:megaphone",
    roles: ["direction", "comptoir"],
    children: [
      {
        id: "content",
        labelKey: "admin.navigation.items.content",
        to: "/content",
        routeNames: ["content"],
        icon: "ph:image",
        roles: ["direction", "comptoir"],
      },
      {
        id: "site-texts",
        labelKey: "admin.navigation.items.siteTexts",
        to: "/site-texts",
        routeNames: ["site-texts"],
        icon: "ph:article",
        roles: ["direction", "comptoir"],
      },
      {
        id: "outbound-notifications",
        labelKey: "admin.navigation.items.outboundNotifications",
        to: "/operations?tab=outbound-notifications",
        routeNames: ["operations"],
        icon: "ph:bell",
        roles: ["direction"],
        query: { tab: "outbound-notifications" },
      },
    ],
  },
  {
    id: "administration",
    labelKey: "admin.navigation.administration",
    to: adminDestinations.administration,
    routeNames: ["team"],
    icon: "ph:gear-six",
    children: [
      {
        id: "team",
        labelKey: "admin.navigation.items.team",
        to: "/team",
        routeNames: ["team"],
        icon: "ph:users-three",
      },
      {
        id: "settings",
        labelKey: "admin.navigation.items.settings",
        to: "/settings",
        routeNames: ["settings"],
        icon: "ph:sliders-horizontal",
        roles: ["direction"],
      },
      {
        id: "marketplace-pilot",
        labelKey: "admin.navigation.items.marketplacePilot",
        to: "/operations?tab=marketplace-pilot",
        routeNames: ["operations"],
        icon: "ph:flag-banner",
        roles: ["direction"],
        query: { tab: "marketplace-pilot" },
      },
      {
        id: "legal-closure",
        labelKey: "admin.navigation.items.legalClosure",
        to: "/operations?tab=legal-closure",
        routeNames: ["operations"],
        icon: "ph:seal-check",
        roles: ["direction"],
        query: { tab: "legal-closure" },
      },
    ],
  },
]

export function visibleAdminNavigationItems(
  session: Pick<PublicSession, "roles"> | null | undefined,
  items: readonly AdminNavigationItem[] = adminNavigationItems,
) {
  return items
    .filter(item => !item.roles || item.roles.some(role => session?.roles?.includes(role)))
    .map(item => {
      const children = item.children?.filter(
        child => !child.roles || child.roles.some(role => session?.roles?.includes(role)),
      )
      return { ...item, children, to: children?.[0]?.to ?? item.to }
    })
}

export function isAdminNavigationItemActive(
  item: AdminNavigationLink,
  route: Pick<RouteLocationNormalizedLoaded, "name" | "path" | "query">,
) {
  const routeName = String(route.name ?? "").replace(/___.*$/, "")
  if (item.query) {
    if (!item.routeNames.includes(routeName)) return false
    return Object.entries(item.query).every(([key, expected]) => {
      const value = route.query[key]
      if (expected === true) return value !== undefined
      if (expected === false) return value === undefined
      return value === expected
    })
  }
  if (routeName === "operations") {
    const tab = typeof route.query.tab === "string" ? route.query.tab : "cash-registers"
    return operationsDomainByTab[tab] === item.id
  }
  return item.routeNames.includes(routeName)
}
