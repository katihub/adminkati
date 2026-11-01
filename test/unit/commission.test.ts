import { describe, expect, it } from "vitest"
import { bpsFromPercent, percentFromBps } from "../../app/utils/commission"

describe("commission rate conversions", () => {
  it("reads a typed percentage, with a comma or a dot, into basis points", () => {
    expect(bpsFromPercent("10")).toBe(1000)
    expect(bpsFromPercent(" 7,5 ")).toBe(750)
    expect(bpsFromPercent("12.25")).toBe(1225)
    expect(bpsFromPercent("0")).toBe(0)
    expect(bpsFromPercent("100")).toBe(10_000)
  })

  it("refuses an empty, non-numeric or out-of-range rate", () => {
    expect(bpsFromPercent("")).toBeNull()
    expect(bpsFromPercent("dix")).toBeNull()
    expect(bpsFromPercent("-1")).toBeNull()
    expect(bpsFromPercent("120")).toBeNull()
  })

  it("shows basis points as a French percentage", () => {
    expect(percentFromBps(1000)).toBe("10")
    expect(percentFromBps(750)).toBe("7,5")
  })
})
