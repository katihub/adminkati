import { describe, expect, it } from "vitest"
import { formatProposalValue } from "../../app/utils/proposal-values"

const context = {
  categories: new Map([[17, "Computers"]]),
  emptyLabel: "—",
  locale: "en-US",
  noLabel: "No",
  yesLabel: "Yes",
}

describe("proposal value formatting", () => {
  it("formats catalogue-specific values without losing their meaning", () => {
    expect(formatProposalValue("prix", 125_000, context)).toContain("FCFA")
    expect(formatProposalValue("remise_pct", 12.5, context)).toBe("12.5%")
    expect(formatProposalValue("en_stock", true, context)).toBe("Yes")
    expect(formatProposalValue("categorie_principale_id", 17, context)).toBe("Computers")
    expect(formatProposalValue("caracteristiques", ["Wi-Fi", "5G"], context)).toBe("Wi-Fi, 5G")
  })

  it("uses the empty label for null, undefined, and empty values", () => {
    expect(formatProposalValue("nom", null, context)).toBe("—")
    expect(formatProposalValue("nom", undefined, context)).toBe("—")
    expect(formatProposalValue("nom", "", context)).toBe("—")
  })
})
