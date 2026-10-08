import { describe, expect, it } from "vitest"
import { produitCreateSchema, produitUpdateSchema } from "../../app/schemas/produit"

function messagesFor(input: unknown, field: string) {
  const result = produitCreateSchema.safeParse(input)

  return (result.error?.issues ?? []).filter(issue => issue.path[0] === field).map(issue => issue.message)
}

describe("produitCreateSchema", () => {
  it("accepts a minimal payload carrying only the required nom and prix", () => {
    const result = produitCreateSchema.safeParse({ nom: "Savon noir", prix: 2500 })

    expect(result.success).toBe(true)
  })

  it("rejects a prix above the billion-franc ceiling as out of range", () => {
    expect(messagesFor({ nom: "Savon noir", prix: 1_000_000_001 }, "prix")).toContain("validation.outOfRange")
  })

  it("rejects a negative prix as out of range", () => {
    expect(messagesFor({ nom: "Savon noir", prix: -1 }, "prix")).toContain("validation.outOfRange")
  })

  it("rejects a nom past the 300-character ceiling as too long", () => {
    const nom = "a".repeat(301)

    expect(messagesFor({ nom, prix: 2500 }, "nom")).toContain("validation.tooLong")
  })

  it("accepts a nom of exactly 300 characters, the inclusive boundary", () => {
    const nom = "a".repeat(300)
    const result = produitCreateSchema.safeParse({ nom, prix: 2500 })

    expect(result.success).toBe(true)
  })

  it("rejects a 13th caracteristique as too large while accepting exactly 12", () => {
    const douze = Array.from({ length: 12 }, (_, i) => `trait-${i}`)
    const treize = [...douze, "trait-13"]

    const okResult = produitCreateSchema.safeParse({ nom: "Savon noir", prix: 2500, caracteristiques: douze })
    const tropResult = produitCreateSchema.safeParse({ nom: "Savon noir", prix: 2500, caracteristiques: treize })

    expect(okResult.success).toBe(true)
    expect(messagesFor({ nom: "Savon noir", prix: 2500, caracteristiques: treize }, "caracteristiques")).toContain(
      "validation.tooLarge",
    )
    expect(tropResult.success).toBe(false)
  })

  it("rejects an image whose url is not a syntactically valid URL", () => {
    const result = produitCreateSchema.safeParse({
      nom: "Savon noir",
      prix: 2500,
      images: [{ url: "not-a-url" }],
    })

    expect(result.success).toBe(false)

    const issues = result.error?.issues ?? []
    expect(issues.some(issue => issue.message === "validation.invalidUrl")).toBe(true)
  })

  it("accepts explicit null for the nullable prix_reference and remise_pct fields", () => {
    const result = produitCreateSchema.safeParse({
      nom: "Savon noir",
      prix: 2500,
      prix_reference: null,
      remise_pct: null,
    })

    expect(result.success).toBe(true)
  })

  it("rejects a 21st secondary category as too large while accepting exactly 20", () => {
    const vingt = Array.from({ length: 20 }, (_, i) => i + 1)
    const vingtEtUn = [...vingt, 21]

    const okResult = produitCreateSchema.safeParse({ nom: "Savon noir", prix: 2500, categories_ids: vingt })

    expect(okResult.success).toBe(true)
    expect(messagesFor({ nom: "Savon noir", prix: 2500, categories_ids: vingtEtUn }, "categories_ids")).toContain(
      "validation.tooLarge",
    )
  })

  it("rejects an image alt past the 300-character ceiling as too long", () => {
    const alt = "a".repeat(301)
    const result = produitCreateSchema.safeParse({
      nom: "Savon noir",
      prix: 2500,
      images: [{ url: "https://example.com/image.jpg", alt }],
    })

    expect(result.success).toBe(false)
  })

  it("rejects a fractional remise_pct as out of range", () => {
    expect(messagesFor({ nom: "Savon noir", prix: 2500, remise_pct: 12.5 }, "remise_pct")).toContain(
      "validation.outOfRange",
    )
  })

  it("rejects a slug past the 200-character ceiling as too long", () => {
    const slug = "a".repeat(201)

    expect(messagesFor({ nom: "Savon noir", prix: 2500, slug }, "slug")).toContain("validation.tooLong")
  })

  it("accepts a 500-character description and explicit null, rejecting 501 characters as too long", () => {
    const description = "d".repeat(500)
    const okResult = produitCreateSchema.safeParse({ nom: "Savon noir", prix: 2500, description })
    const nullResult = produitCreateSchema.safeParse({ nom: "Savon noir", prix: 2500, description: null })

    expect(okResult.success).toBe(true)
    expect(okResult.data?.description).toBe(description)
    expect(nullResult.success).toBe(true)
    expect(nullResult.data?.description).toBeNull()
    expect(messagesFor({ nom: "Savon noir", prix: 2500, description: "d".repeat(501) }, "description")).toContain(
      "validation.tooLong",
    )
  })

  it("accepts delai_livraison_id as null, omitted, or a positive integer", () => {
    const base = { nom: "Savon noir", prix: 2500 }

    expect(produitCreateSchema.safeParse({ ...base, delai_livraison_id: null }).success).toBe(true)
    expect(produitCreateSchema.safeParse(base).success).toBe(true)
    expect(produitCreateSchema.safeParse({ ...base, delai_livraison_id: 7 }).data?.delai_livraison_id).toBe(7)
  })

  it.each([0, -1, 1.5, "3"])("rejects delai_livraison_id %j", value => {
    expect(messagesFor({ nom: "Savon noir", prix: 2500, delai_livraison_id: value }, "delai_livraison_id")).not.toEqual(
      [],
    )
  })
})

