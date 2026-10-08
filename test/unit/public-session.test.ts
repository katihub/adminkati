import type { SessionData } from "../../app/types/session"
import { describe, expect, it } from "vitest"
import { toPublicSession } from "../../server/utils/session"

describe("toPublicSession", () => {
  it("returns only browser-safe session fields", () => {
    const publicSession = toPublicSession({
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
      expiresAt: 123,
      user: {
        userId: "u1",
        membreId: "m1",
        nom: "Ada",
        courriel: "ada@example.com",
        roles: ["direction"],
      },
    } satisfies SessionData)

    expect(Object.keys(publicSession).sort()).toEqual(["courriel", "membreId", "nom", "roles", "userId"])
    expect(Object.keys(publicSession)).not.toContain("accessToken")
    expect(Object.keys(publicSession)).not.toContain("refreshToken")
  })
})
