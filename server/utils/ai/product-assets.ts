import type { ProductCopyAssetWarning, ProductCopyImageProfile } from "../../../app/types/ai/product-copy"

export const MAX_PRODUCT_COPY_IMAGES = 4

const MAX_URL_LENGTH = 2000
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal"]

export interface ProductAssetSource {
  images: Array<{ rang: number; url: string }>
  fiche_pdf: string | null
}

export type ProductLookup = { kind: "absent" } | { kind: "unreadable" } | { kind: "found"; product: ProductAssetSource }

export interface ResolvedProductAssets {
  imageUrls: string[]
  imageInputs: Array<{ image_url: string; detail: "auto" | "low" }>
  imageProfile: ProductCopyImageProfile
  candidateImageCount: number
  datasheetUsed: boolean
  warnings: ProductCopyAssetWarning[]
}

function toImageInputs(
  imageUrls: string[],
  imageProfile: ProductCopyImageProfile,
): ResolvedProductAssets["imageInputs"] {
  const selected = imageProfile === "primary-auto" ? imageUrls.slice(0, 1) : imageUrls
  return selected.map((image_url, index) => ({
    image_url,
    detail: imageProfile === "primary-auto-secondary-low" && index > 0 ? "low" : "auto",
  }))
}

function isBlockedHost(rawHostname: string): boolean {
  const hostname = rawHostname.toLowerCase().replace(/\.$/, "")
  if (hostname === "localhost" || BLOCKED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix))) return true
  // `URL` has already normalised decimal, hex and octal IPv4 forms to dotted quads, so one pattern covers them all.
  if (hostname.startsWith("[") || /^\d+(?:\.\d+){3}$/.test(hostname)) return true
  return !hostname.includes(".")
}

/**
 * The provider fetches these URLs from its own network, so anything that could reach a private service, or that
 * names a host by address rather than by a public DNS name, is refused before it is ever sent.
 */
export function isSafeImageUrl(url: string): boolean {
  if (url.length === 0 || url.length > MAX_URL_LENGTH) return false

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false
  if (parsed.port !== "") return false
  return !isBlockedHost(parsed.hostname)
}

export function resolveProductAssets(
  lookup: ProductLookup,
  imageProfile: ProductCopyImageProfile = "all-auto",
): ResolvedProductAssets {
  if (lookup.kind === "absent") {
    return { imageUrls: [], imageInputs: [], imageProfile, candidateImageCount: 0, datasheetUsed: false, warnings: [] }
  }
  if (lookup.kind === "unreadable") {
    return {
      imageUrls: [],
      imageInputs: [],
      imageProfile,
      candidateImageCount: 0,
      datasheetUsed: false,
      warnings: ["image_unavailable", "datasheet_unavailable"],
    }
  }

  const ranked = [...lookup.product.images].sort((a, b) => a.rang - b.rang)
  const safe = ranked.filter(image => isSafeImageUrl(image.url))
  const warnings: ProductCopyAssetWarning[] = []
  if (safe.length < ranked.length) warnings.push("image_unavailable")
  // `fiche_pdf` is a storage path, not a URL, and no server-owned read route exists to fetch its bytes safely.
  if (lookup.product.fiche_pdf) warnings.push("datasheet_unavailable")

  const imageUrls = safe.slice(0, MAX_PRODUCT_COPY_IMAGES).map(image => image.url)
  const imageInputs = toImageInputs(imageUrls, imageProfile)
  return {
    imageUrls: imageInputs.map(image => image.image_url),
    imageInputs,
    imageProfile,
    candidateImageCount: imageUrls.length,
    datasheetUsed: false,
    warnings,
  }
}
