import type { StatutStock } from "@/types/api/inventaire"

export type ProductStatus = "en-stock" | "rupture" | "reapprovisionnement" | "retire"

const STOCK_STATUS: Record<StatutStock, ProductStatus> = {
  en_stock: "en-stock",
  rupture: "rupture",
  reapprovisionnement: "reapprovisionnement",
}

/** Withdrawal is a lifecycle state, not a stock level — it always overrides `statut_stock`. */
export function deriveProductStatus(statutStock: StatutStock, retireLe: string | null): ProductStatus {
  if (retireLe !== null) return "retire"

  return STOCK_STATUS[statutStock]
}

/** Semantic theme tokens only — no hard-coded colours — so the tones follow the light and dark themes. */
export const PRODUCT_STATUS_TONE: Record<ProductStatus, string> = {
  "en-stock": "bg-primary/10 text-primary border-primary/20",
  rupture: "bg-destructive/10 text-destructive border-destructive/20",
  reapprovisionnement: "bg-warning/10 text-warning border-warning/20",
  retire: "bg-muted text-muted-foreground border-border",
}
