import { describe, expect, it } from "vitest"
import {
  buildProductImportErrorCsv,
  buildProductImportTemplate,
  PRODUCT_IMPORT_MAX_BYTES,
  PRODUCT_IMPORT_MAX_ROWS,
} from "../../app/utils/product-import-files"

describe("product import files", () => {
  it("builds an Excel-friendly UTF-8 template with the documented columns", () => {
    const csv = buildProductImportTemplate()
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain(
      "nom,prix,slug,prix_reference,marque,categorie_id,quantite_stock,description,fiche_technique,caracteristiques,image_url,image_alt",
    )
    expect(csv).toContain("Ordinateur portable")
  })

  it("protects spreadsheet cells in the downloadable error report", () => {
    const csv = buildProductImportErrorCsv([
      {
        ligne: 2,
        nom: '=HYPERLINK("bad")',
        prix_saisi: "150000",
        slug: "ordinateur",
        categorie_id: 4,
        statut: "echec",
        produit_id: null,
        code_erreur: "ligne_invalide",
        message: "Prix invalide",
      },
    ])
    expect(csv).toContain("'=HYPERLINK")
    expect(csv).toContain("Prix invalide")
  })

  it("shares the backend file and row limits", () => {
    expect(PRODUCT_IMPORT_MAX_BYTES).toBe(5 * 1024 * 1024)
    expect(PRODUCT_IMPORT_MAX_ROWS).toBe(500)
  })
})
