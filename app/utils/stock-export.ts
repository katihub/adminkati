import type { ProductListQuery, Taxonomie } from "@/types/api/produits"
import type { CodeErreurExport, FormatExportStock } from "@/types/api/stock-export"
import type { ModeImportStock } from "@/types/api/stock-import"
import { asRecord, getErrorData } from "./api-error"
import { STOCK_IMPORT_MAX_ROWS } from "./stock-import-files"

/** `EXPORT_MAX_LIGNES` in `src/catalogue/stock-export.dto.ts:13` in NowTech-backend-. */
export const STOCK_EXPORT_MAX_ROWS = 10_000

const EXPORT_PATH = "/api/v1/catalogue/administration/produits/inventaire/export"

// The only list filters the export DTO accepts, in wire order. Anything else, `page` and `taille`
// included, is a 400 (global ValidationPipe, whitelist + forbidNonWhitelisted).
const FILTER_KEYS = ["q", "rayon", "categorie", "marque", "stock", "etat", "tri"] as const

export function stockExportUrl(filters: ProductListQuery, mode: ModeImportStock, format: FormatExportStock): string {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = Object.hasOwn(filters, key) ? filters[key] : undefined
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  params.set("mode", mode)
  params.set("format", format)
  return `${EXPORT_PATH}?${params.toString()}`
}

function decodeExtended(value: string): string | null {
  const encoded = /^[^']*'[^']*'(.*)$/.exec(value)?.[1] ?? value
  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

/** Keeps the last path segment so a hostile header cannot steer the saved file out of the downloads folder. */
function safeBasename(name: string): string | null {
  const base = name.split(/[/\\]/).pop()?.trim() ?? ""
  return base === "" || base === "." || base === ".." ? null : base
}

export function filenameFromDisposition(header: string | null | undefined, fallback: string): string {
  if (!header) return fallback
  const extended = /filename\*\s*=\s*([^;]+)/i.exec(header)?.[1]?.trim()
  const plain = /(?:^|[;\s])filename\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(header)
  const raw = (extended ? decodeExtended(extended) : null) ?? plain?.[1] ?? plain?.[2]?.trim() ?? ""
  return safeBasename(raw) ?? fallback
}

export type ExportVolume = "unknown" | "empty" | "normal" | "split" | "blocked"

/** What the dialog should tell the operator about a known matching count. */
export function exportVolume(total: number | null | undefined): ExportVolume {
  if (total === null || total === undefined) return "unknown"
  if (total === 0) return "empty"
  if (total > STOCK_EXPORT_MAX_ROWS) return "blocked"
  return total > STOCK_IMPORT_MAX_ROWS ? "split" : "normal"
}

/** Exactly one of `value` (raw text) and `valueKey` (a translation key) is set. */
export interface ExportFilterEntry {
  key: string
  labelKey: string
  value?: string
  valueKey?: string
}

const STOCK_VALUE_KEYS = {
  "en-stock": "products.quickFilters.inStock",
  rupture: "products.quickFilters.outOfStock",
  reapprovisionnement: "products.quickFilters.restocking",
} as const
const STATE_VALUE_KEYS = {
  retires: "products.quickFilters.withdrawn",
  actifs: "products.stockExport.filters.stateActive",
} as const

export function describeExportFilters(filters: ProductListQuery, taxonomy: Taxonomie | undefined): ExportFilterEntry[] {
  const entries: ExportFilterEntry[] = []
  const text = (key: string, labelKey: string, value: string | undefined) => {
    if (value) entries.push({ key, labelKey, value })
  }
  text("q", "products.filterBar.searchLabel", filters.q)
  text(
    "rayon",
    "products.filterBar.rayonLabel",
    taxonomy?.rayons.find(r => r.id === filters.rayon)?.nom ?? filters.rayon,
  )
  if (filters.categorie !== undefined) {
    const name = taxonomy?.categories.find(c => c.id === filters.categorie)?.nom
    entries.push({
      key: "categorie",
      labelKey: "products.filterBar.categoryLabel",
      value: name ?? String(filters.categorie),
    })
  }
  text("marque", "products.filterBar.brandLabel", filters.marque)
  const stock = filters.stock && filters.stock !== "tous" ? STOCK_VALUE_KEYS[filters.stock] : undefined
  if (stock) entries.push({ key: "stock", labelKey: "products.stockExport.filters.stock", valueKey: stock })
  const state = filters.etat && filters.etat !== "tous" ? STATE_VALUE_KEYS[filters.etat] : undefined
  if (state) entries.push({ key: "etat", labelKey: "products.stockExport.filters.state", valueKey: state })
  return entries
}

/** Expects an error already passed through `rehydrateExportError`: a blob body has no readable `code_erreur`. */
export function isExportTooLarge(error: unknown): boolean {
  const code: CodeErreurExport = "export_trop_volumineux"
  return getErrorData(asRecord(error) ?? {}).code_erreur === code
}
