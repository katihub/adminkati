import type { ProductImportRow } from "@/types/api/product-import"
import { downloadBlob } from "./download-file"

export const PRODUCT_IMPORT_MAX_ROWS = 500
export const PRODUCT_IMPORT_MAX_BYTES = 5 * 1024 * 1024

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[,"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

function csvFile(grid: string[][]): string {
  return "\ufeff" + grid.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n"
}

export function buildProductImportTemplate(): string {
  return csvFile([
    [
      "nom",
      "prix",
      "slug",
      "prix_reference",
      "marque",
      "categorie_id",
      "quantite_stock",
      "description",
      "fiche_technique",
      "caracteristiques",
      "image_url",
      "image_alt",
    ],
    [
      "Ordinateur portable",
      "450000",
      "ordinateur-portable",
      "500000",
      "Exemple",
      "",
      "5",
      "Description du produit",
      "Intel Core i5, 16 Go RAM",
      "16 Go RAM|512 Go SSD|Écran 15 pouces",
      "https://example.com/produit.jpg",
      "Ordinateur portable vu de face",
    ],
  ])
}

export function buildProductImportErrorCsv(rows: ProductImportRow[]): string {
  return csvFile([
    ["ligne", "nom", "prix", "slug", "categorie_id", "erreur"],
    ...rows
      .filter(row => row.statut === "echec")
      .map(row => [
        String(row.ligne),
        row.nom,
        row.prix_saisi,
        row.slug ?? "",
        row.categorie_id == null ? "" : String(row.categorie_id),
        row.message ?? "",
      ]),
  ])
}

export function downloadProductImportFile(content: string, filename: string): void {
  downloadBlob(new Blob([content], { type: "text/csv;charset=utf-8" }), filename)
}
