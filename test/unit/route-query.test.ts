import { describe, expect, it } from "vitest"
import { routeQueryId } from "../../app/utils/route-query"

describe("route query id", () => {
  it("reads a positive integer, including the first of a repeated parameter", () => {
    expect(routeQueryId("3")).toBe(3)
    expect(routeQueryId(["7", "8"])).toBe(7)
  })

  it("refuses anything a row id cannot be", () => {
    expect(routeQueryId(undefined)).toBeNull()
    expect(routeQueryId("")).toBeNull()
    expect(routeQueryId("0")).toBeNull()
    expect(routeQueryId("-2")).toBeNull()
    expect(routeQueryId("1.5")).toBeNull()
    expect(routeQueryId("abc")).toBeNull()
  })
})
