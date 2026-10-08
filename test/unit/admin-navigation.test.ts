import type { PublicSession, Role } from "../../app/types/session"
import { describe, expect, it } from "vitest"
import { adminNavigationItems, visibleAdminNavigationItems } from "../../app/utils/admin-navigation"

function sessionWith(...roles: Role[]): PublicSession {
  return {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  }
}

function idsFor(session: PublicSession | null) {
  return visibleAdminNavigationItems(session).map(item => item.id)
}

describe("admin navigation visibility", () => {
  it("gives direction every catalogue, commerce, and team destination", () => {
    expect(idsFor(sessionWith("direction"))).toEqual([
      "overview",
      "products",
      "taxonomy",
      "content",
      "orders",
      "operations",
      "users",
      "team",
    ])
  })

  it("gives comptoir the same set, since it shares every read gate with direction", () => {
    expect(idsFor(sessionWith("comptoir"))).toEqual(idsFor(sessionWith("direction")))
  })

  it("gives preparation orders but withholds the catalogue and customer destinations", () => {
    const ids = idsFor(sessionWith("preparation"))

    expect(ids).toContain("orders")
    expect(ids).not.toContain("products")
    expect(ids).not.toContain("taxonomy")
    expect(ids).not.toContain("content")
    expect(ids).not.toContain("operations")
    expect(ids).not.toContain("users")
  })

  it("adds orders to livreur's ungated destinations, the one gate their backend routes satisfy", () => {
    /*
     * `orders` used to be withheld from a livreur, which left them with the
     * ungated pair alone. The backend opens their own deliveries, the doorstep
     * collection and the return to preparation after a closed door, so the
     * panel was refusing screens the API already answered — cash on delivery,
     * the dominant payment mode here, had to be re-entered afterwards by
     * someone who was not at the door. The gate is narrowed server-side to the
     * livreur's own orders, so this is not a widened read.
     */
    expect(idsFor(sessionWith("livreur"))).toEqual(["overview", "orders", "team"])
  })

  it("withholds every role-gated destination from a session that has not loaded", () => {
    expect(idsFor(null)).toEqual(["overview", "team"])
  })

  it("admits an item when any one of the caller's roles satisfies its gate", () => {
    expect(idsFor(sessionWith("livreur", "comptoir"))).toEqual(idsFor(sessionWith("comptoir")))
  })
})

describe("admin navigation model", () => {
  it("keeps destination ids, routes, and paths unique", () => {
    const unique = (values: string[]) => new Set(values).size === values.length

    expect(unique(adminNavigationItems.map(item => item.id))).toBe(true)
    expect(unique(adminNavigationItems.map(item => item.routeName))).toBe(true)
    expect(unique(adminNavigationItems.map(item => item.to))).toBe(true)
  })

  it("derives every label from the admin navigation locale domain", () => {
    for (const item of adminNavigationItems) expect(item.labelKey).toBe(`admin.navigation.${item.id}`)
  })
})
