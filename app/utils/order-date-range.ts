import type { DateValue } from "@internationalized/date"
import { formatDateField, parseDateField } from "./date-field"
import { FUSEAU_BOUTIQUE } from "./dates"

export interface OrderDateRange {
  start: string
  end: string
}

function shopCalendarParts(iso: string): Intl.DateTimeFormatPart[] | undefined {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSEAU_BOUTIQUE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
}

function calendarPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string | undefined {
  return parts.find(part => part.type === type)?.value
}

function joinShopDay(year: string | undefined, month: string | undefined, day: string | undefined): string | undefined {
  return year && month && day ? `${year}-${month}-${day}` : undefined
}

/** `creeLe` as `YYYY-MM-DD` in shop time. Invalid ISO is no day. */
export function shopDay(iso: string): string | undefined {
  const parts = shopCalendarParts(iso)
  if (!parts) return undefined

  return joinShopDay(calendarPart(parts, "year"), calendarPart(parts, "month"), calendarPart(parts, "day"))
}

export function isCreeLeInRange(creeLe: string, range: OrderDateRange): boolean {
  const day = shopDay(creeLe)
  return day !== undefined && day >= range.start && day <= range.end
}

export function filterOrdersByDateRange<T extends { creeLe: string }>(
  orders: T[],
  range: OrderDateRange | undefined,
): T[] {
  if (!range) return orders

  return orders.filter(order => isCreeLeInRange(order.creeLe, range))
}

function isDateRangeChip(value: unknown): value is { start: DateValue; end: DateValue } {
  return typeof value === "object" && value !== null && "start" in value && "end" in value
}

function orderedDayRange(start: string, end: string): OrderDateRange {
  return start <= end ? { start, end } : { start: end, end: start }
}

export function toOrderDateRange(value: unknown): OrderDateRange | undefined {
  if (!isDateRangeChip(value)) return undefined

  const start = formatDateField(value.start)
  const end = formatDateField(value.end)
  if (!start) return undefined
  if (!end) return undefined

  return orderedDayRange(start, end)
}

export function toDateRangeFilterValue(range: OrderDateRange | undefined) {
  if (!range) return null

  const start = parseDateField(range.start)
  const end = parseDateField(range.end)
  if (!start || !end) return null

  return { start, end }
}
