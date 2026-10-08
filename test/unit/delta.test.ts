import { describe, expect, it } from "vitest"
import { computeDelta } from "../../app/utils/delta"

describe("computeDelta", () => {
  it("returns a null pct, never Infinity, when the previous value is zero", () => {
    const { pct, sens } = computeDelta(5, 0)

    expect(pct).toBeNull()
    expect(pct).not.toBe(Number.POSITIVE_INFINITY)
    expect(sens).toBe("hausse")
  })

  it("returns a null pct and a stable sens when both values are zero", () => {
    const { pct, sens } = computeDelta(0, 0)

    expect(pct).toBeNull()
    expect(sens).toBe("stable")
  })

  it("reports an ordinary rise as a positive percentage", () => {
    const { pct, sens } = computeDelta(150, 100)

    expect(pct).toBeCloseTo(50)
    expect(sens).toBe("hausse")
  })

  it("reports an ordinary fall as a negative percentage", () => {
    const { pct, sens } = computeDelta(80, 100)

    expect(pct).toBeCloseTo(-20)
    expect(sens).toBe("baisse")
  })

  it("reports equal values as stable with no change", () => {
    const { pct, sens } = computeDelta(100, 100)

    expect(pct).toBeCloseTo(0)
    expect(sens).toBe("stable")
  })

  // Negative baseline: a naive (courant - precedent) / precedent gives
  // (-100 - -50) / -50 = +100%, which reads as a rise when the figure
  // actually fell further into the negative. Only dividing by the baseline's
  // magnitude reports the true direction.
  it("reports a fall from a negative baseline as baisse with a negative pct, not a fabricated rise", () => {
    const { pct, sens } = computeDelta(-100, -50)

    expect(sens).toBe("baisse")
    expect(pct).not.toBeNull()
    expect(pct!).toBeLessThan(0)
  })
})
