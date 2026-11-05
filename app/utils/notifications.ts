/** BackendKati/src/notifications/notifications-app.service.ts — the in-app notifications of the team. */
export interface TeamNotification {
  id: string
  type: string
  titre: string
  texte: string
  lien: string | null
  creeLe: string
  lu: boolean
}

export interface TeamNotificationsPage {
  elements: TeamNotification[]
  nonLues: number
  suivant: string | null
}

/** The badge never grows wider than two digits. */
export function unreadBadge(count: number): string {
  return count > 99 ? "99+" : String(count)
}

/** The backend stores a panel path (`/operations?tab=…`); the router wants its path and query apart. */
export function notificationTarget(lien: string | null): { path: string; query: Record<string, string> } | null {
  if (!lien?.startsWith("/")) return null
  const url = new URL(lien, "https://panel.invalid")
  return { path: url.pathname, query: Object.fromEntries(url.searchParams) }
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

/** « il y a 5 min », « hier »… in the panel language; under a minute reads « now ». */
export function relativeTime(iso: string, locale: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000)
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(0, "second")
}
