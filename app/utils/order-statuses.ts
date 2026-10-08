import type { StatutCommande } from "@/types/api/commandes"

export const ORDER_STATUSES: readonly StatutCommande[] = [
  "soumise",
  "confirmee",
  "refusee",
  "en_preparation",
  "prete_au_retrait",
  "en_remise",
  "retour_ouvert",
  "annulation_demandee",
  "annulee",
  "close",
]
