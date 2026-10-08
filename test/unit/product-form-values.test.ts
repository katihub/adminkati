import type { ProductDetail } from "../../app/types/api/produits"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  deriveCategoryValues,
  deriveDeliveryValues,
  deriveDescriptionValues,
  deriveListValues,
  deriveNumericValues,
  derivePromoValues,
  deriveScalarValues,
} from "../../app/utils/product-form-values"

type Fixture = Pick<
  ProductDetail,
  | "nom"
  | "marque"
  | "url_source"
  | "description"
  | "fiche_technique"
  | "delai_livraison_id"
  | "categorie_principale_id"
  | "categories"
  | "caracteristiques"
  | "images"
  | "promo_debut"
  | "promo_fin"
  | "prix"
  | "prix_reference"
  | "remise_pct"
>

function product(overrides: Partial<Fixture> = {}): Fixture {
  return {
    nom: "Routeur",
    marque: "Acme",
    url_source: "https://example.com/p",
    description: "Desc",
    fiche_technique: "Spec",
    delai_livraison_id: 4,
    categorie_principale_id: 10,
    categories: [{ id: 10 }, { id: 11 }, { id: 12 }],
    caracteristiques: [{ nom: "Ports", valeur: "4" }],
    images: [{ rang: 1, url: "u", chemin_local: null, octets: 1, alt: null }],
    promo_debut: null,
    promo_fin: null,
    prix: 1500,
    prix_reference: 2000,
    remise_pct: 25,
    ...overrides,
  } as Fixture
}

afterEach(() => vi.useRealTimers())

describe("product form values", () => {
  it("reads scalars from an existing product, keeping a missing brand null", () => {
    expect(deriveScalarValues(product())).toEqual({
      nom: "Routeur",
      marque: "Acme",
      url_source: "https://example.com/p",
    })
    expect(deriveScalarValues(product({ marque: null, url_source: null })).marque).toBeNull()
    expect(deriveScalarValues(product({ url_source: null })).url_source).toBe("")
  })

  it("reads the description fields, turning absent ones into empty strings", () => {
    expect(deriveDescriptionValues(product())).toEqual({ description: "Desc", fiche_technique: "Spec" })
    expect(deriveDescriptionValues(product({ description: null, fiche_technique: null }))).toEqual({
      description: "",
      fiche_technique: "",
    })
  })

  it("keeps a product on the inherited default as null and a chosen one as its id", () => {
    expect(deriveDeliveryValues(product({ delai_livraison_id: null }))).toEqual({ delai_livraison_id: null })
    expect(deriveDeliveryValues(product({ delai_livraison_id: undefined }))).toEqual({ delai_livraison_id: null })
    expect(deriveDeliveryValues(product())).toEqual({ delai_livraison_id: 4 })
  })

  it("lists only the secondary categories next to the principal one", () => {
    expect(deriveCategoryValues(product())).toEqual({ categorie_principale_id: 10, categories_ids: [11, 12] })
    expect(deriveCategoryValues(null)).toEqual({ categorie_principale_id: null, categories_ids: [] })
  })

  it("copies the lists so editing the form never mutates the loaded product", () => {
    const loaded = product()
    const values = deriveListValues(loaded)
    expect(values.caracteristiques).toEqual(loaded.caracteristiques)
    expect(values.caracteristiques).not.toBe(loaded.caracteristiques)
    expect(values.images).not.toBe(loaded.images)
    expect(deriveListValues(null)).toEqual({ caracteristiques: [], images: [] })
  })

  it("renders the promo window as local calendar dates for the input fields", () => {
    const debut = new Date(2026, 8, 30, 8).toISOString()
    const fin = new Date(2026, 9, 5, 20).toISOString()
    expect(derivePromoValues(product({ promo_debut: debut, promo_fin: fin }))).toEqual({
      debut: "2026-09-30",
      fin: "2026-10-05",
    })
  })

  it("leaves the promo fields empty when absent or unparsable", () => {
    expect(derivePromoValues(null)).toEqual({ debut: "", fin: "" })
    expect(derivePromoValues(product({ promo_debut: "not a date", promo_fin: null }))).toEqual({ debut: "", fin: "" })
  })

  it("stringifies prices for the inputs and keeps zero as a value", () => {
    expect(deriveNumericValues(product())).toEqual({ prix: "1500", prix_reference: "2000", remise_pct: "25" })
    expect(deriveNumericValues(product({ prix_reference: 0, remise_pct: 0 }))).toEqual({
      prix: "1500",
      prix_reference: "0",
      remise_pct: "0",
    })
  })

  it("leaves absent reference price and discount empty, and everything empty when adding", () => {
    expect(deriveNumericValues(product({ prix_reference: null, remise_pct: null }))).toEqual({
      prix: "1500",
      prix_reference: "",
      remise_pct: "",
    })
    expect(deriveNumericValues(null)).toEqual({ prix: "", prix_reference: "", remise_pct: "" })
  })
})
