import { describe, expect, it } from "vitest"
import { resolveProductCopyPolicy } from "../../server/utils/ai/product-copy-policy"

const base = {
  maxOutputTokens: 12_000,
  reasoningEffort: "low" as const,
  outputTokenCaps: {
    name: 12_000,
    shortDescription: 12_000,
    longDescription: 12_000,
    features: 12_000,
  },
}

describe("resolveProductCopyPolicy", () => {
  it("uses the highest configured selected-field allowance so one batched schema has enough headroom", () => {
    expect(
      resolveProductCopyPolicy(["name", "longDescription"], {
        ...base,
        outputTokenCaps: { ...base.outputTokenCaps, name: 500, longDescription: 2_000 },
      }),
    ).toEqual({ maxOutputTokens: 2_000, reasoningEffort: "low" })
  })

  it("rejects empty scopes and non-positive configured allowances", () => {
    expect(() => resolveProductCopyPolicy([], base)).toThrow(/field/i)
    expect(() =>
      resolveProductCopyPolicy(["name"], { ...base, outputTokenCaps: { ...base.outputTokenCaps, name: 0 } }),
    ).toThrow(/positive/i)
  })
})
