import type { StatutPaiement } from "@/types/api/commandes"

export const PAYMENT_STATUS_TONE: Record<StatutPaiement, string> = {
  en_attente: "bg-destructive/10 text-destructive",
  paye: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rembourse: "bg-muted text-muted-foreground",
}
