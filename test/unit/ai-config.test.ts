import type { AiRuntimeConfig } from "../../server/utils/ai/config"
import { describe, expect, it } from "vitest"
import { assertAiConfig } from "../../server/utils/ai/config"

function validConfig(overrides: Partial<AiRuntimeConfig> = {}): AiRuntimeConfig {
  return {
    openaiApiKey: "sk-test-key",
    aiProductCopyModel: "gpt-5-mini",
    aiProductCopyQuotaPerHour: 50,
    aiProductCopyTimeoutMs: 30_000,
    aiProductCopyPromptCharLimit: 8_000,
    aiProductCopyMaxOutputTokens: 1_000,
    aiProductCopyReasoningEffort: "low",
    aiProductCopyDefaultImageProfile: "all-auto",
    aiProductCopyNameMaxOutputTokens: 1_000,
    aiProductCopyShortDescriptionMaxOutputTokens: 1_000,
    aiProductCopyLongDescriptionMaxOutputTokens: 1_000,
    aiProductCopyFeaturesMaxOutputTokens: 1_000,
    aiProductCopyInputUsdPerMillionTokens: 0.15,
    aiProductCopyOutputUsdPerMillionTokens: 0.6,
    ...overrides,
  }
}

describe("assertAiConfig", () => {
  it("does not throw for a fully valid production config", () => {
    expect(() => assertAiConfig(validConfig(), "production")).not.toThrow()
  })

  it.each(["development", "test", undefined])(
    "allows a blank openaiApiKey outside production (environment=%s)",
    environment => {
      expect(() => assertAiConfig(validConfig({ openaiApiKey: "" }), environment)).not.toThrow()
    },
  )

  it.each(["", "   "])("throws naming NUXT_OPENAI_API_KEY when the key is %j in production", key => {
    expect(() => assertAiConfig(validConfig({ openaiApiKey: key }), "production")).toThrow(/NUXT_OPENAI_API_KEY/)
  })

  it("throws naming NUXT_AI_PRODUCT_COPY_MODEL when the model is blank, in every environment", () => {
    expect(() => assertAiConfig(validConfig({ aiProductCopyModel: "" }), "production")).toThrow(
      /NUXT_AI_PRODUCT_COPY_MODEL/,
    )
    expect(() => assertAiConfig(validConfig({ aiProductCopyModel: "   " }), "development")).toThrow(
      /NUXT_AI_PRODUCT_COPY_MODEL/,
    )
  })

  const positiveIntegerFields: Array<[keyof AiRuntimeConfig, string]> = [
    ["aiProductCopyQuotaPerHour", "NUXT_AI_PRODUCT_COPY_QUOTA_PER_HOUR"],
    ["aiProductCopyTimeoutMs", "NUXT_AI_PRODUCT_COPY_TIMEOUT_MS"],
    ["aiProductCopyPromptCharLimit", "NUXT_AI_PRODUCT_COPY_PROMPT_CHAR_LIMIT"],
    ["aiProductCopyMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_MAX_OUTPUT_TOKENS"],
    ["aiProductCopyNameMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_NAME_MAX_OUTPUT_TOKENS"],
    ["aiProductCopyShortDescriptionMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_SHORT_DESCRIPTION_MAX_OUTPUT_TOKENS"],
    ["aiProductCopyLongDescriptionMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_LONG_DESCRIPTION_MAX_OUTPUT_TOKENS"],
    ["aiProductCopyFeaturesMaxOutputTokens", "NUXT_AI_PRODUCT_COPY_FEATURES_MAX_OUTPUT_TOKENS"],
  ]

  for (const [field, envVarName] of positiveIntegerFields) {
    describe(`${field}`, () => {
      it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, "50"])(
        `throws naming ${envVarName} for the invalid value %j`,
        value => {
          expect(() => assertAiConfig(validConfig({ [field]: value } as never), "development")).toThrow(
            new RegExp(envVarName),
          )
        },
      )
    })
  }

  const nonNegativeNumberFields: Array<[keyof AiRuntimeConfig, string]> = [
    ["aiProductCopyInputUsdPerMillionTokens", "NUXT_AI_PRODUCT_COPY_INPUT_USD_PER_MILLION_TOKENS"],
    ["aiProductCopyOutputUsdPerMillionTokens", "NUXT_AI_PRODUCT_COPY_OUTPUT_USD_PER_MILLION_TOKENS"],
  ]

  for (const [field, envVarName] of nonNegativeNumberFields) {
    describe(`${field}`, () => {
      it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, "0.5"])(
        `throws naming ${envVarName} for the invalid value %j`,
        value => {
          expect(() => assertAiConfig(validConfig({ [field]: value } as never), "development")).toThrow(
            new RegExp(envVarName),
          )
        },
      )

      it("accepts zero and a fractional positive value", () => {
        expect(() => assertAiConfig(validConfig({ [field]: 0 } as never), "development")).not.toThrow()
        expect(() => assertAiConfig(validConfig({ [field]: 0.25 } as never), "development")).not.toThrow()
      })
    })
  }

  it("never includes the API key value in the thrown message, even when another field is also invalid", () => {
    const secret = "sk-secret-123"
    const config = validConfig({ openaiApiKey: secret, aiProductCopyQuotaPerHour: -1 })

    let caught: Error | undefined
    try {
      assertAiConfig(config, "production")
    } catch (error) {
      caught = error as Error
    }

    expect(caught).toBeInstanceOf(Error)
    expect(caught?.message).not.toContain(secret)
  })
})
