import type { InventaireProduit } from "../../app/types/api/inventaire"
import { describe, expect, it } from "vitest"
import { toggledRestockingStatus } from "../../app/utils/inventory-movement"

function inventory(overrides: Partial<InventaireProduit>): InventaireProduit {
  return {
    produit_id: 1,
    quantite_stock: 0,
    statut_stock: "rupture",
    modifie_le: "2026-09-29T10:00:00.000Z",
    disponibilite_forcee: null,
    ...overrides,
  }
}

describe("restocking toggle", () => {
  it("offers restocking on an empty shelf that is out of stock", () => {
    expect(toggledRestockingStatus(inventory({ statut_stock: "rupture" }))).toBe("reapprovisionnement")
  })

  it("offers to clear restocking on an empty shelf that is being restocked", () => {
    expect(toggledRestockingStatus(inventory({ statut_stock: "reapprovisionnement" }))).toBe("rupture")
  })

  it("offers nothing while stock is on hand, whatever the stored status", () => {
    expect(toggledRestockingStatus(inventory({ quantite_stock: 3, statut_stock: "rupture" }))).toBeNull()
    expect(toggledRestockingStatus(inventory({ quantite_stock: 3, statut_stock: "reapprovisionnement" }))).toBeNull()
  })

  it("offers nothing for an empty shelf already marked in stock", () => {
    expect(toggledRestockingStatus(inventory({ statut_stock: "en_stock" }))).toBeNull()
  })

  it("offers nothing for a product that was never counted, whatever the reported status", () => {
    expect(toggledRestockingStatus(inventory({ statut_stock: "rupture", modifie_le: null }))).toBeNull()
    expect(toggledRestockingStatus(inventory({ statut_stock: "reapprovisionnement", modifie_le: null }))).toBeNull()
  })

  it("offers nothing while the direction has decided the status, which hides the physical state", () => {
    expect(toggledRestockingStatus(inventory({ statut_stock: "rupture", disponibilite_forcee: "rupture" }))).toBeNull()
  })

  it("offers nothing before the inventory has loaded", () => {
    expect(toggledRestockingStatus(undefined)).toBeNull()
  })
})
