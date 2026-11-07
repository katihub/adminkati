import { describe, expect, it } from "vitest"
import {
  productCheckActions,
  productCheckLowestPrice,
  productCheckNeedsReason,
  productCheckPath,
} from "../../app/utils/product-check"

describe("products to check", () => {
  it("offers hide on a live product and restore on a hidden one; delete to the direction only", () => {
    expect(productCheckActions({ statut: "actif" }, ["point_focal"])).toEqual(["seen", "hide", "correction"])
    expect(productCheckActions({ statut: "suspendu" }, ["direction"])).toEqual([
      "seen",
      "restore",
      "correction",
      "delete",
    ])
  })

  it("asks a reason for hide, correction and delete", () => {
    expect(
      ["seen", "hide", "restore", "correction", "delete"].filter(action => productCheckNeedsReason(action as never)),
    ).toEqual(["hide", "correction", "delete"])
  })

  it("maps each action to its endpoint", () => {
    expect(productCheckPath("p1", "hide")).toBe("/marketplace/moderation/produits/p1/masquer")
    expect(productCheckPath("p1", "seen")).toBe("/marketplace/moderation/produits/p1/vu")
    expect(productCheckPath("p1", "delete")).toBe("/marketplace/moderation/produits/p1/supprimer")
  })

  it("gives the lowest price, or none", () => {
    expect(
      productCheckLowestPrice({
        offres: [
          { id: "a", titre: null, libelleVariante: null, prixFcfa: 9000 },
          { id: "b", titre: null, libelleVariante: null, prixFcfa: 7000 },
        ],
      }),
    ).toBe(7000)
    expect(productCheckLowestPrice({ offres: [] })).toBeNull()
  })
})
