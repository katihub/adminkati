import { describe, expect, it } from "vitest"
import { resolveActor } from "../../app/utils/inventory-actor"

const base = { member: null, viewer: null, roleLabel: "", unknownLabel: "Unknown" }

describe("inventory actor", () => {
  it("shows the signed-in member's own name and email on their movements", () => {
    const viewer = { nom: "Awa", courriel: "awa@example.com" }
    expect(resolveActor({ ...base, viewer, member: { nom: "Roster", courriel: "r@example.com" } })).toEqual({
      name: "Awa",
      email: "r@example.com",
    })
    expect(resolveActor({ ...base, viewer })).toEqual({ name: "Awa", email: "awa@example.com" })
  })

  it("names a rostered member by roster entry", () => {
    expect(
      resolveActor({ ...base, member: { nom: "Koffi", courriel: "k@example.com" }, roleLabel: "Direction" }),
    ).toEqual({ name: "Koffi", email: "k@example.com" })
  })

  it("falls back to the role label, then to the unknown label, with no email", () => {
    expect(resolveActor({ ...base, roleLabel: "Direction, Comptoir" })).toEqual({
      name: "Direction, Comptoir",
      email: null,
    })
    expect(resolveActor(base)).toEqual({ name: "Unknown", email: null })
  })

  it("skips a roster entry whose name is empty", () => {
    expect(resolveActor({ ...base, member: { nom: "", courriel: "k@example.com" }, roleLabel: "Direction" }).name).toBe(
      "Direction",
    )
  })
})
