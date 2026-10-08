import { describe, expect, it } from "vitest"
import { imageValueUrl } from "../../app/utils/history-image-value"

describe("imageValueUrl", () => {
  it("returns the url for an http image value", () => {
    expect(imageValueUrl("image", "https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg")
  })

  it("recognises image urls by extension on any field, ignoring a query string", () => {
    expect(imageValueUrl("marque", "https://x.io/logo.PNG?v=2")).toBe("https://x.io/logo.PNG?v=2")
  })

  it("trusts image-like field names for extensionless urls", () => {
    expect(imageValueUrl("logo_url", "https://x.io/render/42")).toBe("https://x.io/render/42")
  })

  it("rejects non-image text, non-http schemes and non-strings", () => {
    expect(imageValueUrl("url_source", "https://shop.example.com/product/9")).toBeNull()
    expect(imageValueUrl("image", "javascript:alert(1)")).toBeNull()
    expect(imageValueUrl("image", "data:image/svg+xml,<svg onload=x>")).toBeNull()
    expect(imageValueUrl("image", 12)).toBeNull()
    expect(imageValueUrl("image", null)).toBeNull()
  })
})
