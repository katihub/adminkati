import type { ProductListQuery, Taxonomie } from "../../app/types/api/produits"
import { describe, expect, it } from "vitest"
import {
  describeExportFilters,
  exportVolume,
  filenameFromDisposition,
  stockExportUrl,
} from "../../app/utils/stock-export"

const BASE = "/api/v1/catalogue/administration/produits/inventaire/export"

function paramsOf(url: string): URLSearchParams {
  expect(url.startsWith(`${BASE}?`)).toBe(true)
  return new URLSearchParams(url.slice(BASE.length + 1))
}

const taxonomy = {
  rayons: [{ id: "r-info", slug: "informatique", nom: "Informatique", nom_court: "Info", compte_total: 4 }],
  categories: [
    { id: 0, nom: "Divers", slug: "divers", parent_id: null, niveau: 0, rayon: null, compte_total: 1, masquee: false },
    {
      id: 7,
      nom: "Câbles",
      slug: "cables",
      parent_id: null,
      niveau: 0,
      rayon: "r-info",
      compte_total: 3,
      masquee: false,
    },
  ],
  marques: [],
} as Taxonomie

describe("stockExportUrl", () => {
  it("targets the inventory export endpoint with the filters, mode and format in a fixed order", () => {
    const url = stockExportUrl(
      { q: "routeur", rayon: "r-info", categorie: 7, marque: "Cisco", stock: "rupture", etat: "actifs", tri: "nom" },
      "count",
      "xlsx",
    )
    expect(url).toBe(
      `${BASE}?q=routeur&rayon=r-info&categorie=7&marque=Cisco&stock=rupture&etat=actifs&tri=nom&mode=count&format=xlsx`,
    )
  })

  it("never sends page or taille, which the backend rejects with a 400", () => {
    const params = paramsOf(stockExportUrl({ q: "x", page: 3, taille: 50 }, "reception", "csv"))
    expect(params.has("page")).toBe(false)
    expect(params.has("taille")).toBe(false)
    expect(Object.fromEntries(params)).toEqual({ q: "x", mode: "reception", format: "csv" })
  })

  it("drops undefined and empty-string values", () => {
    const params = paramsOf(stockExportUrl({ q: "", rayon: undefined, marque: "" }, "count", "csv"))
    expect(Object.fromEntries(params)).toEqual({ mode: "count", format: "csv" })
  })

  it("keeps category 0, a real id", () => {
    expect(paramsOf(stockExportUrl({ categorie: 0 }, "count", "csv")).get("categorie")).toBe("0")
  })

  it("round-trips a search term with spaces, accents, ampersand and comma", () => {
    const params = paramsOf(stockExportUrl({ q: "câble & usb 2,0" }, "count", "csv"))
    expect(params.get("q")).toBe("câble & usb 2,0")
  })

  it("cannot be made to inject a parameter through a hostile search term", () => {
    const params = paramsOf(stockExportUrl({ q: "a&mode=count" }, "reception", "csv"))
    expect(params.getAll("mode")).toEqual(["reception"])
    expect(params.get("q")).toBe("a&mode=count")
  })

  it("ignores unknown keys, which the backend rejects with a 400", () => {
    const filters = { q: "x", admin: "1", __proto__: { evil: "1" }, extra: 5 } as unknown as ProductListQuery
    expect(Object.fromEntries(paramsOf(stockExportUrl(filters, "count", "csv")))).toEqual({
      q: "x",
      mode: "count",
      format: "csv",
    })
  })

  it("carries every list filter and nothing else (parity with the list query)", () => {
    const full: Required<ProductListQuery> = {
      q: "câble",
      rayon: "r-info",
      categorie: 7,
      marque: "Cisco",
      stock: "en-stock",
      etat: "retires",
      tri: "prix-decroissant",
      page: 4,
      taille: 25,
    }
    const { page: _page, taille: _taille, ...listFilters } = full
    const sent = Object.fromEntries(paramsOf(stockExportUrl(full, "reception", "xlsx")))
    expect(sent).toEqual(
      Object.fromEntries(
        Object.entries({ ...listFilters, mode: "reception", format: "xlsx" }).map(([k, v]) => [k, String(v)]),
      ),
    )
  })
})

describe("filenameFromDisposition", () => {
  const fallback = "stock-count.xlsx"

  it("reads a quoted filename", () => {
    expect(filenameFromDisposition('attachment; filename="stock-count-2026-10-01-1430.xlsx"', fallback)).toBe(
      "stock-count-2026-10-01-1430.xlsx",
    )
  })

  it("reads an unquoted filename", () => {
    expect(filenameFromDisposition("attachment; filename=stock-reception.csv", fallback)).toBe("stock-reception.csv")
  })

  it("percent-decodes filename* and prefers it over filename", () => {
    expect(
      filenameFromDisposition(`attachment; filename="fallback.csv"; filename*=UTF-8''stock%20caf%C3%A9.csv`, fallback),
    ).toBe("stock café.csv")
  })

  it.each([null, undefined, "", "attachment", "inline; name=x"])("falls back when the header is %j", header => {
    expect(filenameFromDisposition(header, fallback)).toBe(fallback)
  })

  it("keeps only the basename of a path-traversal filename", () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"', fallback)).toBe("passwd")
  })

  it("handles backslash separators too", () => {
    expect(filenameFromDisposition('attachment; filename="..\\..\\win\\evil.csv"', fallback)).toBe("evil.csv")
  })

  it("falls back when nothing safe remains", () => {
    expect(filenameFromDisposition('attachment; filename=".."', fallback)).toBe(fallback)
    expect(filenameFromDisposition('attachment; filename="a/"', fallback)).toBe(fallback)
    expect(filenameFromDisposition('attachment; filename=""', fallback)).toBe(fallback)
  })

  it("does not let a percent-encoded traversal in filename* through", () => {
    const name = filenameFromDisposition("attachment; filename*=UTF-8''..%2F..%2Fetc%2Fpasswd", fallback)
    expect(name).toBe("passwd")
  })
})

