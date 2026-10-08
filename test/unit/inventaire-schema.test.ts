import { describe, expect, it } from "vitest"
import { ajustementStockSchema } from "../../app/schemas/inventaire"

function messagesFor(input: unknown, field: string) {
  const result = ajustementStockSchema.safeParse(input)

  return (result.error?.issues ?? []).filter(issue => issue.path[0] === field).map(issue => issue.message)
}

const VALID = { type: "reception", variation: 5, motif: "Livraison fournisseur" }

describe("ajustementStockSchema", () => {
  it("accepts a positive reception", () => {
    expect(ajustementStockSchema.safeParse(VALID).success).toBe(true)
  })

  it("accepts a correction that is negative or positive", () => {
    expect(ajustementStockSchema.safeParse({ ...VALID, type: "correction", variation: -3 }).success).toBe(true)
    expect(ajustementStockSchema.safeParse({ ...VALID, type: "correction", variation: 3 }).success).toBe(true)
  })

  it("rejects an unknown type", () => {
    expect(messagesFor({ ...VALID, type: "vente" }, "type")).not.toEqual([])
  })

  it("rejects a reception with a negative variation as out of range", () => {
    expect(messagesFor({ ...VALID, variation: -2 }, "variation")).toContain("validation.outOfRange")
  })

  it.each(["reception", "correction"])("rejects a zero variation on a %s as out of range", type => {
    expect(messagesFor({ ...VALID, type, variation: 0 }, "variation")).toContain("validation.outOfRange")
  })

  it.each([1.5, -0.5])("rejects the fractional variation %s as out of range", variation => {
    expect(messagesFor({ ...VALID, type: "correction", variation }, "variation")).toContain("validation.outOfRange")
  })

  it("rejects a missing or NaN variation as required", () => {
    expect(messagesFor({ type: "reception", motif: "x" }, "variation")).toContain("validation.required")
    expect(messagesFor({ ...VALID, variation: Number.NaN }, "variation")).toContain("validation.required")
  })

  it("trims the motif in its output", () => {
    expect(ajustementStockSchema.safeParse({ ...VALID, motif: "  Recomptage  " }).data?.motif).toBe("Recomptage")
  })

  it.each(["", "   "])("rejects the blank motif %j as required", motif => {
    expect(messagesFor({ ...VALID, motif }, "motif")).toContain("validation.required")
  })

  it("accepts a motif of exactly 200 characters and rejects 201 as too long", () => {
    expect(ajustementStockSchema.safeParse({ ...VALID, motif: "m".repeat(200) }).success).toBe(true)
    expect(messagesFor({ ...VALID, motif: "m".repeat(201) }, "motif")).toContain("validation.tooLong")
  })
})
