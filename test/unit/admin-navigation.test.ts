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
