import type { PublicSession, Role } from "@/types/session"
import type { RouteLocationNormalizedLoaded } from "vue-router"
import { adminDestinations, operationsDomainByTab } from "./admin-destinations"

export interface AdminNavigationItem {
  id: string
  labelKey: string
  to: string
  routeNames: readonly string[]
  icon: string
  roles?: readonly Role[]
}

export const adminNavigationItems: readonly AdminNavigationItem[] = [
  {
    id: "pilotage",
    labelKey: "admin.navigation.pilotage",
    to: adminDestinations.pilotage,
    routeNames: ["index"],
    icon: "ph:chart-donut",
  },
  {
    id: "commerce",
    labelKey: "admin.navigation.commerce",
    to: adminDestinations.commerce,
    routeNames: ["orders"],
    icon: "ph:shopping-bag",
    roles: ["direction", "comptoir", "preparation", "livreur"],
  },
  {
    id: "catalogue",
    labelKey: "admin.navigation.catalogue",
    to: adminDestinations.catalogue,
    routeNames: ["products", "taxonomy"],
    icon: "ph:book-open",
    roles: ["direction", "comptoir"],
  },
  {
    id: "sellers",
    labelKey: "admin.navigation.sellers",
    to: adminDestinations.sellers,
    routeNames: [],
    icon: "ph:storefront",
    roles: ["direction", "comptoir"],
  },
  {
    id: "clients",
    labelKey: "admin.navigation.clients",
    to: adminDestinations.clients,
    routeNames: ["users", "assistant"],
    icon: "ph:users",
    roles: ["direction", "comptoir"],
  },
  {
    id: "logistics",
    labelKey: "admin.navigation.logistics",
    to: adminDestinations.logistics,
    routeNames: [],
    icon: "ph:truck",
    roles: ["direction"],
  },
  {
    id: "finance",
    labelKey: "admin.navigation.finance",
    to: adminDestinations.finance,
    routeNames: ["caisse"],
    icon: "ph:wallet",
    roles: ["direction"],
  },
  {
    id: "marketing",
    labelKey: "admin.navigation.marketing",
    to: adminDestinations.marketing,
    routeNames: ["content", "site-texts"],
    icon: "ph:megaphone",
    roles: ["direction", "comptoir"],
  },
  {
    id: "administration",
    labelKey: "admin.navigation.administration",
    to: adminDestinations.administration,
    routeNames: ["team"],
    icon: "ph:gear-six",
  },
]

export function visibleAdminNavigationItems(
  session: Pick<PublicSession, "roles"> | null | undefined,
  items: readonly AdminNavigationItem[] = adminNavigationItems,
) {
  return items.filter(item => !item.roles || item.roles.some(role => session?.roles?.includes(role)))
}

export function isAdminNavigationItemActive(
  item: AdminNavigationItem,
  route: Pick<RouteLocationNormalizedLoaded, "name" | "path" | "query">,
) {
  const routeName = String(route.name ?? "").replace(/___.*$/, "")
  if (routeName === "operations") {
    const tab = typeof route.query.tab === "string" ? route.query.tab : "cash-registers"
    return operationsDomainByTab[tab] === item.id
  }
  return item.routeNames.includes(routeName)
}
