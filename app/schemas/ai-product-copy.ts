import type { ProductCopyField } from "../types/ai/product-copy"
import { z } from "zod/v4"
import { PRODUCT_COPY_FIELDS, PRODUCT_COPY_IMAGE_PROFILES, PRODUCT_COPY_LANGUAGES } from "../types/ai/product-copy"

/** Mirrors the product form's own ceilings in `produit.ts`, so a suggestion can always be applied as typed. */
export const PRODUCT_COPY_LIMITS = {
  name: 300,
  brand: 120,
  brands: 300,
  departments: 50,
  categories: 400,
  suggestedSecondaryCategories: 5,
  department: 120,
  category: 300,
  secondaryCategories: 20,
  shortDescription: 500,
  longDescription: 20_000,
  feature: 500,
  features: 12,
  price: 1_000_000_000,
} as const

const required = (max: number) => z.string().trim().min(1).max(max)
const optionalLabel = (max: number) => z.string().trim().max(max).nullable()

/** Strict on purpose: no `url_source`, image URL or attachment field can ride along inside the draft. */
const productCopyDraftSchema = z.strictObject({
  name: required(PRODUCT_COPY_LIMITS.name),
  brand: optionalLabel(PRODUCT_COPY_LIMITS.brand),
  department: optionalLabel(PRODUCT_COPY_LIMITS.department),
  primaryCategory: optionalLabel(PRODUCT_COPY_LIMITS.category),
  secondaryCategories: z.array(required(PRODUCT_COPY_LIMITS.category)).max(PRODUCT_COPY_LIMITS.secondaryCategories),
  price: z.number().int().min(0).max(PRODUCT_COPY_LIMITS.price).nullable(),
  existingShortDescription: z.string().trim().max(PRODUCT_COPY_LIMITS.shortDescription),
  existingLongDescription: z.string().trim().max(PRODUCT_COPY_LIMITS.longDescription),
  existingFeatures: z.array(required(PRODUCT_COPY_LIMITS.feature)).max(PRODUCT_COPY_LIMITS.features),
})

export const productCopyRequestSchema = z.strictObject({
  language: z.enum(PRODUCT_COPY_LANGUAGES),
  productId: z.number().int().positive().optional(),
  fields: z
    .array(z.enum(PRODUCT_COPY_FIELDS))
    .min(1)
    .max(PRODUCT_COPY_FIELDS.length)
    .superRefine((fields, context) => {
      if (new Set(fields).size !== fields.length) {
        context.addIssue({ code: "custom", message: "Product-copy fields must be distinct" })
      }
    })
    .default([...PRODUCT_COPY_FIELDS])
    .transform(fields => PRODUCT_COPY_FIELDS.filter(field => fields.includes(field))),
  imageProfile: z.enum(PRODUCT_COPY_IMAGE_PROFILES).default("all-auto"),
  brands: z.array(required(PRODUCT_COPY_LIMITS.brand)).max(PRODUCT_COPY_LIMITS.brands).default([]),
  departments: z
    .array(z.strictObject({ slug: required(120), name: required(PRODUCT_COPY_LIMITS.department) }))
    .max(PRODUCT_COPY_LIMITS.departments)
    .default([]),
  categories: z
    .array(
      z.strictObject({
        id: z.number().int().positive(),
        path: required(PRODUCT_COPY_LIMITS.category),
        department: z.string().trim().max(120).nullable(),
      }),
    )
    .max(PRODUCT_COPY_LIMITS.categories)
    .default([]),
  draft: productCopyDraftSchema,
})

const productCopySuggestionShape = {
  name: required(PRODUCT_COPY_LIMITS.name),
  brand: required(PRODUCT_COPY_LIMITS.brand),
  department: required(120),
  primaryCategory: z.number().int().positive(),
  secondaryCategories: z.array(z.number().int().positive()).max(PRODUCT_COPY_LIMITS.suggestedSecondaryCategories),
  shortDescription: required(PRODUCT_COPY_LIMITS.shortDescription),
  longDescription: required(PRODUCT_COPY_LIMITS.longDescription),
  features: z.array(required(PRODUCT_COPY_LIMITS.feature)).max(PRODUCT_COPY_LIMITS.features),
}

export const productCopySuggestionSchema = z.strictObject(productCopySuggestionShape)

export const productCopyOutcomeSchema = z.strictObject({
  requestId: z.string().uuid(),
  field: z.enum(PRODUCT_COPY_FIELDS),
  action: z.enum(["applied", "dismissed"]),
})

export function productCopySuggestionSchemaForFields(fields: ProductCopyField[]) {
  const shape: Record<string, (typeof productCopySuggestionShape)[ProductCopyField]> = {}
  for (const field of fields) shape[field] = productCopySuggestionShape[field]
  return z.strictObject(shape)
}
