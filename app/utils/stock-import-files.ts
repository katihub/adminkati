import type { LigneResultatImport } from "@/types/api/stock-import"
import type { StockImportMode } from "@/types/stock-import"
import { downloadBlob } from "./download-file"

export const STOCK_IMPORT_MAX_ROWS = 2000
export const STOCK_IMPORT_MAX_BYTES = 5 * 1024 * 1024

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[,"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}
function csvFile(grid: string[][]): string {
  return "﻿" + grid.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n"
}
export function buildStockImportTemplate(mode: StockImportMode): string {
  return csvFile([
    ["product", "quantity", "reason"],
    ["product-slug", mode === "count" ? "0" : "12", ""],
  ])
}
export function buildStockImportErrorCsv(lignes: LigneResultatImport[]): string {
  return csvFile([
    ["product", "quantity", "reason", "error"],
    ...lignes
      .filter(ligne => ligne.statut === "echec")
      .map(ligne => [ligne.produit_saisi, ligne.quantite_saisie, ligne.motif_saisi ?? "", ligne.message ?? ""]),
  ])
}
export function downloadStockImportFile(content: string, filename: string): void {
  downloadBlob(new Blob([content], { type: "text/csv;charset=utf-8" }), filename)
}
