import type { AdresseFigee } from "@/types/api/commandes"

/** The delivery address frozen on an order, in one line: city · district · landmark. */
export function formatFrozenAddress(address: AdresseFigee | null | undefined): string {
  if (!address) return ""
  return [address.ville, address.quartier, address.repere].filter(Boolean).join(" · ")
}
