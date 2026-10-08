/** Mirrors the backend's storage-supported set (`../NowTech-backend-/src/stockage/stockage.service.ts:45-96`). */
export const PRODUCT_IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const

/**
 * The BFF's raw-body cap (`server/api/v1/[...path].ts:6`) is the effective limit — it is
 *  tighter than the backend's own 5 MiB ceiling.
 */
export const PRODUCT_IMAGE_MAX_BYTES = 5_000_000

/** Returns an i18n key describing why `file` can't be uploaded, or `null` when it's valid. */
export function validateProductImageFile(file: File): string | null {
  if (!PRODUCT_IMAGE_ACCEPTED_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_ACCEPTED_TYPES)[number]))
    return "products.imageGallery.errors.type"
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return "products.imageGallery.errors.size"
  return null
}
