import type { DateValue } from "@internationalized/date"
import { CalendarDate, parseDate } from "@internationalized/date"

/**
 * The form keeps a day as `2026-09-30`, the calendar wants a `CalendarDate`.
 * `parseDate` throws on anything it cannot place, and an impossible day like
 * `2026-02-31` must not be nudged to another one: it reads as no date.
 */
export function parseDateField(value: string): CalendarDate | undefined {
  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

export function formatDateField(date: DateValue | null | undefined): string {
  return date ? new CalendarDate(date.year, date.month, date.day).toString() : ""
}

function numericDatePart(value: object, key: string): number | undefined {
  const part = Reflect.get(value, key)
  return typeof part === "number" ? part : undefined
}

function isoFromDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function calendarDateFromParts(value: object): CalendarDate | undefined {
  const year = numericDatePart(value, "year")
  const month = numericDatePart(value, "month")
  const day = numericDatePart(value, "day")
  if (year === undefined) return undefined
  if (month === undefined) return undefined
  if (day === undefined) return undefined

  return parseDateField(isoFromDateParts(year, month, day))
}

/** Ark's picker can emit a DateValue that is not a `CalendarDate` instance. */
export function toCalendarDate(value: unknown): CalendarDate | undefined {
  if (value instanceof CalendarDate) return value
  if (typeof value !== "object" || value === null) return undefined

  return calendarDateFromParts(value)
}

export function toCalendarDates(dates: unknown): CalendarDate[] {
  if (!Array.isArray(dates)) return []

  return dates.flatMap(date => {
    const next = toCalendarDate(date)
    return next ? [next] : []
  })
}

export function toDateRangeValue(dates: unknown): { start: CalendarDate; end: CalendarDate } | undefined {
  const [start, end] = toCalendarDates(dates)
  if (!start || !end) return undefined

  return start.compare(end) <= 0 ? { start, end } : { start: end, end: start }
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0")
}

/** Chip preview: `23-06-2026 - 29-10-2027`. */
export function formatDateRangePreview(range: { start: CalendarDate; end: CalendarDate }): string {
  const start = `${padDatePart(range.start.day)}-${padDatePart(range.start.month)}-${range.start.year}`
  const end = `${padDatePart(range.end.day)}-${padDatePart(range.end.month)}-${range.end.year}`
  return `${start} - ${end}`
}
