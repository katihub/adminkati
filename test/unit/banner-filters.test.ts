import type { BanniereAdmin } from "../../app/types/api/vitrine"
import { describe, expect, it } from "vitest"
import { filterBanners } from "../../app/utils/banner-filters"

function makeBanner(overrides: Partial<BanniereAdmin> = {}): BanniereAdmin {
  return {
    id: 1,
    emplacement: "principal",
    ordre: 1,
    active: true,
    fichier_large: "bannieres/large-1.jpg",
    largeur_large: 1600,
    hauteur_large: 600,
    fichier_mobile: "bannieres/mobile-1.jpg",
    largeur_mobile: 800,
    hauteur_mobile: 900,
    href: "/categorie/promo",
    libelle: "Banniere",
    alt: "Alt",
    focus: 50,
    creee_le: "2026-08-01T00:00:00.000Z",
    modifiee_le: "2026-08-15T00:00:00.000Z",
    modifiee_par: null,
    url_large: "https://cdn.example.com/branding/bannieres/large-1.jpg",
    url_mobile: "https://cdn.example.com/branding/bannieres/mobile-1.jpg",
    ...overrides,
  }
}

const PROMO_RENTREE = makeBanner({ id: 1, active: true, libelle: "Promo rentrée" })
const SOLDES_ETE = makeBanner({ id: 2, active: false, libelle: "Soldes d'été" })
const NOUVEAUTES = makeBanner({ id: 3, active: true, libelle: "Nouveautés" })
const PROMO_HIVER = makeBanner({ id: 4, active: false, libelle: "Promo hiver" })

const BANNERS = [PROMO_RENTREE, SOLDES_ETE, NOUVEAUTES, PROMO_HIVER]

describe("filterBanners", () => {
  it("returns every banner when the status is 'all' and the search is empty", () => {
    expect(filterBanners(BANNERS, { status: "all", search: "" })).toEqual(BANNERS)
  })

  it("keeps only active banners when the status is 'active'", () => {
    expect(filterBanners(BANNERS, { status: "active", search: "" })).toEqual([PROMO_RENTREE, NOUVEAUTES])
  })

  it("keeps only inactive banners when the status is 'inactive'", () => {
    expect(filterBanners(BANNERS, { status: "inactive", search: "" })).toEqual([SOLDES_ETE, PROMO_HIVER])
  })

  it("matches the search term as a case-insensitive substring of the label", () => {
    expect(filterBanners(BANNERS, { status: "all", search: "promo" })).toEqual([PROMO_RENTREE, PROMO_HIVER])
  })

  it("treats a whitespace-only search the same as no search at all", () => {
    expect(filterBanners(BANNERS, { status: "all", search: "   " })).toEqual(BANNERS)
  })

  it("returns an empty list when the search matches no banner", () => {
    expect(filterBanners(BANNERS, { status: "all", search: "no such banner" })).toEqual([])
  })

  it("combines status and search as an AND, not an OR", () => {
    expect(filterBanners(BANNERS, { status: "active", search: "promo" })).toEqual([PROMO_RENTREE])
  })
})
