import type { TeamMember } from "../../app/types/api/equipe"
import { describe, expect, it } from "vitest"
import { resolveMemberName } from "../../app/utils/resolve-member-name"

function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: "membre-1",
    courriel: "awa@example.com",
    nom: "Awa Ngo",
    telephone: null,
    roles: ["comptoir"],
    comptoirs: [],
    actif: true,
    creeLe: "2026-01-01T00:00:00.000Z",
    premiereConnexionLe: null,
    desactiveLe: null,
    ...overrides,
  }
}

describe("resolveMemberName", () => {
  it("returns the matching member's name", () => {
    const members = [makeMember({ id: "membre-1", nom: "Awa Ngo" }), makeMember({ id: "membre-2", nom: "Paul Eto" })]

    expect(resolveMemberName("membre-2", members)).toBe("Paul Eto")
  })

  it("returns null when the id isn't in the roster", () => {
    expect(resolveMemberName("membre-unknown", [makeMember({ id: "membre-1" })])).toBeNull()
  })

  it("still resolves a deactivated member's name — they're not erased from history", () => {
    const members = [
      makeMember({ id: "membre-1", nom: "Ancien Membre", actif: false, desactiveLe: "2026-05-01T00:00:00.000Z" }),
    ]

    expect(resolveMemberName("membre-1", members)).toBe("Ancien Membre")
  })
})
