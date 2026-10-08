import { describe, expect, it } from "vitest"
import { delaiLivraisonPatchSchema, delaiLivraisonSchema } from "../../app/schemas/delai-livraison"

function messagesFor(
  schema: typeof delaiLivraisonSchema | typeof delaiLivraisonPatchSchema,
  input: unknown,
  field: string,
) {
  const result = schema.safeParse(input)

  return (result.error?.issues ?? []).filter(issue => issue.path[0] === field).map(issue => issue.message)
}

const VALID = { min_valeur: 3, max_valeur: null, unite: "jours" }

describe("delaiLivraisonSchema", () => {
  it("accepts a single value with max_valeur null", () => {
    expect(delaiLivraisonSchema.safeParse(VALID).success).toBe(true)
  })

  it("accepts a single value with max_valeur omitted", () => {
    expect(delaiLivraisonSchema.safeParse({ min_valeur: 3, unite: "jours" }).success).toBe(true)
  })

  it("accepts a range and a range where max equals min", () => {
    expect(delaiLivraisonSchema.safeParse({ ...VALID, max_valeur: 5 }).success).toBe(true)
    expect(delaiLivraisonSchema.safeParse({ ...VALID, max_valeur: 3 }).success).toBe(true)
  })

  it("accepts the inclusive boundaries 1 and 999", () => {
    expect(delaiLivraisonSchema.safeParse({ min_valeur: 1, max_valeur: 999, unite: "mois" }).success).toBe(true)
  })

  it("rejects a missing min_valeur as required", () => {
    expect(messagesFor(delaiLivraisonSchema, { unite: "jours" }, "min_valeur")).toContain("validation.required")
  })

  it("rejects a numeric string as required, without coercing it", () => {
    expect(messagesFor(delaiLivraisonSchema, { ...VALID, min_valeur: "5" }, "min_valeur")).toContain(
      "validation.required",
    )
  })

  it.each([0, -1, 1.5, 1000])("rejects min_valeur %s as out of range", value => {
    expect(messagesFor(delaiLivraisonSchema, { ...VALID, min_valeur: value }, "min_valeur")).toContain(
      "validation.outOfRange",
    )
  })

  it.each([0, -2, 2.5, 1000])("rejects max_valeur %s as out of range", value => {
    expect(messagesFor(delaiLivraisonSchema, { ...VALID, min_valeur: 1, max_valeur: value }, "max_valeur")).toContain(
      "validation.outOfRange",
    )
  })

  it("rejects an unknown or missing unit as required", () => {
    expect(messagesFor(delaiLivraisonSchema, { ...VALID, unite: "annees" }, "unite")).toContain("validation.required")
    expect(messagesFor(delaiLivraisonSchema, { min_valeur: 3, max_valeur: null }, "unite")).toContain(
      "validation.required",
    )
  })

  it("rejects max below min on the max_valeur path", () => {
    expect(messagesFor(delaiLivraisonSchema, { ...VALID, min_valeur: 5, max_valeur: 4 }, "max_valeur")).toContain(
      "validation.outOfRange",
    )
  })
})

describe("delaiLivraisonPatchSchema", () => {
  it("accepts an archive-only patch", () => {
    expect(delaiLivraisonPatchSchema.safeParse({ actif: false }).success).toBe(true)
  })

  it("accepts a partial edit of a single field", () => {
    expect(delaiLivraisonPatchSchema.safeParse({ unite: "mois" }).success).toBe(true)
  })

  it("rejects an unknown unit", () => {
    expect(messagesFor(delaiLivraisonPatchSchema, { unite: "annees" }, "unite")).not.toEqual([])
  })

  it("rejects max below min when both are given", () => {
    expect(messagesFor(delaiLivraisonPatchSchema, { min_valeur: 5, max_valeur: 2 }, "max_valeur")).toContain(
      "validation.outOfRange",
    )
  })
})
