import type { TeamMember } from "../../app/types/api/equipe"
import { describe, expect, it } from "vitest"
import { findMemberByEmail } from "../../app/utils/find-member-by-email"

function member(overrides: Partial<TeamMember>): TeamMember {
  return {
    id: "m1",
    courriel: "awa@example.com",
    nom: "Awa Ngo",
    telephone: null,
    roles: ["comptoir"],
    comptoirs: [],
    actif: true,
    creeLe: "2025-03-12T09:00:00.000Z",
    premiereConnexionLe: null,
    desactiveLe: null,
    ...overrides,
  }
}

describe("finding a team member by email", () => {
  const roster = [member({ id: "m1" }), member({ id: "m2", courriel: "lyon@example.com", nom: "Lyon" })]

  it("returns the member the address belongs to", () => {
    expect(findMemberByEmail("lyon@example.com", roster)?.id).toBe("m2")
  })

  it("ignores case and stray whitespace, so a stamp written differently still finds the person", () => {
    expect(findMemberByEmail("  Lyon@Example.COM ", roster)?.id).toBe("m2")
  })

  it("returns null for an address that is not on the roster", () => {
    expect(findMemberByEmail("nobody@example.com", roster)).toBeNull()
  })

  it("returns null when there is no address to look for", () => {
    expect(findMemberByEmail(null, roster)).toBeNull()
    expect(findMemberByEmail("   ", roster)).toBeNull()
  })

  it("returns null on an empty roster", () => {
    expect(findMemberByEmail("awa@example.com", [])).toBeNull()
  })
})
