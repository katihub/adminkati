import type { ProductCheckAction, ProductCheckItem } from "@/types/api/marketplace-product-check"

/**
 * WHAT THE TEAM CAN DO WITH A PRODUCT TO CHECK (7 November 2026).
 * Hide is the default answer to a problem and can be undone; delete is for
 * serious cases and belongs to the direction alone.
 */
export function productCheckActions(
  product: Pick<ProductCheckItem, "statut">,
  roles: readonly string[],
): ProductCheckAction[] {
  const actions: ProductCheckAction[] = ["seen", product.statut === "suspendu" ? "restore" : "hide", "correction"]
  if (roles.includes("direction")) actions.push("delete")
  return actions
}

/** Hide, ask for a correction and delete tell the shop why. */
export function productCheckNeedsReason(action: ProductCheckAction): boolean {
  return action === "hide" || action === "correction" || action === "delete"
}

/** The API path of an action. */
export function productCheckPath(productId: string, action: ProductCheckAction): string {
  const segment = { seen: "vu", hide: "masquer", restore: "retablir", correction: "correction", delete: "supprimer" }[
    action
  ]
  return `/marketplace/moderation/produits/${encodeURIComponent(productId)}/${segment}`
}

/** The lowest published price, or null when the product has none (it is not shown on the site). */
export function productCheckLowestPrice(product: Pick<ProductCheckItem, "offres">): number | null {
  const prices = product.offres
    .map(offer => offer.prixFcfa)
    .filter((price): price is number => typeof price === "number")
  return prices.length ? Math.min(...prices) : null
}
