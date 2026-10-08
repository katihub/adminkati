import { describe, expect, it } from "vitest"
import { initialsFromEmailOrName } from "../../app/utils/message-avatar"

describe("initialsFromEmailOrName", () => {
  it("derives two initials from a dotted email local part when no name is given", () => {
    expect(initialsFromEmailOrName("jane.doe@example.com", null)).toBe("JD")
  })

  it("prefers the email over the name when both are present", () => {
    expect(initialsFromEmailOrName("jane.doe@example.com", "Awa Ngo")).toBe("JD")
  })

  it("falls back to the name when there is no email", () => {
    expect(initialsFromEmailOrName(null, "Awa Ngo")).toBe("AN")
  })

  it("returns null when neither email nor name is available", () => {
    expect(initialsFromEmailOrName(null, null)).toBeNull()
  })

  it("returns null for an email with an empty local part", () => {
    expect(initialsFromEmailOrName("@example.com", null)).toBeNull()
  })
})
