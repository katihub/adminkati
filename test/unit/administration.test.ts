import { describe, expect, it } from "vitest"
import { assignableTeamRoles, canManageMember, canMoveMoney, isAdministration } from "../../app/utils/administration"

const ALL = ["direction", "gestionnaire", "comptoir", "preparation", "livreur", "point_focal"] as const

describe("administration roles (12 November 2026)", () => {
  it("treats the KatiMarket manager as an administrator who moves no money", () => {
    expect(isAdministration(["gestionnaire"])).toBe(true)
    expect(isAdministration(["direction"])).toBe(true)
    expect(isAdministration(["comptoir", "point_focal"])).toBe(false)
    expect(canMoveMoney(["gestionnaire"])).toBe(false)
    expect(canMoveMoney(["direction"])).toBe(true)
    expect(canMoveMoney(undefined)).toBe(false)
  })

  it("lets only the direction give the direction and manager roles", () => {
    expect(assignableTeamRoles(ALL, ["direction"])).toEqual([...ALL])
    expect(assignableTeamRoles(ALL, ["gestionnaire"])).toEqual(["comptoir", "preparation", "livreur", "point_focal"])
  })

  it("lets the manager manage ordinary members only", () => {
    expect(canManageMember(["gestionnaire"], ["comptoir"])).toBe(true)
    expect(canManageMember(["gestionnaire"], ["direction"])).toBe(false)
    expect(canManageMember(["gestionnaire"], ["gestionnaire", "comptoir"])).toBe(false)
    expect(canManageMember(["direction"], ["direction"])).toBe(true)
    expect(canManageMember(["comptoir"], ["livreur"])).toBe(false)
  })
})
