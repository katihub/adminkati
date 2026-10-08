import { describe, expect, it } from "vitest"
import { formatDateCourte, formatDayMonthYear, formatLabelSeau, formatMonthYear } from "../../app/utils/dates"

/**
 * 23:30 UTC is 00:30 the next day in Africa/Douala. Every case below uses that
 * instant, so a formatter that quietly falls back to the host timezone reports a
 * different day, hour and month than the shop did.
 */
const MINUIT_TRENTE_DOUALA = "2026-08-31T23:30:00.000Z"

describe("shop-time formatting", () => {
  it("reads instants in Douala time rather than the host's", () => {
    expect(formatLabelSeau(MINUIT_TRENTE_DOUALA, "heure", "en")).toBe("00:30")
    expect(formatLabelSeau(MINUIT_TRENTE_DOUALA, "jour", "en")).toContain("1")
    expect(formatLabelSeau(MINUIT_TRENTE_DOUALA, "mois", "en")).toBe("Sep")
  })

  it("names the month in the reader's language", () => {
    expect(formatLabelSeau(MINUIT_TRENTE_DOUALA, "mois", "fr")).not.toBe(
      formatLabelSeau(MINUIT_TRENTE_DOUALA, "mois", "en"),
    )
  })

  it("dates a transaction to the day and time, never the year", () => {
    const rendu = formatDateCourte(MINUIT_TRENTE_DOUALA, "en")

    expect(rendu).toMatch(/00:30/)
    // Every row of that table is recent, so the year would repeat on all of them
    // and the time of day is what actually tells two orders apart.
    expect(rendu).not.toContain("2026")
  })

  it("dates a membership to the month and year in shop time", () => {
    // 23:30 UTC on 31 August is already 1 September in Douala.
    expect(formatMonthYear(MINUIT_TRENTE_DOUALA, "en")).toBe("Sep 2026")
    expect(formatMonthYear(MINUIT_TRENTE_DOUALA, "fr")).toBe("sept. 2026")
  })

  it("dates a deactivation to the full day, with the year", () => {
    const rendu = formatDayMonthYear(MINUIT_TRENTE_DOUALA, "en")

    expect(rendu).toContain("Sep")
    expect(rendu).toMatch(/\b1\b/)
    expect(rendu).toContain("2026")
  })
})
