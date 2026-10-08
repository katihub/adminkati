import { describe, expect, it } from "vitest"
import { sparklineEndpoint, sparklinePath } from "../../app/utils/sparkline"

describe("sparklinePath", () => {
  it("returns no path for an empty series", () => {
    expect(sparklinePath([], 70, 24)).toBeNull()
  })

  it("keeps an all-zero series as a flat mid-height line", () => {
    const path = sparklinePath([0, 0, 0], 70, 24)

    expect(path).toContain("M 0 12")
    expect(path).toContain("L 70 12")
  })

  it("draws a short dash centered on the chart for one point", () => {
    const path = sparklinePath([4], 70, 24)

    expect(path).toMatch(/^M 3[34] 12 L 3[67] 12$/)
  })

  it("uses the full width and height range for multiple values", () => {
    const path = sparklinePath([0, 10], 70, 24)

    expect(path).toBe("M 0 24 L 70 0")
  })
})

describe("sparklineEndpoint", () => {
  it("returns no endpoint for an empty series", () => {
    expect(sparklineEndpoint([], 70, 24)).toBeNull()
  })

  it("centers a single point and a flat series", () => {
    expect(sparklineEndpoint([4], 70, 24)).toEqual({ x: 35, y: 12 })
    expect(sparklineEndpoint([4, 4], 70, 24)).toEqual({ x: 70, y: 12 })
  })

  it("places the endpoint at the final value's normalized height", () => {
    expect(sparklineEndpoint([0, 10], 70, 24)).toEqual({ x: 70, y: 0 })
  })
})
