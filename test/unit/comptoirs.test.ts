import type { Comptoir } from "../../app/types/api/vitrine"
import { describe, expect, it } from "vitest"
import {
  comptoirLabel,
  comptoirLabels,
  isOrderInPerimetre,
  moneyPerimetre,
  readingPerimetre,
  selectableComptoirs,
} from "../../app/utils/comptoirs"

const COMPTOIRS: Comptoir[] = [
  { cle: "Akwa-Paris-Dancing", libelle: "Akwa Paris Dancing" },
  { cle: "Akwa", libelle: "Akwa" },
  { cle: "Centre-ville", libelle: "Centre-ville" },
]

describe("comptoirLabel", () => {
  it("reads the label a customer would read", () => {
    expect(comptoirLabel(COMPTOIRS, "Akwa-Paris-Dancing")).toBe("Akwa Paris Dancing")
  })

  /**
   * Une session `preparation` se voit refuser la liste des points de vente : elle
   * n'a aucun libellé. La clé brute reste laide mais nomme le comptoir, là où une
   * case vide laisserait croire qu'il n'y en a pas.
   */
  it("falls back on the raw key when the list could not be read", () => {
    expect(comptoirLabel([], "Akwa")).toBe("Akwa")
  })
})

describe("comptoirLabels", () => {
  it("follows the shop's own display order rather than the order the keys were stored in", () => {
    expect(comptoirLabels(COMPTOIRS, ["Centre-ville", "Akwa-Paris-Dancing"])).toEqual([
      "Akwa Paris Dancing",
      "Centre-ville",
    ])
  })

  it("keeps a key it cannot resolve instead of dropping the counter from sight", () => {
    expect(comptoirLabels(COMPTOIRS, ["Akwa", "Bonaberi"])).toEqual(["Akwa", "Bonaberi"])
  })

  it("returns nothing for an empty perimeter, which the screens read as the whole shop", () => {
    expect(comptoirLabels(COMPTOIRS, [])).toEqual([])
  })
})

describe("isOrderInPerimetre", () => {
  it("lets a member with no counter cash in anywhere, which is what an empty list means", () => {
    expect(isOrderInPerimetre([], "Akwa")).toBe(true)
    expect(isOrderInPerimetre(undefined, "Akwa")).toBe(true)
    expect(isOrderInPerimetre(null, "Akwa")).toBe(true)
  })

  /** Une commande sans comptoir part à domicile : aucun comptoir ne se l'approprie. */
  it("leaves an order with no counter open to every counter member", () => {
    expect(isOrderInPerimetre(["Centre-ville"], null)).toBe(true)
  })

  it("keeps only the counters the member is attached to", () => {
    expect(isOrderInPerimetre(["Centre-ville"], "Akwa")).toBe(false)
    expect(isOrderInPerimetre(["Centre-ville", "Akwa"], "Akwa")).toBe(true)
  })
})

/**
 * Les deux périmètres du backend (`src/commun/perimetre.ts`), recopiés ici parce
 * qu'un écran qui les devine finit par proposer un bouton qui répond 403.
 */
describe("readingPerimetre / moneyPerimetre", () => {
  it("gives the whole shop to direction and to preparation, even when counters are attached", () => {
    expect(readingPerimetre({ roles: ["direction"], comptoirs: ["Akwa"] })).toBeNull()
    expect(readingPerimetre({ roles: ["preparation"], comptoirs: ["Akwa"] })).toBeNull()
  })

  /** La préparation lit tout mais ne touche pas l'argent : sur l'argent, elle est bornée. */
  it("keeps only direction out of the money perimeter", () => {
    expect(moneyPerimetre({ roles: ["direction"], comptoirs: ["Akwa"] })).toBeNull()
    expect(moneyPerimetre({ roles: ["preparation"], comptoirs: ["Akwa"] })).toEqual(["Akwa"])
    expect(moneyPerimetre({ roles: ["comptoir"], comptoirs: ["Akwa"] })).toEqual(["Akwa"])
  })

  it("reads an empty list as the whole shop, which is what everyone carries on day one", () => {
    expect(readingPerimetre({ roles: ["comptoir"], comptoirs: [] })).toBeNull()
    expect(moneyPerimetre({ roles: ["livreur"] })).toBeNull()
    expect(moneyPerimetre(null)).toBeNull()
  })
})

describe("selectableComptoirs", () => {
  /** Demander le comptoir d'un autre vaut un 403 sur toute la liste, pas une liste plus courte. */
  it("offers only the counters the member could ask the backend for", () => {
    expect(selectableComptoirs(COMPTOIRS, ["Akwa"]).map(comptoir => comptoir.cle)).toEqual(["Akwa"])
  })

  it("offers every counter to whoever has the whole shop", () => {
    expect(selectableComptoirs(COMPTOIRS, null)).toHaveLength(COMPTOIRS.length)
  })
})
