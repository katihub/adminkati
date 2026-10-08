import { describe, expect, it } from "vitest"
import { buildProxyTarget } from "../../server/utils/proxy-target"

describe("buildProxyTarget", () => {
  it("composes the target from base URL and path", () => {
    const target = buildProxyTarget("https://api.example.com", "clients")

    expect(target).toBe("https://api.example.com/v1/clients")
  })

  it("keeps the query string, which carries every list filter and page number", () => {
    const target = buildProxyTarget(
      "https://api.example.com",
      "catalogue/administration/produits",
      "?stock=rupture&etat=actifs&page=2",
    )

    expect(target).toBe("https://api.example.com/v1/catalogue/administration/produits?stock=rupture&etat=actifs&page=2")
  })
})
