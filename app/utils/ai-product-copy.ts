import type {
  ProductCopyCategoryChoice,
  ProductCopyChoices,
  ProductCopyDraft,
  ProductCopyDraftSource,
  ProductCopyErrorReason,
  ProductCopyFingerprintInput,
  ProductCopyFailure,
  ProductCopyField,
  ProductCopyFormState,
  ProductCopySuggestion,
  ProductCopyTarget,
  ProductCopyTaxonomy,
} from "../types/ai/product-copy"
import type { TaxonomieCategorie } from "../types/api/produits"
import {
  PRODUCT_COPY_LIMITS,
  productCopySuggestionSchema,
  productCopySuggestionSchemaForFields,
} from "../schemas/ai-product-copy"
import { PRODUCT_COPY_CHOICE_FIELDS, PRODUCT_COPY_FIELDS } from "../types/ai/product-copy"
import { asRecord, getErrorData, getStatus } from "./api-error"

const MIN_NAME_LENGTH = 3

function isChoiceField(field: ProductCopyField): boolean {
  return (PRODUCT_COPY_CHOICE_FIELDS as readonly string[]).includes(field)
}

/**
 * A name alone is not a product, but a name plus at least one usable image is: the image is the evidence.
 * Without an image, text-backed identity and facts must pin the product down.
 */
export function hasEnoughProductContext(
  draft: ProductCopyDraft,
  hasProductId: boolean,
  fields: ProductCopyField[] = [...PRODUCT_COPY_FIELDS],
  imageCount = 0,
): boolean {
  void hasProductId
  if (draft.name.trim().length < MIN_NAME_LENGTH) return false
  if (imageCount > 0) return true
  // Choosing from a closed list needs nothing but the name: the model picks an offered option or declines.
  if (fields.some(isChoiceField) && fields.every(field => field === "name" || isChoiceField(field))) return true
  if (!draft.brand?.trim() && !draft.primaryCategory?.trim()) return false
  if (fields.every(field => field === "name")) return true
  return (
    draft.existingShortDescription.trim() !== "" ||
    draft.existingLongDescription.trim() !== "" ||
    draft.existingFeatures.length > 0
  )
}

/** One stable order drives request schemas, provider output, history and exact-result reuse. */
export function normalizeProductCopyFields(fields: readonly ProductCopyField[]): ProductCopyField[] {
  return PRODUCT_COPY_FIELDS.filter(field => fields.includes(field))
}

function fingerprintPayload(input: ProductCopyFingerprintInput): string {
  const fields = normalizeProductCopyFields(input.fields)
  const { draft, target } = input
  return JSON.stringify({
    draft: {
      name: draft.name,
      brand: draft.brand,
      department: draft.department,
      primaryCategory: draft.primaryCategory,
      secondaryCategories: draft.secondaryCategories,
      price: draft.price,
      existingShortDescription: draft.existingShortDescription,
      existingLongDescription: draft.existingLongDescription,
      existingFeatures: draft.existingFeatures,
    },
    language: input.language,
    fields,
    imageProfile: input.imageProfile,
    target:
      target.kind === "product" ? { kind: target.kind, id: target.id } : { kind: target.kind, token: target.token },
    imageSignature: input.imageSignature,
  })
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("")
}

/** Hashes the canonical request locally; only the digest is retained in the browser-session history. */
export async function createProductCopyFingerprint(input: ProductCopyFingerprintInput): Promise<string> {
  const bytes = new TextEncoder().encode(fingerprintPayload(input))
  return toHex(await globalThis.crypto.subtle.digest("SHA-256", bytes))
}

/** Characters that count against the prompt budget. The price is a number, not prompt text. */
export function measureDraftText(draft: ProductCopyDraft): number {
  const parts = [
    draft.name,
    draft.brand ?? "",
    draft.department ?? "",
    draft.primaryCategory ?? "",
    ...draft.secondaryCategories,
    draft.existingShortDescription,
    draft.existingLongDescription,
    ...draft.existingFeatures,
  ]
  return parts.reduce((total, part) => total + part.length, 0)
}

