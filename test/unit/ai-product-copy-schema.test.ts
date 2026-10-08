import type { ProductCopyDraft } from "../../app/types/ai/product-copy"
import { describe, expect, it } from "vitest"
import { productCopyRequestSchema, productCopySuggestionSchema } from "../../app/schemas/ai-product-copy"
import {
  createProductCopyFingerprint,
  hasEnoughProductContext,
  measureDraftText,
  parseProductCopyOutput,
  toProductCopyDraftSource,
} from "../../app/utils/ai-product-copy"

function draft(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Savon noir",
    brand: null,
    department: null,
    primaryCategory: null,
    secondaryCategories: [],
    price: null,
    existingShortDescription: "",
    existingLongDescription: "",
    existingFeatures: [],
    ...overrides,
  }
}

describe("productCopyRequestSchema", () => {
  it("accepts a minimal scoped new-product request without a productId", () => {
    const result = productCopyRequestSchema.safeParse({
      language: "fr",
      fields: ["shortDescription"],
      imageProfile: "all-auto",
      draft: draft(),
    })

    expect(result.success).toBe(true)
  })

  it("normalises a field selection into canonical display order", () => {
    const result = productCopyRequestSchema.safeParse({
      language: "en",
      fields: ["features", "name", "shortDescription"],
      imageProfile: "all-auto",
      draft: draft(),
    })

    expect(result.success && result.data.fields).toEqual(["name", "shortDescription", "features"])
  })

  it.each([
    [[], "empty selection"],
    [["name", "name"], "duplicate field"],
    [["unknown"], "unknown field"],
  ])("rejects a %s", fields => {
    expect(
      productCopyRequestSchema.safeParse({ language: "fr", fields, imageProfile: "all-auto", draft: draft() }).success,
    ).toBe(false)
  })

  it.each(["de", "", "FR", undefined])("rejects language %j", language => {
    const input: Record<string, unknown> = { draft: draft() }
    if (language !== undefined) input.language = language

    expect(productCopyRequestSchema.safeParse(input).success).toBe(false)
  })

  it.each([0, -1, 1.5, "7"])("rejects a productId of %j", productId => {
    expect(productCopyRequestSchema.safeParse({ language: "fr", productId, draft: draft() }).success).toBe(false)
  })

  it("rejects an unknown top-level key", () => {
    const result = productCopyRequestSchema.safeParse({ language: "fr", draft: draft(), extra: "nope" })

    expect(result.success).toBe(false)
  })

  it.each(["url_source", "imageUrl", "images", "pdf"])("rejects the asset/source field %s inside draft", key => {
    const result = productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ [key]: "anything" }) })

    expect(result.success).toBe(false)
  })

  it.each(["", "   "])("rejects a blank draft name %j", name => {
    expect(productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ name }) }).success).toBe(false)
  })

  it("trims the draft name in the parsed output", () => {
    const result = productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ name: "  Savon noir  " }) })

    expect(result.success).toBe(true)
    expect(result.data?.draft.name).toBe("Savon noir")
  })

  it("rejects a draft name past the 300-character ceiling while accepting exactly 300", () => {
    const at = productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ name: "a".repeat(300) }) })
    const over = productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ name: "a".repeat(301) }) })

    expect(at.success).toBe(true)
    expect(over.success).toBe(false)
  })

  it("rejects a brand past the 120-character ceiling while accepting exactly 120", () => {
    const at = productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ brand: "b".repeat(120) }) })
    const over = productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ brand: "b".repeat(121) }) })

    expect(at.success).toBe(true)
    expect(over.success).toBe(false)
  })

  it("rejects a primaryCategory past the 300-character ceiling while accepting exactly 300", () => {
    const at = productCopyRequestSchema.safeParse({
      language: "fr",
      draft: draft({ primaryCategory: "c".repeat(300) }),
    })
    const over = productCopyRequestSchema.safeParse({
      language: "fr",
      draft: draft({ primaryCategory: "c".repeat(301) }),
    })

    expect(at.success).toBe(true)
    expect(over.success).toBe(false)
  })

  it("accepts exactly 20 secondaryCategories and rejects a 21st", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `cat-${i}`)
    const twentyOne = [...twenty, "cat-20"]

    expect(
      productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ secondaryCategories: twenty }) }).success,
    ).toBe(true)
    expect(
      productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ secondaryCategories: twentyOne }) }).success,
    ).toBe(false)
  })

  it("accepts price as null, zero, or the one-billion ceiling, rejecting one above it", () => {
    expect(productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ price: null }) }).success).toBe(true)
    expect(productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ price: 0 }) }).success).toBe(true)
    expect(productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ price: 1_000_000_000 }) }).success).toBe(
      true,
    )
    expect(productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ price: 1_000_000_001 }) }).success).toBe(
      false,
    )
  })

  it("rejects a fractional price", () => {
    expect(productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ price: 10.5 }) }).success).toBe(false)
  })

  it("accepts an empty existingShortDescription and rejects one past the 500-character ceiling", () => {
    const at = productCopyRequestSchema.safeParse({
      language: "fr",
      draft: draft({ existingShortDescription: "s".repeat(500) }),
    })
    const over = productCopyRequestSchema.safeParse({
      language: "fr",
      draft: draft({ existingShortDescription: "s".repeat(501) }),
    })

    expect(
      productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ existingShortDescription: "" }) }).success,
    ).toBe(true)
    expect(at.success).toBe(true)
    expect(over.success).toBe(false)
  })

  it("accepts an empty existingLongDescription and rejects one past the 20000-character ceiling", () => {
    const at = productCopyRequestSchema.safeParse({
      language: "fr",
      draft: draft({ existingLongDescription: "l".repeat(20_000) }),
    })
    const over = productCopyRequestSchema.safeParse({
      language: "fr",
      draft: draft({ existingLongDescription: "l".repeat(20_001) }),
    })

    expect(
      productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ existingLongDescription: "" }) }).success,
    ).toBe(true)
    expect(at.success).toBe(true)
    expect(over.success).toBe(false)
  })

  it("accepts exactly 12 existingFeatures and rejects a 13th", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `feature-${i}`)
    const thirteen = [...twelve, "feature-12"]

    expect(
      productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ existingFeatures: twelve }) }).success,
    ).toBe(true)
    expect(
      productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ existingFeatures: thirteen }) }).success,
    ).toBe(false)
  })

  it("rejects a blank existingFeatures entry and one past the 500-character ceiling", () => {
    expect(
      productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ existingFeatures: ["   "] }) }).success,
    ).toBe(false)
    expect(
      productCopyRequestSchema.safeParse({ language: "fr", draft: draft({ existingFeatures: ["f".repeat(501)] }) })
        .success,
    ).toBe(false)
  })
})

