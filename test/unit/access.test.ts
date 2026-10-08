import type { PublicSession } from "../../app/types/session"
import { describe, expect, it } from "vitest"
import { canAccess } from "../../app/utils/access"

const session: PublicSession = {
  userId: "u1",
  membreId: "m1",
  nom: "Ada",
  courriel: "ada@example.com",
  roles: ["comptoir"],
}

describe("canAccess", () => {
  it("allows public pages without a session", () => {
    expect(canAccess(null, { public: true })).toBe("allow")
  })

  it("returns anonymous for a closed page without a session", () => {
    expect(canAccess(null, { team: true })).toBe("anonymous")
  })

  it("checks role membership", () => {
    expect(canAccess(session, { roles: ["direction"] })).toBe("forbidden")
    expect(canAccess({ ...session, roles: ["direction", "comptoir"] }, { roles: ["direction"] })).toBe("allow")
  })

  it("denies undeclared pages", () => {
    expect(canAccess(session, {})).toBe("undeclared")
  })
})
