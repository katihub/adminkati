import type { StatutRemiseCaisse } from "@/types/api/caisse"

export const CAISSE_STATUS_TONE: Record<StatutRemiseCaisse, string> = {
  ouverte: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  comptee: "bg-success/10 text-success",
  litige: "bg-destructive/10 text-destructive",
  validee: "bg-muted text-muted-foreground",
}
