import { describe, expect, it } from "vitest"
import { auditQuery, auditReason, humanizeAction } from "../../app/utils/audit"

describe("audit", () => {
  it("keeps only the filters that hold a value", () => {
    expect(auditQuery({ du: "2026-11-01", q: "  ", cible: " CMD-1 ", categorie: undefined })).toEqual({
      du: "2026-11-01",
      cible: "CMD-1",
    })
  })

  it("reads an unknown action code", () => {
    expect(humanizeAction("marketplace.retrait.payout_soumis")).toBe("Retrait · payout soumis")
    expect(humanizeAction("stock.statut_modifie")).toBe("Stock · statut modifie")
  })

  it("finds the reason in the detail", () => {
    expect(auditReason({ motif: "RIB illisible" })).toBe("RIB illisible")
    expect(auditReason({ motif: "" })).toBeNull()
    expect(auditReason(null)).toBeNull()
    expect(auditReason(["x"])).toBeNull()
  })
})