describe("produitCreateSchema stock fields", () => {
  const base = { nom: "Savon noir", prix: 2500 }

  it("accepts quantite_stock_initiale across the inclusive 0..2_000_000_000 range or omitted", () => {
    expect(produitCreateSchema.safeParse(base).success).toBe(true)
    expect(produitCreateSchema.safeParse({ ...base, quantite_stock_initiale: 0 }).success).toBe(true)
    expect(
      produitCreateSchema.safeParse({ ...base, quantite_stock_initiale: 2_000_000_000 }).data?.quantite_stock_initiale,
    ).toBe(2_000_000_000)
  })

  it.each([-1, 1.5, 2_000_000_001])("rejects quantite_stock_initiale %s as out of range", value => {
    expect(messagesFor({ ...base, quantite_stock_initiale: value }, "quantite_stock_initiale")).toContain(
      "validation.outOfRange",
    )
  })

  it("no longer accepts en_stock", () => {
    expect(produitCreateSchema.safeParse({ ...base, en_stock: true }).success).toBe(false)
  })

  it("accepts a status chosen at creation, and rejects anything that is not a decision", () => {
    expect(produitCreateSchema.safeParse({ ...base, disponibilite_forcee: "rupture" }).success).toBe(true)
    expect(produitCreateSchema.safeParse({ ...base, disponibilite_forcee: "en_stock" }).success).toBe(true)
    expect(produitCreateSchema.safeParse({ ...base, disponibilite_forcee: "reapprovisionnement" }).success).toBe(false)
  })
})

describe("produitUpdateSchema", () => {
  const base = { nom: "Savon noir", prix: 2500 }

  it("accepts the shared product fields", () => {
    expect(produitUpdateSchema.safeParse({ ...base, description: "court", fiche_technique: "long" }).success).toBe(true)
  })

  it("rejects quantite_stock_initiale, since stock is only changed through movements", () => {
    expect(produitUpdateSchema.safeParse({ ...base, quantite_stock_initiale: 5 }).success).toBe(false)
  })

  it("rejects disponibilite_forcee, which has its own endpoint", () => {
    expect(produitUpdateSchema.safeParse({ ...base, disponibilite_forcee: "rupture" }).success).toBe(false)
  })

  it("rejects en_stock", () => {
    expect(produitUpdateSchema.safeParse({ ...base, en_stock: false }).success).toBe(false)
  })
})

describe.each([
  ["produitCreateSchema", produitCreateSchema],
  ["produitUpdateSchema", produitUpdateSchema],
])("%s fiche_technique", (_name, schema) => {
  const base = { nom: "Savon noir", prix: 2500 }

  it("accepts omission and explicit null", () => {
    expect(schema.safeParse(base).success).toBe(true)
    expect(schema.safeParse({ ...base, fiche_technique: null }).data?.fiche_technique).toBeNull()
  })

  it("trims the text like description", () => {
    expect(schema.safeParse({ ...base, fiche_technique: "  détails  " }).data?.fiche_technique).toBe("détails")
  })

  it("accepts exactly 20000 characters and rejects 20001 as too long", () => {
    const at = schema.safeParse({ ...base, fiche_technique: "f".repeat(20_000) })
    const over = schema.safeParse({ ...base, fiche_technique: "f".repeat(20_001) })
    const messages = (over.error?.issues ?? []).filter(i => i.path[0] === "fiche_technique").map(i => i.message)

    expect(at.success).toBe(true)
    expect(messages).toContain("validation.tooLong")
  })
})
