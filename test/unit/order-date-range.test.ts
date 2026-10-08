import { CalendarDate } from "@internationalized/date"
import { describe, expect, it } from "vitest"
import {
  filterOrdersByDateRange,
  isCreeLeInRange,
  shopDay,
  toDateRangeFilterValue,
  toOrderDateRange,
} from "../../app/utils/order-date-range"

describe("order date range", () => {
  it("reads creeLe as the shop's calendar day, not the browser's", () => {
    // 23:30 UTC on 5 Jan is already 00:30 on 6 Jan in Africa/Douala (UTC+1, no DST).
    expect(shopDay("2026-01-05T23:30:00.000Z")).toBe("2026-01-06")
    expect(shopDay("2026-01-05T10:00:00.000Z")).toBe("2026-01-05")
  })

  it("treats an unparseable creeLe as no day", () => {
    expect(shopDay("")).toBeUndefined()
    expect(shopDay("not-a-date")).toBeUndefined()
  })

  it("keeps an order whose shop day sits on either inclusive end of the range", () => {
    const range = { start: "2026-01-05", end: "2026-01-10" }

    expect(isCreeLeInRange("2026-01-05T10:00:00.000Z", range)).toBe(true)
    expect(isCreeLeInRange("2026-01-10T10:00:00.000Z", range)).toBe(true)
  })

  it("drops an order from the day before the start or the day after the end", () => {
    const range = { start: "2026-01-05", end: "2026-01-10" }

    expect(isCreeLeInRange("2026-01-04T10:00:00.000Z", range)).toBe(false)
    expect(isCreeLeInRange("2026-01-11T10:00:00.000Z", range)).toBe(false)
  })

  it("places a late-UTC evening on the Douala day it actually falls on", () => {
    expect(isCreeLeInRange("2026-01-05T23:30:00.000Z", { start: "2026-01-05", end: "2026-01-05" })).toBe(false)
    expect(isCreeLeInRange("2026-01-05T23:30:00.000Z", { start: "2026-01-06", end: "2026-01-06" })).toBe(true)
  })

  it("rejects an unparseable creeLe once a range is applied", () => {
    expect(isCreeLeInRange("not-a-date", { start: "2026-01-05", end: "2026-01-10" })).toBe(false)
  })

  it("leaves the list untouched when no range is set", () => {
    const orders = [
      { id: "in", creeLe: "2026-01-05T10:00:00.000Z" },
      { id: "out", creeLe: "2026-01-20T10:00:00.000Z" },
    ]

    expect(filterOrdersByDateRange(orders, undefined)).toEqual(orders)
  })

  it("keeps only orders whose shop day sits inside the range", () => {
    const orders = [
      { id: "in", creeLe: "2026-01-05T10:00:00.000Z" },
      { id: "out", creeLe: "2026-01-20T10:00:00.000Z" },
    ]

    expect(filterOrdersByDateRange(orders, { start: "2026-01-05", end: "2026-01-10" }).map(order => order.id)).toEqual([
      "in",
    ])
  })

  it("reads a complete CalendarDate chip as YYYY-MM-DD ends, swapping them if they arrive reversed", () => {
    expect(
      toOrderDateRange({
        start: new CalendarDate(2026, 1, 10),
        end: new CalendarDate(2026, 1, 5),
      }),
    ).toEqual({ start: "2026-01-05", end: "2026-01-10" })
  })

  it("ignores a chip that is not a complete date range", () => {
    expect(toOrderDateRange(null)).toBeUndefined()
    expect(toOrderDateRange("2026-01-05")).toBeUndefined()
    expect(toOrderDateRange({ start: new CalendarDate(2026, 1, 5), end: new CalendarDate(2026, 1, 5) })).toEqual({
      start: "2026-01-05",
      end: "2026-01-05",
    })
  })

  it("writes store days back as CalendarDate ends for the chip", () => {
    expect(toDateRangeFilterValue({ start: "2026-01-05", end: "2026-01-10" })).toEqual({
      start: new CalendarDate(2026, 1, 5),
      end: new CalendarDate(2026, 1, 10),
    })
    expect(toDateRangeFilterValue(undefined)).toBeNull()
  })
})
