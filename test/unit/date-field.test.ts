import { CalendarDate } from "@internationalized/date"
import { describe, expect, it } from "vitest"
import {
  formatDateField,
  formatDateRangePreview,
  parseDateField,
  toCalendarDate,
  toCalendarDates,
  toDateRangeValue,
} from "../../app/utils/date-field"

describe("date field conversion", () => {
  it("reads the form's day string as a calendar date", () => {
    expect(parseDateField("2026-09-30")).toEqual(new CalendarDate(2026, 9, 30))
  })

  it("treats an empty field as no date", () => {
    expect(parseDateField("")).toBeUndefined()
  })

  it("rejects a day that does not exist instead of shifting it", () => {
    expect(parseDateField("2026-02-31")).toBeUndefined()
    expect(parseDateField("2026-13-45")).toBeUndefined()
  })

  it("rejects anything that is not the field's own format", () => {
    expect(parseDateField("30/09/2026")).toBeUndefined()
    expect(parseDateField("2026-9-3")).toBeUndefined()
  })

  it("writes a picked date back as the form's day string", () => {
    expect(formatDateField(new CalendarDate(2026, 1, 5))).toBe("2026-01-05")
  })

  it("writes a cleared picker as an empty field", () => {
    expect(formatDateField(undefined)).toBe("")
    expect(formatDateField(null)).toBe("")
  })

  it("reads a DateValue that is not a CalendarDate instance as a calendar day", () => {
    const dateValue = { year: 2026, month: 9, day: 8 }

    expect(toCalendarDate(dateValue)).toEqual(new CalendarDate(2026, 9, 8))
  })

  it("keeps a single picker date so the next click can complete the range", () => {
    expect(toCalendarDates([{ year: 2026, month: 9, day: 8 }])).toEqual([new CalendarDate(2026, 9, 8)])
    expect(
      toCalendarDates([
        { year: 2026, month: 9, day: 1 },
        { year: 2026, month: 9, day: 8 },
      ]),
    ).toEqual([new CalendarDate(2026, 9, 1), new CalendarDate(2026, 9, 8)])
  })

  it("commits a picker range only when both ends exist, even if they are not CalendarDate instances", () => {
    expect(toDateRangeValue([{ year: 2026, month: 9, day: 8 }])).toBeUndefined()
    expect(
      toDateRangeValue([
        { year: 2026, month: 9, day: 8 },
        { year: 2026, month: 9, day: 8 },
      ]),
    ).toEqual({
      start: new CalendarDate(2026, 9, 8),
      end: new CalendarDate(2026, 9, 8),
    })
    expect(
      toDateRangeValue([
        { year: 2026, month: 9, day: 10 },
        { year: 2026, month: 9, day: 1 },
      ]),
    ).toEqual({
      start: new CalendarDate(2026, 9, 1),
      end: new CalendarDate(2026, 9, 10),
    })
  })

  it("previews a range as padded day-month-year with a hyphen between the ends", () => {
    expect(
      formatDateRangePreview({
        start: new CalendarDate(2026, 6, 23),
        end: new CalendarDate(2027, 10, 29),
      }),
    ).toBe("23-06-2026 - 29-10-2027")
  })
})
