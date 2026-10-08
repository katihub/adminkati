import type { ProductDetail } from "@/types/api/produits"

/**
 * What the product form is derived from. Stock is written through the inventory panel and never
 * through the form, so a detail refetch that only moved stock must not look like a new product:
 * re-deriving would wipe whatever the operator has typed and not saved yet.
 */
export function productFormSignature(product: ProductDetail | null): string | null {
  if (!product) return null
  const {
    inventaire: _inventaire,
    statut_stock: _status,
    quantite_stock: _quantity,
    // Derived from the stock state, so it flips whenever a movement takes stock across zero.
    en_stock: _legacyInStock,
    ...saved
  } = product
  return JSON.stringify(saved)
}
