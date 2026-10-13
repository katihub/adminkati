import type { PilotMeasures, PilotPolicy } from "@/types/api/marketplace-pilot"

/** The pilot exit criteria the backend enforces by default (go/no-go policy of the Douala pilot). */
export const DEFAULT_PILOT_POLICY: PilotPolicy = {
  joursObservationMinimum: 14,
  commandesLivreesMinimum: 100,
  tauxLivraisonMinimumBps: 9_000,
  tauxAnnulationMaximumBps: 500,
  tauxLitigeMaximumBps: 300,
  tempsRapprochementMaximumMinutes: 180,
  backlogSupportMaximum: 10,
}

export type PilotIndicatorKey =
  | "observedDays"
  | "deliveredOrders"
  | "deliveryRate"
  | "cancellationRate"
  | "disputeRate"
  | "reconciliationP95"
  | "supportBacklog"
  | "unexplainedGaps"
  | "criticalIncidents"

export interface PilotIndicator {
  key: PilotIndicatorKey
  kind: "count" | "rate" | "minutes"
  value: number
  threshold: number
  comparison: "min" | "max"
  ok: boolean
}

function indicator(
  key: PilotIndicatorKey,
  kind: PilotIndicator["kind"],
  value: number,
  threshold: number,
  comparison: PilotIndicator["comparison"],
): PilotIndicator {
  return { key, kind, value, threshold, comparison, ok: comparison === "min" ? value >= threshold : value <= threshold }
}

/** Each measure next to the threshold it is judged against, in the order the go/no-go reads them. */
export function pilotIndicators(measures: PilotMeasures, policy: PilotPolicy): PilotIndicator[] {
  return [
    indicator("observedDays", "count", measures.joursObserves, policy.joursObservationMinimum, "min"),
    indicator("deliveredOrders", "count", measures.commandesLivrees, policy.commandesLivreesMinimum, "min"),
    indicator("deliveryRate", "rate", measures.tauxLivraisonBps, policy.tauxLivraisonMinimumBps, "min"),
    indicator("cancellationRate", "rate", measures.tauxAnnulationBps, policy.tauxAnnulationMaximumBps, "max"),
    indicator("disputeRate", "rate", measures.tauxLitigeBps, policy.tauxLitigeMaximumBps, "max"),
    indicator(
      "reconciliationP95",
      "minutes",
      measures.tempsRapprochementP95Minutes,
      policy.tempsRapprochementMaximumMinutes,
      "max",
    ),
    indicator("supportBacklog", "count", measures.backlogSupport, policy.backlogSupportMaximum, "max"),
    indicator("unexplainedGaps", "count", measures.ecartsFinanciersInexpliques, 0, "max"),
    indicator("criticalIncidents", "count", measures.incidentsCritiquesOuverts, 0, "max"),
  ]
}

/** Basis points as a percentage: 9 000 bps reads "90 %". Rates stay integers server-side; only display divides. */
export function formatBps(bps: number, locale: string): string {
  return `${(bps / 100).toLocaleString(locale, { maximumFractionDigits: 2 })} %`
}

export function formatIndicatorValue(kind: PilotIndicator["kind"], value: number, locale: string): string {
  if (kind === "rate") return formatBps(value, locale)
  if (kind === "minutes") return `${value.toLocaleString(locale)} min`
  return value.toLocaleString(locale)
}

/** Converts a percentage typed in the form ("90" or "2,5") into basis points, or null when unreadable. */
export function percentToBps(value: string | number): number | null {
  const parsed = typeof value === "number" ? value : Number(value.replace(",", ".").trim())
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null
  return Math.round(parsed * 100)
}