describe("exportVolume", () => {
  it.each([
    [null, "unknown"],
    [undefined, "unknown"],
    [0, "empty"],
    [1, "normal"],
    [2000, "normal"],
    [2001, "split"],
    [10000, "split"],
    [10001, "blocked"],
  ] as const)("classifies %j products as %s", (total, expected) => {
    expect(exportVolume(total)).toBe(expected)
  })
})

describe("describeExportFilters", () => {
  it("is empty for no filters, and ignores sort, page and size", () => {
    expect(describeExportFilters({}, undefined)).toEqual([])
    expect(describeExportFilters({ tri: "nom", page: 2, taille: 50 }, taxonomy)).toEqual([])
  })

  it("describes the search term verbatim", () => {
    expect(describeExportFilters({ q: "câble" }, taxonomy)).toEqual([
      expect.objectContaining({ labelKey: "products.filterBar.searchLabel", value: "câble" }),
    ])
  })

  it("names the rayon, category and brand using the taxonomy", () => {
    const entries = describeExportFilters({ rayon: "r-info", categorie: 7, marque: "Cisco" }, taxonomy)
    expect(entries.map(({ labelKey, value }) => [labelKey, value])).toEqual([
      ["products.filterBar.rayonLabel", "Informatique"],
      ["products.filterBar.categoryLabel", "Câbles"],
      ["products.filterBar.brandLabel", "Cisco"],
    ])
  })

  it("falls back to the raw value when the taxonomy is missing or does not know the id", () => {
    expect(describeExportFilters({ rayon: "r-x", categorie: 99 }, undefined).map(entry => entry.value)).toEqual([
      "r-x",
      "99",
    ])
    expect(describeExportFilters({ rayon: "r-x", categorie: 99 }, taxonomy).map(entry => entry.value)).toEqual([
      "r-x",
      "99",
    ])
  })

  it("keeps category 0 as a filter", () => {
    expect(describeExportFilters({ categorie: 0 }, taxonomy).map(entry => entry.value)).toEqual(["Divers"])
  })

  it.each([
    ["en-stock", "products.quickFilters.inStock"],
    ["rupture", "products.quickFilters.outOfStock"],
    ["reapprovisionnement", "products.quickFilters.restocking"],
  ] as const)("translates stock %s through a value key", (stock, valueKey) => {
    expect(describeExportFilters({ stock }, taxonomy)).toEqual([
      expect.objectContaining({ labelKey: "products.stockExport.filters.stock", valueKey }),
    ])
  })

  it("treats stock tous and undefined as no filter", () => {
    expect(describeExportFilters({ stock: "tous" }, taxonomy)).toEqual([])
    expect(describeExportFilters({ stock: undefined }, taxonomy)).toEqual([])
  })

  it("describes the withdrawn and active states, and omits tous", () => {
    expect(describeExportFilters({ etat: "retires" }, taxonomy)).toEqual([
      expect.objectContaining({
        labelKey: "products.stockExport.filters.state",
        valueKey: "products.quickFilters.withdrawn",
      }),
    ])
    expect(describeExportFilters({ etat: "actifs" }, taxonomy)).toEqual([
      expect.objectContaining({
        labelKey: "products.stockExport.filters.state",
        valueKey: "products.stockExport.filters.stateActive",
      }),
    ])
    expect(describeExportFilters({ etat: "tous" }, taxonomy)).toEqual([])
  })

  it("lists entries in a fixed order with unique keys, each with exactly one of value or valueKey", () => {
    const entries = describeExportFilters(
      { etat: "actifs", stock: "rupture", marque: "Cisco", categorie: 7, rayon: "r-info", q: "x" },
      taxonomy,
    )
    expect(entries.map(entry => entry.labelKey)).toEqual([
      "products.filterBar.searchLabel",
      "products.filterBar.rayonLabel",
      "products.filterBar.categoryLabel",
      "products.filterBar.brandLabel",
      "products.stockExport.filters.stock",
      "products.stockExport.filters.state",
    ])
    expect(new Set(entries.map(entry => entry.key)).size).toBe(entries.length)
    for (const entry of entries)
      expect(Number(entry.value !== undefined) + Number(entry.valueKey !== undefined)).toBe(1)
  })
})