describe("productCopySuggestionSchema", () => {
  function suggestion(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      name: "Savon noir",
      shortDescription: "Un savon artisanal.",
      longDescription: "Un savon artisanal fabriqué à la main.",
      features: ["100% naturel"],
      ...overrides,
    }
  }

  it("accepts name/shortDescription/longDescription exactly at their ceilings and rejects one char over", () => {
    expect(productCopySuggestionSchema.safeParse(suggestion({ name: "n".repeat(300) })).success).toBe(true)
    expect(productCopySuggestionSchema.safeParse(suggestion({ name: "n".repeat(301) })).success).toBe(false)
    expect(productCopySuggestionSchema.safeParse(suggestion({ shortDescription: "s".repeat(500) })).success).toBe(true)
    expect(productCopySuggestionSchema.safeParse(suggestion({ shortDescription: "s".repeat(501) })).success).toBe(false)
    expect(productCopySuggestionSchema.safeParse(suggestion({ longDescription: "l".repeat(20_000) })).success).toBe(
      true,
    )
    expect(productCopySuggestionSchema.safeParse(suggestion({ longDescription: "l".repeat(20_001) })).success).toBe(
      false,
    )
  })

  it("accepts an empty features array and exactly 12 entries, rejecting a 13th", () => {
    expect(productCopySuggestionSchema.safeParse(suggestion({ features: [] })).success).toBe(true)
    const twelve = Array.from({ length: 12 }, (_, i) => `feature-${i}`)
    const thirteen = [...twelve, "feature-12"]

    expect(productCopySuggestionSchema.safeParse(suggestion({ features: twelve })).success).toBe(true)
    expect(productCopySuggestionSchema.safeParse(suggestion({ features: thirteen })).success).toBe(false)
  })

  it("rejects a blank feature entry", () => {
    expect(productCopySuggestionSchema.safeParse(suggestion({ features: ["   "] })).success).toBe(false)
  })
})

