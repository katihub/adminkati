import { describe, expect, it } from "vitest"
import { slugify } from "../../app/utils/slug"

describe("slugify", () => {
  it("lowercases and hyphenates a plain product name", () => {
    expect(slugify("Casque Bluetooth Pro")).toBe("casque-bluetooth-pro")
  })

  it("strips accents to their base letter", () => {
    expect(slugify("Écran 4K Ultra-Léger")).toBe("ecran-4k-ultra-leger")
  })

  it("collapses runs of punctuation and whitespace into a single hyphen", () => {
    expect(slugify("Câble  USB-C, 2m!")).toBe("cable-usb-c-2m")
  })

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Produit-- ")).toBe("produit")
  })

  it("returns an empty string for input with no sluggable characters", () => {
    expect(slugify("!!!")).toBe("")
    expect(slugify("")).toBe("")
  })

  it("never leaks path or markup characters into the slug", () => {
    const result = slugify("../../etc/passwd <script>alert(1)</script>")
    expect(result).not.toContain("/")
    expect(result).not.toContain("<")
    expect(result).not.toContain(">")
    expect(result).not.toContain("..")
  })
})
