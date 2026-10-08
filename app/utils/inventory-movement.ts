import type { BadgeVariants } from "@/components/ui/badge"
import type { InventaireProduit, MouvementStockType, StatutStock } from "@/types/api/inventaire"

const VARIANTS: Record<MouvementStockType, NonNullable<BadgeVariants["variant"]>> = {
  initialisation: "outline",
  reception: "success",
  correction: "warning",
  commande_confirmee: "default",
  commande_liberee: "secondary",
}

export function movementTypeVariant(type: MouvementStockType) {
  return VARIANTS[type]
}

const RESTOCKING_TOGGLE: Partial<Record<StatutStock, "rupture" | "reapprovisionnement">> = {
  rupture: "reapprovisionnement",
  reapprovisionnement: "rupture",
}

/**
 * Restocking is a zero-quantity decision on a counted product: with stock on hand, the state follows the
 * quantity alone. A never-counted product (`modifie_le` null) has nothing to restock, and the backend would
 * create its permanent zero stock row on the first change. While the direction has decided the status, the
 * physical state is hidden, so there is nothing to toggle either.
 */
export function toggledRestockingStatus(inventory: InventaireProduit | undefined) {
  if (inventory?.quantite_stock !== 0 || inventory.modifie_le === null || inventory.disponibilite_forcee !== null) {
    return null
  }
  return RESTOCKING_TOGGLE[inventory.statut_stock] ?? null
}