describe("hasEnoughProductContext", () => {
  it("is false for a name alone with no other signal", () => {
    expect(hasEnoughProductContext(draft() as never, false)).toBe(false)
  })

  it("is true when the name is accompanied by a brand", () => {
    expect(hasEnoughProductContext(draft({ brand: "Dove" }) as never, false, ["name"])).toBe(true)
  })

  it("requires a descriptive fact before a description or feature is generated", () => {
    const identityOnly = draft({ brand: "Dove" }) as never

    expect(hasEnoughProductContext(identityOnly, false, ["shortDescription"])).toBe(false)
    expect(hasEnoughProductContext(identityOnly, false, ["features"])).toBe(false)
    expect(
      hasEnoughProductContext(draft({ brand: "Dove", existingFeatures: ["Fabriqué à froid"] }) as never, false, [
        "features",
      ]),
    ).toBe(true)
  })

  it("does not allow a descriptive fact to replace the required brand or primary category anchor", () => {
    expect(
      hasEnoughProductContext(draft({ existingShortDescription: "Savon artisanal." }) as never, false, [
        "shortDescription",
      ]),
    ).toBe(false)
  })

  it("is false when the name is only 2 characters even with every other signal present", () => {
    expect(
      hasEnoughProductContext(
        draft({
          name: "ab",
          brand: "Dove",
          primaryCategory: "Hygiène",
          existingShortDescription: "x",
          existingLongDescription: "y",
          existingFeatures: ["f"],
        }) as never,
        true,
      ),
    ).toBe(false)
  })

  it("is false when the only signal is department", () => {
    expect(hasEnoughProductContext(draft({ department: "Beauté" }) as never, false)).toBe(false)
  })

  it("is false when the only signal is secondaryCategories", () => {
    expect(hasEnoughProductContext(draft({ secondaryCategories: ["Savons"] }) as never, false)).toBe(false)
  })

  it("is false when an existing product has only a name and image lookup identity", () => {
    expect(hasEnoughProductContext(draft() as never, true)).toBe(false)
  })
})

describe("toProductCopyDraftSource", () => {
  const taxonomy = {
    departments: [{ slug: "informatique", nom: "Informatique" }],
    categories: [
      { id: 1, nom: "Casques" },
      { id: 2, nom: "Chargeurs" },
    ],
  }

  it("replaces taxonomy ids and slugs with the labels the model can read", () => {
    const source = toProductCopyDraftSource(
      {
        name: "Casque X",
        brand: "Anker",
        departmentSlug: "informatique",
        primaryCategoryId: 1,
        secondaryCategoryIds: [2],
        price: 5000,
        shortDescription: "Confortable.",
        longDescription: "Description.",
        features: ["Bluetooth"],
      },
      taxonomy,
    )

    expect(source).toEqual({
      name: "Casque X",
      brand: "Anker",
      department: "Informatique",
      primaryCategory: "Casques",
      secondaryCategories: ["Chargeurs"],
      price: 5000,
      shortDescription: "Confortable.",
      longDescription: "Description.",
      features: ["Bluetooth"],
    })
  })

  it("resolves unknown ids or a missing department to null or an empty list instead of leaking ids", () => {
    const source = toProductCopyDraftSource(
      {
        name: "Casque X",
        brand: null,
        departmentSlug: "inconnu",
        primaryCategoryId: 99,
        secondaryCategoryIds: [98],
        price: null,
        shortDescription: "",
        longDescription: "",
        features: [],
      },
      taxonomy,
    )

    expect(source.department).toBeNull()
    expect(source.primaryCategory).toBeNull()
    expect(source.secondaryCategories).toEqual([])
  })
})

describe("measureDraftText", () => {
  it("sums name, brand and feature lengths for a worked example of 10 characters", () => {
    const total = measureDraftText(draft({ name: "abc", brand: "de", existingFeatures: ["fghij"] }) as never)

    expect(total).toBe(10)
  })

  it("counts secondaryCategories and existing descriptions but never price", () => {
    const total = measureDraftText(
      draft({
        name: "ab",
        secondaryCategories: ["cd", "ef"],
        existingShortDescription: "ghi",
        existingLongDescription: "j",
        price: 999_999_999,
      }) as never,
    )

    expect(total).toBe(10)
  })

  it("counts null brand, department and primaryCategory as zero", () => {
    expect(measureDraftText(draft({ name: "abcde" }) as never)).toBe(5)
  })
})

