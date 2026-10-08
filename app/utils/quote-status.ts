import type { StatutDevis } from "@/types/api/devis"

export const QUOTE_STATUS_TONE: Record<StatutDevis, string> = {
  ouvert: "bg-success/10 text-success",
  commande: "bg-primary/10 text-primary",
  archive: "bg-muted text-muted-foreground",
}
