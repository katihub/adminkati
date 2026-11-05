import { describe, expect, it } from "vitest"
import { notificationTarget, relativeTime, unreadBadge } from "../../app/utils/notifications"

describe("the bell helpers", () => {
  it("caps the badge at 99+", () => {
    expect(unreadBadge(7)).toBe("7")
    expect(unreadBadge(99)).toBe("99")
    expect(unreadBadge(140)).toBe("99+")
  })

  it("splits a panel path into its path and query, and ignores anything that is not a panel path", () => {
    expect(notificationTarget("/operations?tab=seller-messages")).toEqual({
      path: "/operations",
      query: { tab: "seller-messages" },
    })
    expect(notificationTarget("/orders")).toEqual({ path: "/orders", query: {} })
    expect(notificationTarget("https://evil.example/x")).toBeNull()
    expect(notificationTarget(null)).toBeNull()
  })

  it("says how long ago, in the panel language", () => {
    const now = new Date("2026-11-05T12:00:00Z")
    expect(relativeTime("2026-11-05T11:55:00Z", "en", now)).toBe("5 min. ago")
    expect(relativeTime("2026-11-05T11:59:40Z", "en", now)).toBe("now")
    expect(relativeTime("2026-11-04T12:00:00Z", "fr", now)).toBe("hier")
  })
})
