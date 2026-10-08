/**
 * Direction-only management contracts.
 *
 * These mirror `src/couts/couts.service.ts` in `../NowTech-backend-`; the
 * backend remains the authorization and validation boundary.
 */

/** Mirrors `src/couts/couts.service.ts:31-35` and `src/catalogue/administration.controller.ts:128-132`. */
export interface ProductCostRecord {
  id: string
  productId: number
  cost: number
  effectiveAt: string
  actor: string | null
  createdAt: string
}

/** Mirrors `src/catalogue/administration.dto.ts:197-200` and `src/catalogue/administration.controller.ts:135-143`. */
export interface AddProductCostInput {
  productId: number
  cost: number
}
