import type { LigneResultatImport } from "../../app/types/api/stock-import"
import { describe, expect, it } from "vitest"
import { buildStockImportErrorCsv, buildStockImportTemplate } from "../../app/utils/stock-import-files"

function line(overrides: Partial<LigneResultatImport> = {}): LigneResultatImport {
  return {
    ligne: 2,
    produit_saisi: "router",
    quantite_saisie: "3",
    motif_saisi: "Livraison",
    produit_id: null,
    produit_nom: null,
    variation: null,
    stock_avant: null,
    stock_apres: null,
    statut: "echec",
    code_erreur: "stock_insuffisant",
    message: "Stock insuffisant",
    raison_ignore: null,
    stock_fichier: null,
    stock_modifie: false,
    ...overrides,
  }
}
const CSV_FIELD = /("(?:[^"]|"")*"|[^",\r]*)(,|\r\n)/g
const unquote = (raw: string) => (raw.startsWith('"') ? raw.slice(1, -1).replaceAll('""', '"') : raw)

/** Minimal RFC 4180 reader, just enough to inspect the generated file. */
function parse(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, "").replace(/(\r\n)?$/, "\r\n")
  const rows: string[][] = [[]]
  for (const [, raw, separator] of text.matchAll(CSV_FIELD)) {
    rows.at(-1)!.push(unquote(raw!))
    if (separator === "\r\n") rows.push([])
  }
  return rows.slice(0, -1)
}
describe("stock import error file", () => {
  it("contains only failed rows, built from the raw input echoed by the backend", () => {
    const csv = buildStockImportErrorCsv([
      line({ ligne: 2, statut: "applique", produit_saisi: "ok", code_erreur: null, message: null }),
      line({ ligne: 3, statut: "ignore", produit_saisi: "same", code_erreur: null, message: null }),
      line({ ligne: 4, produit_saisi: "failed", quantite_saisie: "7", motif_saisi: "Quai nord" }),
    ])
    expect(csv.startsWith("﻿")).toBe(true)
    expect(parse(csv)).toEqual([
      ["product", "quantity", "reason", "error"],
      ["failed", "7", "Quai nord", "Stock insuffisant"],
    ])
  })
  it("includes a stock_reference_invalide failure and excludes rows skipped for drift or a blank quantity", () => {
    const skipped = { code_erreur: null, message: null, statut: "ignore" as const }
    const csv = buildStockImportErrorCsv([
      line({ ligne: 2, ...skipped, produit_saisi: "drift", raison_ignore: "stock_modifie", stock_modifie: true }),
      line({ ligne: 3, ...skipped, produit_saisi: "blank", quantite_saisie: "", raison_ignore: "quantite_vide" }),
      line({ ligne: 4, produit_saisi: "bad", code_erreur: "stock_reference_invalide", message: "Référence invalide" }),
    ])
    expect(parse(csv)).toEqual([
      ["product", "quantity", "reason", "error"],
      ["bad", "3", "Livraison", "Référence invalide"],
    ])
  })
  it("writes empty cells for a missing reason and message", () => {
    expect(parse(buildStockImportErrorCsv([line({ motif_saisi: null, message: null })]))[1]).toEqual([
      "router",
      "3",
      "",
      "",
    ])
  })
  it("returns only the header when nothing failed", () => {
    expect(parse(buildStockImportErrorCsv([line({ statut: "applique", code_erreur: null, message: null })]))).toEqual([
      ["product", "quantity", "reason", "error"],
    ])
  })
  it.each(['=HYPERLINK("https://evil.example")', "+cmd", "-cmd", "@SUM(A1)", "\tcmd", "\rcmd"])(
    "neutralises spreadsheet formula prefix %j in every cell",
    value => {
      const row = parse(
        buildStockImportErrorCsv([
          line({ produit_saisi: value, quantite_saisie: value, motif_saisi: value, message: value }),
        ]),
      )[1]
      expect(row).toEqual([`'${value}`, `'${value}`, `'${value}`, `'${value}`])
    },
  )
  it("preserves accents, quotes, commas and newlines", () => {
    const message = 'Arrivée "nord", quai\nContrôle'
    expect(parse(buildStockImportErrorCsv([line({ message })]))[1]?.[3]).toBe(message)
  })
})
describe("stock import template", () => {
  it.each(["reception", "count"] as const)("provides a BOM-prefixed %s template with one usable example", mode => {
    const csv = buildStockImportTemplate(mode)
    expect(csv.startsWith("﻿")).toBe(true)
    const grid = parse(csv)
    expect(grid).toHaveLength(2)
    expect(grid[0]).toEqual(["product", "quantity", "reason"])
    expect(grid[1]?.[0]).not.toBe("")
    expect(Number.isInteger(Number(grid[1]?.[1]))).toBe(true)
    expect(Number(grid[1]?.[1])).toBeGreaterThanOrEqual(mode === "reception" ? 1 : 0)
  })
})