/** A privacy-safe measure of how many structured product facts reached the prompt. */
export function countProductCopyFacts(draft: ProductCopyDraft): number {
  return [
    draft.name,
    draft.brand ?? "",
    draft.department ?? "",
    draft.primaryCategory ?? "",
    ...draft.secondaryCategories,
    draft.existingShortDescription,
    draft.existingLongDescription,
    ...draft.existingFeatures,
  ].filter(value => value.trim() !== "").length
}

function stripControlCharacters(value: string): string {
  let kept = ""
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (code === 9 || code === 10 || (code >= 32 && code !== 127)) kept += char
  }
  return kept
}

function cleanModelText(value: unknown): unknown {
  if (typeof value !== "string") return value
  return stripControlCharacters(value.replace(/\r\n?/g, "\n")).trim()
}

function cleanModelFeatures(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  const seen = new Set<string>()
  const kept: unknown[] = []
  for (const entry of value) {
    const cleaned = cleanModelText(entry)
    if (typeof cleaned !== "string") {
      kept.push(cleaned)
      continue
    }
    const key = cleaned.toLowerCase()
    if (cleaned === "" || seen.has(key)) continue
    seen.add(key)
    kept.push(cleaned)
  }
  return kept
}

const NO_CHOICES: ProductCopyChoices = { brands: [], departments: [], categories: [] }

type OfferedCategories = ReadonlyMap<number, ProductCopyChoices["categories"][number]>

function pickBrand(value: unknown, brands: readonly string[]): string | undefined {
  const text = cleanModelText(value)
  return typeof text === "string" ? brands.find(brand => brand.toLowerCase() === text.toLowerCase()) : undefined
}

function pickSecondaryCategories(value: unknown, offered: OfferedCategories, primaryId: number | undefined) {
  if (!Array.isArray(value)) return undefined
  const ids = [...new Set(value as unknown[])].filter(
    (id): id is number => typeof id === "number" && offered.has(id) && id !== primaryId,
  )
  return ids.length > 0 ? ids.slice(0, PRODUCT_COPY_LIMITS.suggestedSecondaryCategories) : undefined
}

/** A category already sits in one department, so a chosen category settles it over a separate answer. */
function pickDepartment(value: unknown, primaryDepartment: string | null | undefined, choices: ProductCopyChoices) {
  const slug = primaryDepartment ?? (typeof value === "string" ? value : undefined)
  return slug && choices.departments.some(department => department.slug === slug) ? slug : undefined
}

/**
 * Reads the model's pick for each closed-list field. A null, or anything outside the offered list, means that
 * field is simply not suggested; the rest of the package is unaffected.
 */
function resolveChoices(
  record: Record<string, unknown>,
  fields: ProductCopyField[],
  choices: ProductCopyChoices,
): Partial<ProductCopySuggestion> {
  const offered: OfferedCategories = new Map(choices.categories.map(category => [category.id, category]))
  const primary = fields.includes("primaryCategory") ? offered.get(record.primaryCategory as number) : undefined
  const picked = {
    brand: fields.includes("brand") ? pickBrand(record.brand, choices.brands) : undefined,
    primaryCategory: primary?.id,
    secondaryCategories: fields.includes("secondaryCategories")
      ? pickSecondaryCategories(record.secondaryCategories, offered, primary?.id)
      : undefined,
    department: fields.includes("department")
      ? pickDepartment(record.department, primary?.department, choices)
      : undefined,
  }
  return Object.fromEntries(Object.entries(picked).filter(([, value]) => value !== undefined))
}

/** The record the strict schema sees: written fields cleaned, picked choices in, declined choices removed. */
function normaliseRecord(
  record: Record<string, unknown>,
  fields: ProductCopyField[],
  parsedFields: ProductCopyField[],
  picked: Partial<ProductCopySuggestion>,
): Record<string, unknown> {
  const normalised: Record<string, unknown> = { ...record }
  for (const field of fields) {
    if (!parsedFields.includes(field)) delete normalised[field]
    else if (isChoiceField(field)) normalised[field] = picked[field]
    else normalised[field] = field === "features" ? cleanModelFeatures(record[field]) : cleanModelText(record[field])
  }
  return normalised
}

