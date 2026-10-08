import type { InventaireProduit, StatutForce } from "@/types/api/inventaire"

export type AvailabilityConflict = "sell-without-stock" | "hide-with-stock" | "resume-flips"

/**
 * Whether choosing `target` contradicts the count on record (`null` hands the decision back to the count).
 * A product nobody has counted has no amount to contradict, so it never conflicts.
 */
export function availabilityConflict(
  inventory: InventaireProduit,
  target: StatutForce | null,
): AvailabilityConflict | null {
  if (inventory.modifie_le === null) return null

  const countSaysInStock = inventory.quantite_stock > 0
  if (target === "en_stock") return countSaysInStock ? null : "sell-without-stock"
  if (target === "rupture") return countSaysInStock ? "hide-with-stock" : null

  const isSellingNow = inventory.statut_stock === "en_stock"
  return isSellingNow === countSaysInStock ? null : "resume-flips"
}
