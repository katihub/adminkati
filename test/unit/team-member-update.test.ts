import { describe, expect, it } from "vitest"
import { buildTeamMemberUpdate } from "../../app/utils/team-member-update"

describe("buildTeamMemberUpdate", () => {
  it("trims editable contact values and preserves roles for another member", () => {
    expect(
      buildTeamMemberUpdate({
        name: "  New name  ",
        telephone: " 677000002 ",
        comptoirs: ["Akwa"],
        roles: ["direction", "comptoir"],
        allowRoleEdit: true,
      }),
    ).toEqual({
      nom: "New name",
      telephone: "677000002",
      comptoirs: ["Akwa"],
      roles: ["direction", "comptoir"],
    })
  })

  it("turns a cleared phone into null, keeps an empty perimeter as [], and omits roles for self-edit", () => {
    expect(
      buildTeamMemberUpdate({
        name: "Member",
        telephone: "   ",
        comptoirs: [],
        roles: ["direction"],
        allowRoleEdit: false,
      }),
    ).toEqual({
      nom: "Member",
      telephone: null,
      comptoirs: [],
    })
  })

  it("rejects a name that is empty after trimming", () => {
    expect(
      buildTeamMemberUpdate({
        name: "  ",
        telephone: "677000001",
        comptoirs: ["Akwa"],
        roles: [],
        allowRoleEdit: true,
      }),
    ).toBeNull()
  })
})
