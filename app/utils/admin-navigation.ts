import type { PublicSession, Role } from "@/types/session"
import type { RouteLocationNormalizedLoaded } from "vue-router"

export interface AdminNavigationItem {
  id: string
  labelKey: string
  to: string
  routeName: string
  icon: string
  /** Omitted where the backend route is open to the whole team. */
  roles?: readonly Role[]
}

/**
 * Ordered catalogue → commerce → administration, which is how the destinations
 * relate to each other rather than the order they were requested in.
 *
 * `roles` mirrors the guards on the backend route each destination will call,
 * so a member never sees a link that answers 403.
 */
export const adminNavigationItems: readonly AdminNavigationItem[] = [
  {
    id: "overview",
    labelKey: "admin.navigation.overview",
    to: "/",
    routeName: "index",
    icon: "ph:squares-four",
  },
  {
    id: "products",
    labelKey: "admin.navigation.products",
    to: "/products",
    routeName: "products",
    icon: "ph:package",
    roles: ["direction", "comptoir"],
  },
  {
    id: "taxonomy",
    labelKey: "admin.navigation.taxonomy",
    to: "/taxonomy",
    routeName: "taxonomy",
    icon: "ph:tree-structure",
    roles: ["direction", "comptoir"],
  },
  {
    id: "content",
    labelKey: "admin.navigation.content",
    to: "/content",
    routeName: "content",
    icon: "ph:layout",
    roles: ["direction", "comptoir"],
  },
  {
    id: "orders",
    labelKey: "admin.navigation.orders",
    to: "/orders",
    routeName: "orders",
    icon: "ph:receipt",
    roles: ["direction", "comptoir", "preparation", "livreur"],
  },
  {
    id: "operations",
    labelKey: "admin.navigation.operations",
    to: "/operations",
    routeName: "operations",
    icon: "ph:briefcase",
    roles: ["direction", "comptoir"],
  },
  {
    id: "users",
    labelKey: "admin.navigation.users",
    to: "/users",
    routeName: "users",
    icon: "ph:users",
    roles: ["direction", "comptoir"],
  },
  {
    id: "team",
    labelKey: "admin.navigation.team",
    to: "/team",
    routeName: "team",
    icon: "ph:identification-badge",
  },
]

/**
 * Defence in depth, not the access boundary — `auth.global.ts` is. A session
 * that has not loaded yet keeps the ungated destinations rather than throwing.
 */
export function visibleAdminNavigationItems(
  session: Pick<PublicSession, "roles"> | null | undefined,
  items: readonly AdminNavigationItem[] = adminNavigationItems,
) {
  return items.filter(item => !item.roles || item.roles.some(role => session?.roles?.includes(role)))
}

export function isAdminNavigationItemActive(
  item: AdminNavigationItem,
  route: Pick<RouteLocationNormalizedLoaded, "name" | "path">,
) {
  const routeName = String(route.name ?? "")
  return routeName === item.routeName || routeName.startsWith(`${item.routeName}___`)
}
