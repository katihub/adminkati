import { describe, expect, it } from "vitest"
import { parseEditor } from "../../app/utils/banner-editor"

describe("banner editor", () => {
  it('splits the backend\'s "Name <email>" into a name and an email', () => {
    expect(parseEditor("Awa Ngo <awa@example.com>")).toEqual({ name: "Awa Ngo", email: "awa@example.com" })
  })

  it("keeps a plain name as it is", () => {
    expect(parseEditor("Awa Ngo")).toEqual({ name: "Awa Ngo", email: null })
  })

  it("falls back to the address when there is no name", () => {
    expect(parseEditor("<awa@example.com>")).toEqual({ name: "awa@example.com", email: "awa@example.com" })
  })

  it("has nobody to show when the banner was never edited by a person", () => {
    expect(parseEditor(null)).toBeNull()
    expect(parseEditor("")).toBeNull()
    expect(parseEditor("   ")).toBeNull()
  })

  it("does not present the backend's placeholder for an unknown caller as a person", () => {
    expect(parseEditor("inconnu")).toBeNull()
  })
})
