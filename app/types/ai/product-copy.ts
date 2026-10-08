/** Contract of `POST /api/ai/products/suggestions`. Defined by this panel's BFF, not mirrored from the backend. */

export const PRODUCT_COPY_LANGUAGES = ["fr", "en"] as const

export type ProductCopyLanguage = (typeof PRODUCT_COPY_LANGUAGES)[number]

/** The product-editor fields one suggestion package targets. */
export const PRODUCT_COPY_FIELDS = [
  "name",
  "brand",
  "department",
  "primaryCategory",
  "secondaryCategories",
  "shortDescription",
  "longDescription",
  "features",
] as const

/** Fields the model fills by choosing from the shop's own lists instead of writing free text. */
export const PRODUCT_COPY_CHOICE_FIELDS = ["brand", "department", "primaryCategory", "secondaryCategories"] as const

export type ProductCopyField = (typeof PRODUCT_COPY_FIELDS)[number]

export const PRODUCT_COPY_IMAGE_PROFILES = ["all-auto", "primary-auto", "primary-auto-secondary-low"] as const

export type ProductCopyImageProfile = (typeof PRODUCT_COPY_IMAGE_PROFILES)[number]

export type ProductCopyAssetWarning = "image_unavailable" | "datasheet_unavailable"

/**
 * Every refusal the endpoint can answer with, carried in `error.data.reason`. The backend sends no stable
 * error codes, so the browser maps these to its own translated wording instead of showing a status line.
 */
export type ProductCopyErrorReason =
  | "forbidden"
  | "invalid_request"
  | "insufficient_context"
  | "prompt_too_large"
  | "busy"
  | "quota_exceeded"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_refused"
  | "invalid_model_output"

/**
 * Deliberately has no `url_source`, image URL, PDF path or arbitrary attachment: the server never reads a
 * browser-provided asset location, and a source page is never crawled.
 */
export interface ProductCopyDepartmentChoice {
  slug: string
  name: string
}

export interface ProductCopyCategoryChoice {
  id: number
  /** The category with its parents, e.g. "Networking > Switches", so equal names stay distinguishable. */
  path: string
  /** The slug of the department this category sits in. */
  department: string | null
}

/** The lists a suggestion may choose from, as the request carries them. */
export interface ProductCopyChoices {
  brands: readonly string[]
  departments: readonly ProductCopyDepartmentChoice[]
  categories: readonly ProductCopyCategoryChoice[]
}

export interface ProductCopyDraft {
  name: string
  brand: string | null
  department: string | null
  primaryCategory: string | null
  secondaryCategories: string[]
  price: number | null
  existingShortDescription: string
  existingLongDescription: string
  existingFeatures: string[]
}

export interface ProductCopySuggestionRequest {
  language: ProductCopyLanguage
  /** Omitted for a new product. A lookup key for persisted assets only; the draft stays the content source. */
  productId?: number
  /** The fields the operator explicitly wants to generate, in the canonical display order. */
  fields: ProductCopyField[]
  /** A bounded server-side image-selection policy; the browser never supplies an image URL. */
  imageProfile: ProductCopyImageProfile
  /** The brand names a suggestion may pick from. Required whenever `brand` is among `fields`. */
  brands?: string[]
  /** The departments a suggestion may pick from. Required whenever `department` is among `fields`. */
  departments?: ProductCopyDepartmentChoice[]
  /** The categories a suggestion may pick from. Required for `primaryCategory` and `secondaryCategories`. */
  categories?: ProductCopyCategoryChoice[]
  draft: ProductCopyDraft
}

export interface ProductCopySuggestion {
  name: string
  /** Always one of the request's `brands`, spelled as listed. */
  brand: string
  /** The slug of one offered department. */
  department: string
  /** The id of one offered category. */
  primaryCategory: number
  /** Ids of offered categories, never including the primary one. */
  secondaryCategories: number[]
  shortDescription: string
  longDescription: string
  features: string[]
}

export interface ProductCopyAssets {
  imageProfile: ProductCopyImageProfile
  candidateImageCount: number
  imageCount: number
  imageFallback: boolean
  datasheetUsed: boolean
  warnings: ProductCopyAssetWarning[]
}

export interface ProductCopySuggestionResponse {
  /** Exactly the fields requested by the operator. */
  suggestion: Partial<ProductCopySuggestion>
  assets: ProductCopyAssets
  /** A correlation handle only; it never encodes user or product data. */
  requestId: string
}

/** Where a generated package belongs: a persisted product, or one editor session of a product not yet created. */
export type ProductCopyTarget = { kind: "product"; id: number } | { kind: "new"; token: string }

export interface ProductCopyFingerprintInput {
  draft: ProductCopyDraft
  language: ProductCopyLanguage
  fields: ProductCopyField[]
  imageProfile: ProductCopyImageProfile
  target: ProductCopyTarget
  /** Browser-local persisted image state; it is folded into the digest and never stored or transmitted. */
  imageSignature: string
}

/** What the browser can say about a failed request: a server reason, no response at all, or something unrecognised. */
export type ProductCopyFailureReason = ProductCopyErrorReason | "unreachable" | "unknown"

export interface ProductCopyFailure {
  reason: ProductCopyFailureReason
  /** Seconds until the allowance frees up; only meaningful for `quota_exceeded`. */
  retryAfterSeconds: number | null
  /** OpenAI's own explanation, already sanitised by the server; shown beneath the translated headline. */
  detail?: string | null
}

export type AiGenerationStatus = "idle" | "loading" | "ready" | "error"

interface AiGenerationHistoryBase {
  /** The run number: unique for the whole session, so it identifies an entry. */
  id: number
  target: ProductCopyTarget
  /** The product name as typed when the run started; the only thing that tells two entries apart. */
  label: string
  language: ProductCopyLanguage
  createdAt: number
}

/** One settled generation, kept in browser memory only so the operator can look back at it. */
export type AiGenerationHistoryEntry =
  | (AiGenerationHistoryBase & {
      status: "ready"
      /** The whole package, unlike the store's pending copy, which loses a field each time it is settled. */
      suggestion: Partial<ProductCopySuggestion>
      assets: ProductCopyAssets
      warnings: ProductCopyAssetWarning[]
      requestId: string
      /** Session-only exact-input digest; no raw input, assets or generated copy are persisted. */
      fingerprint?: string
    })
  | (AiGenerationHistoryBase & { status: "error"; failure: ProductCopyFailure })

/** The product editor's current values, before they are normalised into a `ProductCopyDraft`. */
export interface ProductCopyDraftSource {
  name: string
  brand: string | null
  department: string | null
  primaryCategory: string | null
  secondaryCategories: string[]
  price: number | null
  shortDescription: string
  longDescription: string
  features: string[]
}

/** The editor's raw form state: taxonomy values are ids and slugs here, labels only after resolution. */
export interface ProductCopyFormState {
  name: string
  brand: string | null
  departmentSlug: string | null
  primaryCategoryId: number | null
  secondaryCategoryIds: number[]
  price: number | null
  shortDescription: string
  longDescription: string
  features: string[]
}

export interface ProductCopyTaxonomy {
  departments: Array<{ slug: string; nom: string }>
  categories: Array<{ id: number; nom: string }>
}
