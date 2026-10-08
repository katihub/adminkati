import type { StatutCommande } from "@/types/api/commandes"

export const ORDER_STATUS_TONE: Record<StatutCommande, string> = {
  soumise: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  confirmee: "bg-primary/10 text-primary",
  refusee: "bg-destructive/10 text-destructive",
  en_preparation: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  prete_au_retrait: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  en_remise: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  retour_ouvert: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  annulation_demandee: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  annulee: "bg-destructive/10 text-destructive",
  close: "bg-muted text-muted-foreground",
}
