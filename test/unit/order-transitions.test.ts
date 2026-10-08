import { describe, expect, it } from "vitest"
import { eligibleTransitions } from "../../app/utils/order-transitions"

describe("order transition eligibility", () => {
  it("allows direction to perform every legal transition from a submitted order", () => {
    expect(eligibleTransitions("soumise", ["direction"])).toEqual(["confirmee", "refusee", "annulee"])
  })

  it("keeps direction-only cancellation hidden from comptoir", () => {
    expect(eligibleTransitions("soumise", ["comptoir"])).toEqual(["confirmee", "refusee"])
  })

  it("gives preparation only the operational transition it can perform", () => {
    expect(eligibleTransitions("confirmee", ["preparation"])).toEqual(["en_preparation"])
  })

  it("returns no actions for terminal orders", () => {
    expect(eligibleTransitions("close", ["direction", "comptoir", "preparation"])).toEqual([])
  })

  /**
   * CLORE REVIENT À QUI REMET. Le préparateur pose la commande sur l'étagère et
   * ne voit pas la remise : le motif de clôture — « retirée », « sans preuve » —
   * se choisissait donc à l'aveugle. Le backend le lui a retiré, et un bouton
   * qui répond 403 est pire qu'un bouton absent.
   */
  it("no longer offers the closure to preparation, which never hands the goods over", () => {
    expect(eligibleTransitions("prete_au_retrait", ["preparation"])).toEqual([])
  })

  it("leaves the closure to the counter, the courier and direction", () => {
    expect(eligibleTransitions("prete_au_retrait", ["comptoir"])).toContain("close")
    expect(eligibleTransitions("en_remise", ["livreur"])).toContain("close")
    expect(eligibleTransitions("prete_au_retrait", ["direction"])).toContain("close")
  })

  it("leaves preparation everything else it does", () => {
    expect(eligibleTransitions("en_preparation", ["preparation"])).toEqual(["prete_au_retrait"])
  })
})
