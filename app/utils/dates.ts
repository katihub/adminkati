import type { Granularite } from "@/types/api/statistiques"

/**
 * Every instant on the overview belongs to a shop day, not to the browser's day.
 * An admin travelling with a laptop still on Paris time must read the same chart
 * as the counter in Douala, so the timezone is pinned rather than left to the
 * host — the backend stores `Timestamptz` and the spec buckets in Africa/Douala.
 */
export const FUSEAU_BOUTIQUE = "Africa/Douala"

const OPTIONS_SEAU: Record<Granularite, Intl.DateTimeFormatOptions> = {
  heure: { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
  jour: { day: "numeric", month: "short" },
  mois: { month: "short" },
}

/** The x-axis tick for one chart bucket, named the way its granularity reads. */
export function formatLabelSeau(iso: string, granularite: Granularite, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: FUSEAU_BOUTIQUE, ...OPTIONS_SEAU[granularite] }).format(
    new Date(iso),
  )
}

/**
 * The year is deliberately absent: these rows are the latest orders, so it would
 * be the same value on every line and the time of day is what tells them apart.
 */
export function formatDateCourte(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: FUSEAU_BOUTIQUE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso))
}

/** The month and year a member joined, in shop time. */
export function formatMonthYear(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: FUSEAU_BOUTIQUE, month: "short", year: "numeric" }).format(
    new Date(iso),
  )
}

/** A full calendar day with its year, in shop time. */
export function formatDayMonthYear(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: FUSEAU_BOUTIQUE, dateStyle: "medium" }).format(new Date(iso))
}
