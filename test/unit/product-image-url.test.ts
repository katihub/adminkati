import { describe, expect, it } from "vitest"
import { productImageUrl } from "../../app/utils/product-image-url"

describe("product image URLs", () => {
  it("resolves a relative API image path against the configured image origin", () => {
    expect(productImageUrl("/allege/2026/08/routeur.webp", "https://images.example")).toBe(
      "https://images.example/allege/2026/08/routeur.webp",
    )
  })

  it("preserves an absolute migrated storage URL", () => {
    const url = "https://storage.example/storage/v1/object/public/produits/60168/photo.webp"

    expect(productImageUrl(url, "https://images.example")).toBe(url)
  })

  it("does not invent a host when no image origin is configured", () => {
    expect(productImageUrl("/allege/2026/08/routeur.webp")).toBe("/allege/2026/08/routeur.webp")
  })
})
