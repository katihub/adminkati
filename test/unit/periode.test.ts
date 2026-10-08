import { describe, expect, it } from "vitest"
import { parsePeriode, PERIODES } from "../../app/utils/periode"

describe("parsePeriode", () => {
  it.each(PERIODES)("parses the valid preset %s to itself", p => {
    expect(parsePeriode(p)).toBe(p)
  })

  it("falls back to 30j for a string that is not one of the presets", () => {
    expect(parsePeriode("bogus")).toBe("30j")
  })

  it("falls back to 30j when Vue Router hands back an array from a repeated query param", () => {
    expect(parsePeriode(["7j", "30j"])).toBe("30j")
  })

  it("falls back to 30j for null, a missing query parameter", () => {
    expect(parsePeriode(null)).toBe("30j")
  })
})