describe("parseProductCopyOutput", () => {
  it("accepts exactly the selected fields and rejects omitted or extra fields", () => {
    const fields = ["shortDescription"] as const

    expect(parseProductCopyOutput(JSON.stringify({ shortDescription: "Texte concis." }), [...fields])).toEqual({
      shortDescription: "Texte concis.",
    })
    expect(parseProductCopyOutput(JSON.stringify({}), [...fields])).toBeNull()
    expect(
      parseProductCopyOutput(JSON.stringify({ shortDescription: "Texte concis.", name: "Extra" }), [...fields]),
    ).toBeNull()
  })
  it("returns null for invalid JSON", () => {
    expect(parseProductCopyOutput("{not json")).toBeNull()
  })

  it.each(['["a","b"]', '"just a string"', "null"])("returns null when the JSON root is not an object: %s", text => {
    expect(parseProductCopyOutput(text)).toBeNull()
  })

  it("returns null when a required field is missing", () => {
    const text = JSON.stringify({ name: "N", shortDescription: "S", longDescription: "L" })

    expect(parseProductCopyOutput(text)).toBeNull()
  })

  it("returns null when a field has the wrong type", () => {
    const text = JSON.stringify({ name: "N", shortDescription: "S", longDescription: "L", features: "not-array" })

    expect(parseProductCopyOutput(text)).toBeNull()
  })

  it("returns null when an extra key is present", () => {
    const text = JSON.stringify({
      name: "N",
      shortDescription: "S",
      longDescription: "L",
      features: [],
      extra: "nope",
    })

    expect(parseProductCopyOutput(text)).toBeNull()
  })

  it("returns null when a field exceeds its cap after normalisation", () => {
    const text = JSON.stringify({
      name: "n".repeat(301),
      shortDescription: "S",
      longDescription: "L",
      features: [],
    })

    expect(parseProductCopyOutput(text)).toBeNull()
  })

  it("returns null when name is blank after trimming", () => {
    const text = JSON.stringify({ name: "   ", shortDescription: "S", longDescription: "L", features: [] })

    expect(parseProductCopyOutput(text)).toBeNull()
  })

  it("trims whitespace, converts CRLF to LF and strips stray control characters from every field", () => {
    const text = JSON.stringify({
      name: "  Savon noir  ",
      shortDescription: "Ligne 1\r\nLigne 2",
      longDescription: "Texte\u0007 propre",
      features: ["  Doux  "],
    })

    const result = parseProductCopyOutput(text)

    expect(result).toEqual({
      name: "Savon noir",
      shortDescription: "Ligne 1\nLigne 2",
      longDescription: "Texte propre",
      features: ["Doux"],
    })
  })

  it("drops blank and case-insensitive duplicate features, keeping the first occurrence's casing", () => {
    const text = JSON.stringify({
      name: "Savon noir",
      shortDescription: "S",
      longDescription: "L",
      features: ["Doux", "  ", "DOUX", "Naturel"],
    })

    const result = parseProductCopyOutput(text)

    expect(result?.features).toEqual(["Doux", "Naturel"])
  })

  it("accepts 13 raw features with 2 duplicate/blank entries once normalisation brings the count to 12 or fewer", () => {
    const raw = [...Array.from({ length: 11 }, (_, i) => `feature-${i}`), "feature-0", "  "]
    const text = JSON.stringify({ name: "Savon noir", shortDescription: "S", longDescription: "L", features: raw })

    const result = parseProductCopyOutput(text)

    expect(result).not.toBeNull()
    expect(result?.features.length).toBeLessThanOrEqual(12)
  })

  it("rejects 13 distinct features that remain 13 after normalisation", () => {
    const raw = Array.from({ length: 13 }, (_, i) => `feature-${i}`)
    const text = JSON.stringify({ name: "Savon noir", shortDescription: "S", longDescription: "L", features: raw })

    expect(parseProductCopyOutput(text)).toBeNull()
  })
})

describe("createProductCopyFingerprint", () => {
  it("returns the same digest for canonically equivalent scope and a different digest when the local image signature changes", async () => {
    const base = {
      draft: draft({ brand: "Dove", existingShortDescription: "Savon artisanal." }) as ProductCopyDraft,
      language: "fr" as const,
      target: { kind: "product" as const, id: 42 },
      imageProfile: "all-auto" as const,
    }

    const first = await createProductCopyFingerprint({
      ...base,
      fields: ["features", "shortDescription"],
      imageSignature: "a",
    })
    const same = await createProductCopyFingerprint({
      ...base,
      fields: ["shortDescription", "features"],
      imageSignature: "a",
    })
    const reorderedDraft = {
      existingFeatures: base.draft.existingFeatures,
      existingLongDescription: base.draft.existingLongDescription,
      existingShortDescription: base.draft.existingShortDescription,
      price: base.draft.price,
      secondaryCategories: base.draft.secondaryCategories,
      primaryCategory: base.draft.primaryCategory,
      department: base.draft.department,
      brand: base.draft.brand,
      name: base.draft.name,
    }
    const reordered = await createProductCopyFingerprint({
      ...base,
      draft: reorderedDraft,
      fields: ["shortDescription", "features"],
      imageSignature: "a",
    })
    const changed = await createProductCopyFingerprint({
      ...base,
      fields: ["shortDescription", "features"],
      imageSignature: "b",
    })

    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(same).toBe(first)
    expect(reordered).toBe(first)
    expect(changed).not.toBe(first)
  })
})
