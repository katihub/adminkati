import type { PublicSession, Role } from "../../app/types/session"
import { describe, expect, it } from "vitest"
import {
  adminNavigationItems,
  isAdminNavigationItemActive,
  visibleAdminNavigationItems,
} from "../../app/utils/admin-navigation"

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
  it("keeps the administration settings entry exclusive to direction", () => {
    const administration = (roles: Role[]) =>
      visibleAdminNavigationItems(sessionWith(...roles)).find(item => item.id === "administration")?.children ?? []
    expect(administration(["direction"]).find(item => item.id === "settings")?.to).toBe("/settings")
    for (const role of ["comptoir", "preparation", "livreur", "point_focal"] as const) {
      expect(administration([role]).some(item => item.id === "settings")).toBe(false)
    }
    expect(
      visibleAdminNavigationItems(null)
        .find(item => item.id === "administration")
        ?.children?.some(item => item.id === "settings"),
    ).toBe(false)
  })
  it("opens the seller domain on an authorized module for a counter", () => {
    const sellers = visibleAdminNavigationItems(sessionWith("comptoir")).find(item => item.id === "sellers")
    expect(sellers?.children?.map(item => item.id)).toEqual(["seller-trust"])
    expect(sellers?.to).toBe("/operations?tab=seller-trust")
  })
  it("gives direction every business domain destination", () => {
    expect(idsFor(sessionWith("direction"))).toEqual([
      "pilotage",
      "commerce",
      "catalogue",
      "sellers",
      "clients",
      "logistics",
      "finance",
      "marketing",
      "administration",
    ])
  })

  it("withholds direction-only logistics and finance destinations from a counter", () => {
    expect(idsFor(sessionWith("comptoir"))).toEqual([
      "pilotage",
      "commerce",
      "catalogue",
      "sellers",
      "clients",
      "marketing",
      "administration",
    ])
  })

  it("gives preparation only pilotage, commerce, and the shared team directory", () => {
    expect(idsFor(sessionWith("preparation"))).toEqual(["pilotage", "commerce", "administration"])
  })

  it("gives a courier only pilotage, commerce, and the shared team directory", () => {
    expect(idsFor(sessionWith("livreur"))).toEqual(["pilotage", "commerce", "administration"])
  })

  it("withholds every role-gated destination from a session that has not loaded", () => {
    expect(idsFor(null)).toEqual(["administration"])
  })

  it("gives a KATI focal point its shops and the team directory, but no dashboard", () => {
    expect(idsFor(sessionWith("point_focal"))).toEqual(["focal", "administration"])
  })

  it("adds the focal point's shops to a counter who also holds the role", () => {
    expect(idsFor(sessionWith("comptoir", "point_focal"))).toEqual([
      "pilotage",
      "focal",
      "commerce",
      "catalogue",
      "sellers",
      "clients",
      "marketing",
      "administration",
    ])
  })

  it("admits an item when any one of the caller's roles satisfies its gate", () => {
    expect(idsFor(sessionWith("livreur", "comptoir"))).toEqual(idsFor(sessionWith("comptoir")))
  })
})

describe("admin navigation model", () => {
  it("structures each business domain with direct operational destinations", () => {
    const children = (id: string) => adminNavigationItems.find(item => item.id === id)?.children?.map(item => item.id)

    expect(children("commerce")).toEqual(["orders", "quotes"])
    expect(children("catalogue")).toEqual(["products", "taxonomy", "catalogue-moderation", "catalogue-offers"])
    expect(children("sellers")).toEqual(["seller-onboarding", "shop-agents", "seller-trust"])
    expect(children("clients")).toEqual(["customer-directory", "customer-assistance", "reported-reviews", "disputes"])
    expect(children("logistics")).toEqual(["delivery-fees", "localities", "order-services", "refused-lines"])
    expect(children("finance")).toEqual(["cash-registers", "seller-finance", "installment-plans", "kati-points"])
    expect(children("marketing")).toEqual(["content", "site-texts", "outbound-notifications"])
    expect(children("administration")).toEqual(["team", "settings", "marketplace-pilot", "legal-closure"])
  })

  it("matches an operations child against its exact tab", () => {
    const sellerTrust = adminNavigationItems
      .find(item => item.id === "sellers")
      ?.children?.find(item => item.id === "seller-trust")

    expect(sellerTrust).toBeDefined()
    expect(
      isAdminNavigationItemActive(sellerTrust!, {
        name: "operations",
        path: "/operations",
        query: { tab: "seller-trust" },
      }),
    ).toBe(true)
    expect(
      isAdminNavigationItemActive(sellerTrust!, {
        name: "operations",
        path: "/operations",
        query: { tab: "seller-onboarding" },
      }),
    ).toBe(false)
  })

  it("keeps destination ids and deep links unique", () => {
    const unique = (values: string[]) => new Set(values).size === values.length

    expect(unique(adminNavigationItems.map(item => item.id))).toBe(true)
    expect(unique(adminNavigationItems.map(item => item.to))).toBe(true)
  })

  it("derives every label from the admin navigation locale domain", () => {
    for (const item of adminNavigationItems) expect(item.labelKey).toBe(`admin.navigation.${item.id}`)
  })

  it.each([
    ["seller-onboarding", "sellers"],
    ["delivery-fees", "logistics"],
    ["seller-finance", "finance"],
  ] as const)("activates only %s's business domain on its Operations deep link", (tab, expectedId) => {
    const active = adminNavigationItems.filter(item =>
      isAdminNavigationItemActive(item, {
        name: "operations",
        path: "/operations",
        query: { tab },
      }),
    )

    expect(active.map(item => item.id)).toEqual([expectedId])
  })
})
