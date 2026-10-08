import type { Granularite, Periode } from "@/types/api/statistiques"

export const PERIODES: readonly Periode[] = ["aujourdhui", "7j", "30j", "3mois", "12mois"]

const GRANULARITES: Record<Periode, Granularite> = {
  aujourdhui: "heure",
  "7j": "jour",
  "30j": "jour",
  "3mois": "jour",
  "12mois": "mois",
}

/**
 * `raw` is untrusted: it comes from `route.query.periode`, which Vue Router types
 * as `string | string[] | null`, and a hand-edited URL can put anything there. A
 * dashboard that errors on a typo in a query string is worse than one that shows
 * the default month, so everything unrecognised falls back rather than throwing.
 */
export function parsePeriode(raw: unknown): Periode {
  return typeof raw === "string" && (PERIODES as readonly string[]).includes(raw) ? (raw as Periode) : "30j"
}

/** Daily buckets over a single day would draw a one-point chart, hence `heure`. */
export function periodeGranularite(periode: Periode): Granularite {
  return GRANULARITES[periode]
}
