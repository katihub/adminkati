import { describe, expect, it } from "vitest"
import { bannerEmplacement, storedMobileDimensions, validateBannerArtwork } from "../../app/utils/banner-artwork"

const landscapeLarge = { width: 1600, height: 600 }
const narrowerMobile = { width: 800, height: 900 }
const portraitLarge = { width: 600, height: 1600 }

describe("validateBannerArtwork", () => {
  it("flags a portrait large artwork as not landscape in the main carousel", () => {
    expect(validateBannerArtwork("principal", portraitLarge, null)).toEqual(["largeNotLandscape"])
  })

  it("flags a square large artwork as not landscape, since the backend rule is width <= height", () => {
    const squareLarge = { width: 800, height: 800 }

    expect(validateBannerArtwork("principal", squareLarge, null)).toEqual(["largeNotLandscape"])
  })

  it("accepts a square or portrait artwork in promo, which takes any format", () => {
    expect(validateBannerArtwork("promo", portraitLarge, null)).toEqual([])
    expect(validateBannerArtwork("promo", { width: 800, height: 800 }, null)).toEqual([])
  })

  it("flags a mobile artwork exactly as wide as the large one, since the backend rule is width >= large.width", () => {
    const equalWidthMobile = { width: landscapeLarge.width, height: 900 }

    expect(validateBannerArtwork("principal", landscapeLarge, equalWidthMobile)).toEqual(["mobileNotNarrower"])
  })

  it("flags a mobile artwork wider than the large one in promo too", () => {
    expect(validateBannerArtwork("promo", portraitLarge, { width: 700, height: 900 })).toEqual(["mobileNotNarrower"])
  })

  it("returns no issues for a fully valid pair", () => {
    expect(validateBannerArtwork("principal", landscapeLarge, narrowerMobile)).toEqual([])
  })

  it("returns no issues when both sides are null", () => {
    expect(validateBannerArtwork("principal", null, null)).toEqual([])
  })

  it("returns no issues for a valid large artwork without a mobile one, which is optional", () => {
    expect(validateBannerArtwork("principal", landscapeLarge, null)).toEqual([])
  })

  it("returns no issues for a null large artwork paired with a valid mobile", () => {
    expect(validateBannerArtwork("principal", null, narrowerMobile)).toEqual([])
  })

  it("returns both issues when the large artwork is portrait and the mobile is not narrower than it", () => {
    const notNarrowerMobile = { width: 700, height: 900 }

    const issues = validateBannerArtwork("principal", portraitLarge, notNarrowerMobile)

    expect(issues).toContain("largeNotLandscape")
    expect(issues).toContain("mobileNotNarrower")
    expect(issues).toHaveLength(2)
  })
})

describe("storedMobileDimensions", () => {
  it("reads the stored phone artwork size", () => {
    expect(storedMobileDimensions({ largeur_mobile: 1920, hauteur_mobile: 625 })).toEqual({ width: 1920, height: 625 })
  })

  it("returns null for a banner without a phone artwork, whose mobile columns are null together", () => {
    expect(storedMobileDimensions({ largeur_mobile: null, hauteur_mobile: null })).toBeNull()
  })
})

describe("bannerEmplacement", () => {
  it("keeps promo, and reads anything else as the main carousel, the backend's default", () => {
    expect(bannerEmplacement({ emplacement: "promo" })).toBe("promo")
    expect(bannerEmplacement({ emplacement: "principal" })).toBe("principal")
    expect(bannerEmplacement({} as never)).toBe("principal")
  })
})
