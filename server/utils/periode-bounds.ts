import type { Granularite, Periode } from "@/types/api/statistiques"

/**
 * GOTCHA: this deliberately does NOT import `app/utils/periode.ts`. The `@`/`~`
 * alias belongs to the app build, and depending on it from Nitro at runtime is a
 * portability bet; the type import above is erased, so it costs nothing. The
 * duplicated preset list dies with the mock endpoint it exists to serve.
 */

/** Africa/Douala is UTC+01:00 and has never observed DST, so one constant suffices. */
export const DECALAGE_DOUALA_MS = 60 * 60 * 1000

const PERIODES: readonly Periode[] = ["aujourdhui", "7j", "30j", "3mois", "12mois"]

const GRANULARITES: Record<Periode, Granularite> = {
  aujourdhui: "heure",
  "7j": "jour",
  "30j": "jour",
  "3mois": "jour",
  "12mois": "mois",
}

/** `12mois` is absent because it counts back in calendar months, not in days. */
const JOURS_EN_ARRIERE: Record<Exclude<Periode, "12mois">, number> = {
  aujourdhui: 0,
  "7j": 6,
  "30j": 29,
  "3mois": 89,
}

export interface PeriodeBounds {
  debut: Date
  fin: Date
  precedentDebut: Date
  precedentFin: Date
  granularite: Granularite
}

/** Shifted into Douala time, floored, then shifted back, so a shop day is a local day. */
function debutDuJourLocal(instant: Date, joursEnArriere: number): Date {
  const local = new Date(instant.getTime() + DECALAGE_DOUALA_MS)
  local.setUTCHours(0, 0, 0, 0)
  local.setUTCDate(local.getUTCDate() - joursEnArriere)
  return new Date(local.getTime() - DECALAGE_DOUALA_MS)
}

/** Day is pinned to the 1st before the month moves, or 31 March would land in April. */
function debutDuMoisLocal(instant: Date, moisEnArriere: number): Date {
  const local = new Date(instant.getTime() + DECALAGE_DOUALA_MS)
  local.setUTCHours(0, 0, 0, 0)
  local.setUTCDate(1)
  local.setUTCMonth(local.getUTCMonth() - moisEnArriere)
  return new Date(local.getTime() - DECALAGE_DOUALA_MS)
}

/**
 * The Nitro-side copy of `parsePeriode`. An unrecognised value falls back to the
 * default month rather than answering 400: the only way one arrives is a
 * hand-edited URL, and erroring on that is worse than showing the default.
 */
export function parsePeriodeRequete(raw: unknown): Periode {
  return typeof raw === "string" && (PERIODES as readonly string[]).includes(raw) ? (raw as Periode) : "30j"
}

/** Half-open `[debut, fin)`, resolved in Africa/Douala — spec §2.1. */
export function resolvePeriodeBounds(periode: Periode, now: Date): PeriodeBounds {
  const fin = new Date(now.getTime())
  const granularite = GRANULARITES[periode]

  if (periode === "12mois") {
    const debut = debutDuMoisLocal(now, 11)
    return {
      debut,
      fin,
      // Calendar months rather than subtracting the window's duration: over a
      // leap year a duration subtraction drifts by a day, which would make
      // every delta on the page subtly wrong.
      precedentDebut: debutDuMoisLocal(now, 23),
      precedentFin: debut,
      granularite,
    }
  }

  const debut = debutDuJourLocal(now, JOURS_EN_ARRIERE[periode])
  return {
    debut,
    fin,
    precedentDebut: new Date(debut.getTime() - (fin.getTime() - debut.getTime())),
    precedentFin: debut,
    granularite,
  }
}
