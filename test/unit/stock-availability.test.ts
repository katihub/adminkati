import type { InventaireProduit } from "../../app/types/api/inventaire"
import { describe, expect, it } from "vitest"
import { availabilityConflict } from "../../app/utils/stock-availability"

const COUNTED_AT = "2026-09-29T10:00:00.000Z"

function inventory(overrides: Partial<InventaireProduit> = {}): InventaireProduit {
  return {
    produit_id: 1,
    quantite_stock: 0,
    statut_stock: "rupture",
    modifie_le: COUNTED_AT,
    disponibilite_forcee: null,
    ...overrides,
  }
}

describe("availability conflict", () => {
  it("warns when a status contradicts the count on record", () => {
    expect(availabilityConflict(inventory({ quantite_stock: 0 }), "en_stock")).toBe("sell-without-stock")
    expect(availabilityConflict(inventory({ quantite_stock: 5, statut_stock: "en_stock" }), "rupture")).toBe(
      "hide-with-stock",
    )
  })

  it("stays silent when the status agrees with the count", () => {
    expect(availabilityConflict(inventory({ quantite_stock: 5, statut_stock: "en_stock" }), "en_stock")).toBeNull()
    expect(availabilityConflict(inventory({ quantite_stock: 0 }), "rupture")).toBeNull()
  })

  it("never warns for a product nobody has counted, which has no amount to contradict", () => {
    const uncounted = inventory({ modifie_le: null, statut_stock: "en_stock" })

    expect(availabilityConflict(uncounted, "rupture")).toBeNull()
    expect(availabilityConflict(uncounted, "en_stock")).toBeNull()
  })

  it("warns when handing the decision back to the count would flip availability", () => {
    const hiddenWithStock = inventory({ quantite_stock: 5, statut_stock: "rupture", disponibilite_forcee: "rupture" })
    const soldWithoutStock = inventory({
      quantite_stock: 0,
      statut_stock: "en_stock",
      disponibilite_forcee: "en_stock",
    })

    expect(availabilityConflict(hiddenWithStock, null)).toBe("resume-flips")
    expect(availabilityConflict(soldWithoutStock, null)).toBe("resume-flips")
  })

  it("stays silent when handing the decision back changes nothing", () => {
    const agrees = inventory({ quantite_stock: 5, statut_stock: "en_stock", disponibilite_forcee: "en_stock" })
    const nothingDecided = inventory({ quantite_stock: 5, statut_stock: "en_stock" })

    expect(availabilityConflict(agrees, null)).toBeNull()
    expect(availabilityConflict(nothingDecided, null)).toBeNull()
  })
})
