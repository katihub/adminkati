import { describe, expect, it } from "vitest"
import { stockImportSetupSchema } from "../../app/schemas/stock-import"

describe("stock import setup validation", () => {
  it.each(["reception", "count"])("accepts %s and returns a trimmed shared reason", mode => {
    expect(stockImportSetupSchema.parse({ mode, motif: "  Livraison  " })).toEqual({ mode, motif: "Livraison" })
  })
  it.each(["", "   "])("rejects blank reason %j with the required translation key", motif => {
    const result = stockImportSetupSchema.safeParse({ mode: "count", motif })
    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["motif"], message: "validation.required" })]),
    )
  })
  it("accepts a 200-character reason and rejects 201 with the tooLong key", () => {
    expect(stockImportSetupSchema.safeParse({ mode: "count", motif: "m".repeat(200) }).success).toBe(true)
    const result = stockImportSetupSchema.safeParse({ mode: "count", motif: "m".repeat(201) })
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["motif"], message: "validation.tooLong" })]),
    )
  })
  it("rejects a mode that cannot create a stock movement", () => {
    expect(stockImportSetupSchema.safeParse({ mode: "sale", motif: "Livraison" }).success).toBe(false)
  })
})
