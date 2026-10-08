import type { ProductCopyField } from "../../../app/types/ai/product-copy"

export type ProductCopyReasoningEffort = "minimal" | "low" | "medium" | "high"

export interface ProductCopyPolicyConfig {
  maxOutputTokens: number
  reasoningEffort?: string
  outputTokenCaps?: Partial<Record<ProductCopyField, number>>
}

export interface ProductCopyGenerationPolicy {
  maxOutputTokens: number
  reasoningEffort: ProductCopyReasoningEffort
}

function reasoningEffort(value: string | undefined): ProductCopyReasoningEffort {
  if (value === undefined) return "low"
  if (["minimal", "low", "medium", "high"].includes(value)) return value as ProductCopyReasoningEffort
  throw new Error("Product-copy reasoning effort is invalid.")
}

function positiveAllowance(value: number, field: ProductCopyField): number {
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`Product-copy output allowance for ${field} must be positive.`)
  return value
}

/** Keeps one atomic structured response within the largest allowance needed by its selected fields. */
export function resolveProductCopyPolicy(
  fields: ProductCopyField[],
  config: ProductCopyPolicyConfig,
): ProductCopyGenerationPolicy {
  if (fields.length === 0) throw new Error("A product-copy policy needs at least one field.")
  const allowances = fields.map(field =>
    positiveAllowance(config.outputTokenCaps?.[field] ?? config.maxOutputTokens, field),
  )
  return {
    maxOutputTokens: Math.max(...allowances),
    reasoningEffort: reasoningEffort(config.reasoningEffort),
  }
}
