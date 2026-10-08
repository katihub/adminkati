export interface AiRuntimeConfig {
  openaiApiKey: string
  aiProductCopyModel: string
  aiProductCopyQuotaPerHour: number
  aiProductCopyTimeoutMs: number
  aiProductCopyPromptCharLimit: number
  aiProductCopyMaxOutputTokens: number
  aiProductCopyReasoningEffort: string
  aiProductCopyDefaultImageProfile: string
  aiProductCopyNameMaxOutputTokens: number
  aiProductCopyShortDescriptionMaxOutputTokens: number
  aiProductCopyLongDescriptionMaxOutputTokens: number
  aiProductCopyFeaturesMaxOutputTokens: number
  aiProductCopyInputUsdPerMillionTokens: number
  aiProductCopyOutputUsdPerMillionTokens: number
}

const POSITIVE_INTEGER_SETTINGS = [
  ["aiProductCopyQuotaPerHour", "NUXT_AI_PRODUCT_COPY_QUOTA_PER_HOUR"],
  ["aiProductCopyTimeoutMs", "NUXT_AI_PRODUCT_COPY_TIMEOUT_MS"],
  ["aiProductCopyPromptCharLimit", "NUXT_AI_PRODUCT_COPY_PROMPT_CHAR_LIMIT"],
  ["aiProductCopyMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_MAX_OUTPUT_TOKENS"],
  ["aiProductCopyNameMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_NAME_MAX_OUTPUT_TOKENS"],
  ["aiProductCopyShortDescriptionMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_SHORT_DESCRIPTION_MAX_OUTPUT_TOKENS"],
  ["aiProductCopyLongDescriptionMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_LONG_DESCRIPTION_MAX_OUTPUT_TOKENS"],
  ["aiProductCopyFeaturesMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_FEATURES_MAX_OUTPUT_TOKENS"],
] as const

const PRICE_SETTINGS = [
  ["aiProductCopyInputUsdPerMillionTokens", "NUXT_AI_PRODUCT_COPY_INPUT_USD_PER_MILLION_TOKENS"],
  ["aiProductCopyOutputUsdPerMillionTokens", "NUXT_AI_PRODUCT_COPY_OUTPUT_USD_PER_MILLION_TOKENS"],
] as const

function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

/**
 * Lists every misconfigured setting by its environment variable, never by value: the API key must not reach a
 * boot log. A missing key only matters in production, so development and tests start without calling OpenAI.
 */
export function assertAiConfig(config: AiRuntimeConfig, environment: string | undefined): void {
  const problems: string[] = []

  if (environment === "production" && !config.openaiApiKey?.trim()) problems.push("NUXT_OPENAI_API_KEY is empty")
  if (!config.aiProductCopyModel?.trim()) problems.push("NUXT_AI_PRODUCT_COPY_MODEL is empty")
  if (!(["minimal", "low", "medium", "high"] as readonly string[]).includes(config.aiProductCopyReasoningEffort)) {
    problems.push("NUXT_AI_PRODUCT_COPY_REASONING_EFFORT is invalid")
  }
  if (
    !(["all-auto", "primary-auto", "primary-auto-secondary-low"] as readonly string[]).includes(
      config.aiProductCopyDefaultImageProfile,
    )
  ) {
    problems.push("NUXT_AI_PRODUCT_COPY_DEFAULT_IMAGE_PROFILE is invalid")
  }
  for (const [field, variable] of POSITIVE_INTEGER_SETTINGS) {
    if (!isPositiveInteger(config[field])) problems.push(`${variable} must be a positive integer`)
  }
  for (const [field, variable] of PRICE_SETTINGS) {
    if (!isNonNegativeNumber(config[field])) problems.push(`${variable} must be a number of zero or more`)
  }

  if (problems.length) throw new Error(`Invalid AI configuration: ${problems.join("; ")}.`)
}
