import { describe, expect, it } from "vitest"
import { parsePeriodeRequete, resolvePeriodeBounds } from "../../server/utils/periode-bounds"

describe("resolvePeriodeBounds", () => {
  it("sets debut to the start of today in Africa/Douala (UTC+01:00) for aujourdhui, with fin at now and heure granularite", () => {
    const now = new Date("2026-03-15T10:00:00Z")
    const bounds = resolvePeriodeBounds("aujourdhui", now)

    expect(bounds.debut.toISOString()).toBe("2026-03-14T23:00:00.000Z")
    expect(bounds.fin).toEqual(now)
    expect(bounds.granularite).toBe("heure")
  })

  it("uses the Douala-local calendar day rather than the UTC calendar day when the two disagree", () => {
    // 2026-03-10T23:30:00Z is already 2026-03-11T00:30:00+01:00 in Douala, so "today" is the 11th.
    const now = new Date("2026-03-10T23:30:00Z")
    const bounds = resolvePeriodeBounds("aujourdhui", now)

    expect(bounds.debut.toISOString()).toBe("2026-03-10T23:00:00.000Z")
  })

  it("sets the comparison window to the same length immediately preceding the current one, for a day-based preset", () => {
    const now = new Date("2026-06-15T12:00:00Z")
    const bounds = resolvePeriodeBounds("7j", now)

    expect(bounds.precedentFin.getTime()).toBe(bounds.debut.getTime())
    expect(bounds.debut.getTime() - bounds.precedentDebut.getTime()).toBe(bounds.fin.getTime() - bounds.debut.getTime())
    expect(bounds.granularite).toBe("jour")
  })

  it("crosses a month boundary correctly when 30j reaches back into the previous month", () => {
    // Douala-local "today" is 2026-03-05; 29 days back lands on 2026-02-04.
    const now = new Date("2026-03-05T08:00:00Z")
    const bounds = resolvePeriodeBounds("30j", now)

    expect(bounds.debut.toISOString()).toBe("2026-02-03T23:00:00.000Z")
  })

  it("uses calendar months, not fixed-length duration, for 12mois: debut is the first of the month 11 months back", () => {
    const now = new Date("2026-03-15T10:00:00Z")
    const bounds = resolvePeriodeBounds("12mois", now)

    expect(bounds.debut.toISOString()).toBe("2025-03-31T23:00:00.000Z")
    expect(bounds.granularite).toBe("mois")
  })

  it("sets the 12mois comparison window to 12 whole calendar months earlier, exactly one year before debut on the same month and day", () => {
    const now = new Date("2026-03-15T10:00:00Z")
    const bounds = resolvePeriodeBounds("12mois", now)

    expect(bounds.precedentFin.getTime()).toBe(bounds.debut.getTime())
    expect(bounds.debut.getUTCFullYear() - bounds.precedentDebut.getUTCFullYear()).toBe(1)
    expect(bounds.precedentDebut.getUTCMonth()).toBe(bounds.debut.getUTCMonth())
    expect(bounds.precedentDebut.getUTCDate()).toBe(bounds.debut.getUTCDate())
  })

  it("reaches back into the previous calendar year for 12mois from a January now, without overflowing into month 13 or -1", () => {
    const now = new Date("2026-01-15T10:00:00Z")
    const bounds = resolvePeriodeBounds("12mois", now)

    expect(bounds.debut.toISOString()).toBe("2025-01-31T23:00:00.000Z")
    expect(bounds.precedentDebut.toISOString()).toBe("2024-01-31T23:00:00.000Z")
  })
})

describe("parsePeriodeRequete", () => {
  it("parses a recognised preset string to itself", () => {
    expect(parsePeriodeRequete("aujourdhui")).toBe("aujourdhui")
    expect(parsePeriodeRequete("3mois")).toBe("3mois")
  })

  it("falls back to 30j when the string is not a recognised preset", () => {
    expect(parsePeriodeRequete("not-a-real-periode")).toBe("30j")
  })

  it("falls back to 30j when h3 hands back an array for a repeated periode query param", () => {
    expect(parsePeriodeRequete(["7j", "30j"])).toBe("30j")
  })

  it("falls back to 30j when the periode parameter is absent", () => {
    expect(parsePeriodeRequete(undefined)).toBe("30j")
  })
})
