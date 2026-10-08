import { describe, expect, it } from "vitest"
import { storefrontProductUrl } from "../../app/utils/storefront"

describe("storefrontProductUrl", () => {
  it("encodes the slug so it cannot add a path segment, query or fragment", () => {
    expect(storefrontProductUrl("https://nowtech.newvcreatives.com/", "a/b?c=1#d")).toBe(
      "https://nowtech.newvcreatives.com/produit/a%2Fb%3Fc%3D1%23d",
    )
  })

  it("gives no link when the origin is blank or is not http(s)", () => {
    expect(storefrontProductUrl("", "casque")).toBeNull()
    expect(storefrontProductUrl("javascript:alert(1)", "casque")).toBeNull()
  })
})
