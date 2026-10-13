import { describe, expect, it } from "vitest"
import {
  DEFAULT_PILOT_POLICY,
  formatBps,
  formatIndicatorValue,
  percentToBps,
  pilotIndicators,
} from "../../app/utils/pilot-measures"

const MEASURES = {
  joursObserves: 15,
  commandesLivrees: 120,
  tauxLivraisonBps: 9_200,
  tauxAnnulationBps: 600,
  tauxLitigeBps: 300,
  tempsRapprochementP95Minutes: 181,
  backlogSupport: 10,
  ecartsFinanciersInexpliques: 0,
  incidentsCritiquesOuverts: 1,
  retoursTestes: true,
  remboursementsTestes: true,
  responsabilitesLogistiquesAuditables: true,
}

describe("pilot indicators", () => {
  it("judges minimums and maximums inclusively against the policy", () => {
    const byKey = Object.fromEntries(pilotIndicators(MEASURES, DEFAULT_PILOT_POLICY).map(i => [i.key, i.ok]))

    expect(byKey).toEqual({
      observedDays: true,
      deliveredOrders: true,
      deliveryRate: true,
      cancellationRate: false,
      disputeRate: true,
      reconciliationP95: false,
      supportBacklog: true,
      unexplainedGaps: true,
      criticalIncidents: false,
    })
  })

  it("formats basis points, minutes and counts for display only", () => {
    expect(formatBps(9_000, "en")).toBe("90 %")
    expect(formatBps(250, "en")).toBe("2.5 %")
    expect(formatIndicatorValue("minutes", 180, "en")).toBe("180 min")
    expect(formatIndicatorValue("count", 1200, "en")).toBe("1,200")
  })

  it("reads typed percentages into integer basis points and refuses nonsense", () => {
    expect(percentToBps("90")).toBe(9_000)
    expect(percentToBps("2,5")).toBe(250)
    expect(percentToBps(3)).toBe(300)
    expect(percentToBps("abc")).toBeNull()
    expect(percentToBps("101")).toBeNull()
    expect(percentToBps("-1")).toBeNull()
  })
})
