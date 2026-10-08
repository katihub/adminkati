import type { LigneResultatImport } from "@/types/api/stock-import"

const STATUS_VARIANT = { applique: "success", ignore: "secondary", echec: "destructive" } as const
const IGNORE_HEADLINE = {
  quantite_vide: "notTouched",
  stock_modifie: "stockChanged.skipped",
  aucun_ecart: "noChange",
} as const

/** A drifted row keeps its own status behind a warning badge, so the operator sees the drift first. */
export function stockImportRowBadge(line: LigneResultatImport) {
  return line.stock_modifie
    ? ({ variant: "warning", status: "stockChanged" } as const)
    : ({ variant: STATUS_VARIANT[line.statut], status: line.statut } as const)
}

/**
 * Key (under `products.stockImport`) of the details-cell headline. An `ignore` row from before
 * `raison_ignore` existed has none, and reads as a count already at its target.
 */
export function stockImportRowHeadlineKey(line: LigneResultatImport, statusPrefix: string): string | null {
  if (line.statut === "ignore") return IGNORE_HEADLINE[line.raison_ignore ?? "aucun_ecart"]
  if (line.statut === "echec") return `rowCodes.${line.code_erreur}`
  return line.stock_modifie ? `${statusPrefix}.${line.statut}` : null
}