/**
 * Parses the provider's JSON text into the one package the browser may receive, or null. It never throws: a
 * malformed model answer is an expected failure, not an exception.
 */
export function parseProductCopyOutput(text: string): ProductCopySuggestion | null
export function parseProductCopyOutput(
  text: string,
  fields: ProductCopyField[],
  choices?: ProductCopyChoices,
): Partial<ProductCopySuggestion> | null
export function parseProductCopyOutput(
  text: string,
  fields: ProductCopyField[] = [...PRODUCT_COPY_FIELDS],
  choices: ProductCopyChoices = NO_CHOICES,
): Partial<ProductCopySuggestion> | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null

  const record = raw as Record<string, unknown>
  const picked = resolveChoices(record, fields, choices)
  const parsedFields = fields.filter(field => !isChoiceField(field) || picked[field] !== undefined)
  if (parsedFields.length === 0) return null
  const normalised = normaliseRecord(record, fields, parsedFields, picked)
  const parsed =
    parsedFields.length === PRODUCT_COPY_FIELDS.length
      ? productCopySuggestionSchema.safeParse(normalised)
      : productCopySuggestionSchemaForFields(parsedFields).safeParse(normalised)
  return parsed.success ? parsed.data : null
}

function trimmedOrNull(value: string | null, max: number): string | null {
  const trimmed = value?.trim().slice(0, max).trim() ?? ""
  return trimmed === "" ? null : trimmed
}

function distinctTrimmed(values: string[], cap: number, maxLength: number): string[] {
  const seen = new Set<string>()
  const kept: string[] = []
  for (const value of values) {
    const trimmed = value.trim().slice(0, maxLength).trim()
    const key = trimmed.toLowerCase()
    if (trimmed === "" || seen.has(key)) continue
    seen.add(key)
    kept.push(trimmed)
  }
  return kept.slice(0, cap)
}

function toRequestPrice(price: number | null): number | null {
  if (price === null || !Number.isFinite(price)) return null
  const rounded = Math.round(price)
  return rounded >= 0 && rounded <= PRODUCT_COPY_LIMITS.price ? rounded : null
}

/**
 * The only way editor values reach the request. It names each field instead of spreading the source, so a
 * `url_source`, an image URL or any other editor value can never travel with the draft.
 */
export function buildProductCopyDraft(source: ProductCopyDraftSource): ProductCopyDraft {
  const { name, brand, department, category, shortDescription, longDescription, feature } = PRODUCT_COPY_LIMITS

  return {
    name: source.name.trim().slice(0, name),
    brand: trimmedOrNull(source.brand, brand),
    department: trimmedOrNull(source.department, department),
    primaryCategory: trimmedOrNull(source.primaryCategory, category),
    secondaryCategories: distinctTrimmed(source.secondaryCategories, PRODUCT_COPY_LIMITS.secondaryCategories, category),
    price: toRequestPrice(source.price),
    existingShortDescription: source.shortDescription.trim().slice(0, shortDescription),
    existingLongDescription: source.longDescription.trim().slice(0, longDescription),
    existingFeatures: distinctTrimmed(source.features, PRODUCT_COPY_LIMITS.features, feature),
  }
}

const KNOWN_REASONS: ReadonlySet<string> = new Set<ProductCopyErrorReason>([
  "forbidden",
  "invalid_request",
  "insufficient_context",
  "prompt_too_large",
  "busy",
  "quota_exceeded",
  "provider_unavailable",
  "provider_timeout",
  "provider_refused",
  "invalid_model_output",
])

function positiveSeconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.ceil(value) : null
}

function retryAfterHeaderSeconds(record: Record<string, unknown>): number | null {
  const headers = asRecord(asRecord(record.response)?.headers)
  const get = headers?.get
  if (typeof get !== "function") return null
  const raw: unknown = get.call(headers, "retry-after")
  return typeof raw === "string" && /^\d+$/.test(raw.trim()) ? positiveSeconds(Number(raw.trim())) : null
}

