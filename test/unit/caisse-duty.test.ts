import { describe, expect, it } from "vitest"
import {
  canCountCaisse,
  canValidateCaisse,
  countDisabledReason,
  needsNamedDiscrepancy,
  validateDisabledReason,
} from "../../app/utils/caisse-duty"

const PORTEUR = "membre-porteur"
const COUNTER = "membre-counter"
const THIRD = "membre-third"

describe("canCountCaisse", () => {
  it("refuses the porteur counting their own caisse", () => {
    expect(canCountCaisse({ porteurId: PORTEUR }, PORTEUR)).toBe(false)
  })

  it("allows anyone else to count it", () => {
    expect(canCountCaisse({ porteurId: PORTEUR }, COUNTER)).toBe(true)
  })
})

describe("countDisabledReason", () => {
  it("gives a reason when the porteur would be counting their own caisse", () => {
    expect(countDisabledReason({ porteurId: PORTEUR }, PORTEUR)).toBe("caisse.duty.cannotCountOwn")
  })

  it("gives no reason for anyone else", () => {
    expect(countDisabledReason({ porteurId: PORTEUR }, COUNTER)).toBeNull()
  })
})

describe("canValidateCaisse", () => {
  it("refuses the porteur validating their own caisse", () => {
    expect(canValidateCaisse({ porteurId: PORTEUR }, PORTEUR)).toBe(false)
  })

  /**
   * DEUX PAIRES D'YEUX, PAS TROIS. Un comptoir tenu par une personne plus la
   * direction n'en fait que deux : exiger un troisième arbitre laissait la
   * caisse du soir ouverte, faute de quelqu'un pour l'arrêter.
   */
  it("lets whoever counted it validate it, which is what closes a one-seller counter", () => {
    expect(canValidateCaisse({ porteurId: PORTEUR }, COUNTER)).toBe(true)
  })
})

describe("needsNamedDiscrepancy", () => {
  it("is true for a litige caisse with no named ecarts yet", () => {
    expect(needsNamedDiscrepancy({ statut: "litige", ecarts: [] })).toBe(true)
  })

  it("is false once at least one ecart is named", () => {
    expect(needsNamedDiscrepancy({ statut: "litige", ecarts: [{}] })).toBe(false)
  })

  it("is false for every other status, regardless of ecarts", () => {
    expect(needsNamedDiscrepancy({ statut: "ouverte", ecarts: [] })).toBe(false)
    expect(needsNamedDiscrepancy({ statut: "comptee", ecarts: [] })).toBe(false)
    expect(needsNamedDiscrepancy({ statut: "validee", ecarts: [] })).toBe(false)
  })
})

describe("validateDisabledReason", () => {
  it("names the one person who may not validate: whoever carried the money", () => {
    expect(validateDisabledReason({ porteurId: PORTEUR, statut: "comptee", ecarts: [] }, PORTEUR)).toBe(
      "caisse.duty.cannotValidateOwn",
    )
    expect(validateDisabledReason({ porteurId: PORTEUR, statut: "comptee", ecarts: [] }, COUNTER)).toBeNull()
  })

  it("leads with the missing-discrepancy reason even for an otherwise-qualified validator", () => {
    expect(validateDisabledReason({ porteurId: PORTEUR, statut: "litige", ecarts: [] }, THIRD)).toBe(
      "caisse.duty.needsDiscrepancyFirst",
    )
  })
})
