import type { StatutPaiement } from "@/types/api/commandes"

export const PAYMENT_STATUS_TONE: Record<StatutPaiement, string> = {
  en_attente: "bg-destructive/10 text-destructive",
  paye: "bg-success/10 text-success",
  rembourse: "bg-muted text-muted-foreground",
}