/** Reduces whatever the fetch rejected with to a reason and a wait; the server's message is never carried over. */
export function toProductCopyFailure(error: unknown): ProductCopyFailure {
  const record = asRecord(error)
  if (!record) return { reason: "unreachable", retryAfterSeconds: null }

  const data = getErrorData(record)
  const reason = typeof data.reason === "string" && KNOWN_REASONS.has(data.reason) ? data.reason : null
  if (!reason) {
    // Not one of this endpoint's own refusals (a 500, a security-layer block, a proxy error): show where it came from.
    const status = getStatus(record)
    if (status === 0) return { reason: "unreachable", retryAfterSeconds: null }
    const text = [record.statusMessage, record.statusText].find(value => typeof value === "string" && value.trim())
    return {
      reason: "unknown",
      retryAfterSeconds: null,
      detail: `HTTP ${status}${text ? ` ${String(text).trim()}` : ""}`,
    }
  }

  const retryAfterSeconds =
    reason === "quota_exceeded" ? (positiveSeconds(data.retryAfterSeconds) ?? retryAfterHeaderSeconds(record)) : null
  const detail = typeof data.providerDetail === "string" ? data.providerDetail.trim() : ""
  return { reason: reason as ProductCopyErrorReason, retryAfterSeconds, ...(detail && { detail }) }
}

/** A generation belongs to one product, or to one editor session of a product that does not exist yet. */
export function isSameProductCopyTarget(a: ProductCopyTarget | null, b: ProductCopyTarget | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false
  return a.kind === "product" ? a.id === (b as typeof a).id : a.token === (b as typeof a).token
}

/** The model reads labels, not ids: an id the operator cannot see would be noise in the prompt. */
export function toProductCopyDraftSource(
  form: ProductCopyFormState,
  taxonomy: ProductCopyTaxonomy,
): ProductCopyDraftSource {
  const categoryName = (id: number) => taxonomy.categories.find(category => category.id === id)?.nom
  return {
    name: form.name,
    brand: form.brand,
    department: taxonomy.departments.find(department => department.slug === form.departmentSlug)?.nom ?? null,
    primaryCategory: form.primaryCategoryId === null ? null : (categoryName(form.primaryCategoryId) ?? null),
    secondaryCategories: form.secondaryCategoryIds.flatMap(id => categoryName(id) ?? []),
    price: form.price,
    shortDescription: form.shortDescription,
    longDescription: form.longDescription,
    features: form.features,
  }
}

/**
 * Visible categories the model may pick from. A name that is unique among them stays short; only a name shared by
 * several categories is spelled out with its parents. When `departmentSlug` is given, only that department's
 * categories are offered, which is most of the list for a typical catalogue.
 */
export function toProductCopyCategoryChoices(
  categories: readonly TaxonomieCategorie[],
  departmentSlug: string | null = null,
): ProductCopyCategoryChoice[] {
  const byId = new Map(categories.map(category => [category.id, category]))
  const pathOf = (category: TaxonomieCategorie): string => {
    const names = [category.nom]
    const seen = new Set([category.id])
    for (
      let parent = byId.get(category.parent_id ?? -1);
      parent && !seen.has(parent.id);
      parent = byId.get(parent.parent_id ?? -1)
    ) {
      seen.add(parent.id)
      names.unshift(parent.nom)
    }
    return names.join(" > ")
  }
  const offered = categories.filter(
    category => !category.masquee && (departmentSlug === null || category.rayon === departmentSlug),
  )
  const nameCount = new Map<string, number>()
  for (const category of offered) nameCount.set(category.nom, (nameCount.get(category.nom) ?? 0) + 1)
  return offered.slice(0, PRODUCT_COPY_LIMITS.categories).map(category => ({
    id: category.id,
    path: nameCount.get(category.nom) === 1 ? category.nom : pathOf(category),
    department: category.rayon,
  }))
}
