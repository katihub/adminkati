import { describe, expect, it } from "vitest"
import { orderExportFilename, orderExportUrl } from "../../app/utils/order-export"

describe("order export URL", () => {
  it("builds the BFF export URL for a reference, document, and locale", () => {
    expect(orderExportUrl("NT-000042", "recapitulatif", "fr")).toBe(
      "/api/v1/commandes/NT-000042/export?document=recapitulatif&locale=fr",
    )
  })

  it("encodes a reference that would otherwise break the path", () => {
    const url = orderExportUrl("NT/000 42", "facture", "en")

    expect(url).toContain("/api/v1/commandes/NT%2F000%2042/export")
    expect(url).toContain("document=facture")
    expect(url).toContain("locale=en")
  })

  it("names the download after the reference, document, and locale", () => {
    expect(orderExportFilename("NT-000042", "bon-preparation", "fr")).toBe("NT-000042-bon-preparation-fr.pdf")
  })
})
