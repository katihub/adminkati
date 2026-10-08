import { describe, expect, it } from "vitest"
import { scoreToArc } from "../../app/utils/gauge"

describe("scoreToArc", () => {
  it("clamps scores below zero to an empty arc", () => {
    const result = scoreToArc(-20, 40)

    expect(result.angle).toBe(0)
    expect(result.indefini).toBe(false)
    expect(result.d).toMatch(/^M /)
  })

  it("clamps scores above one hundred to a full arc", () => {
    const result = scoreToArc(140, 40)

    expect(result.angle).toBe(360)
    expect(result.indefini).toBe(false)
    expect(result.d).toMatch(/^M /)
  })

  it("marks a missing score as indeterminate instead of drawing a misleading arc", () => {
    const result = scoreToArc(Number.NaN, 40)

    expect(result.indefini).toBe(true)
    expect(result.angle).toBe(0)
    expect(result.d).toBe("")
  })
})
