import { describe, expect, it } from "vitest"
import { banniereSchema, hrefSchema } from "../../app/schemas/banniere"

const validPayload = {
  emplacement: "principal",
  href: "/categorie/x",
  libelle: "Promo rentree",
  alt: "Chaussures en cuir noires",
  focus: 50,
  active: true,
}

function messagesFor(input: unknown, field: string) {
  const result = banniereSchema.safeParse(input)

  return (result.error?.issues ?? []).filter(issue => issue.path[0] === field).map(issue => issue.message)
}

function hrefMessages(input: string) {
  const result = hrefSchema.safeParse(input)

  return (result.error?.issues ?? []).map(issue => issue.message)
}

describe("hrefSchema", () => {
  it("accepts an internal category path", () => {
    expect(hrefSchema.safeParse("/categorie/x").success).toBe(true)
  })

  it("rejects a protocol-relative path as an open-redirect vector", () => {
    const result = hrefSchema.safeParse("//example.com")

    expect(result.success).toBe(false)
    expect(hrefMessages("//example.com")).toContain("validation.invalidInternalPath")
  })

  it("rejects an absolute external URL", () => {
    expect(hrefMessages("https://evil.com")).toContain("validation.invalidInternalPath")
  })

  it("rejects a path missing its leading slash", () => {
    expect(hrefMessages("no-leading-slash")).toContain("validation.invalidInternalPath")
  })

  it("rejects a 301-character path as too long", () => {
    const href = `/${"a".repeat(300)}`

    expect(href).toHaveLength(301)
    expect(hrefMessages(href)).toContain("validation.tooLong")
  })

  it("accepts a path of exactly 300 characters, the inclusive boundary", () => {
    const href = `/${"a".repeat(299)}`

    expect(href).toHaveLength(300)
    expect(hrefSchema.safeParse(href).success).toBe(true)
  })

  it("accepts a path of exactly 1 character", () => {
    expect(hrefSchema.safeParse("/").success).toBe(true)
  })
})

describe("banniereSchema", () => {
  it("accepts a complete valid payload", () => {
    const result = banniereSchema.safeParse(validPayload)

    expect(result.success).toBe(true)
  })

  describe("href", () => {
    it("rejects a protocol-relative path as an open-redirect vector", () => {
      expect(messagesFor({ ...validPayload, href: "//example.com" }, "href")).toContain(
        "validation.invalidInternalPath",
      )
    })
  })

  describe("libelle", () => {
    it("rejects an empty libelle as required", () => {
      expect(messagesFor({ ...validPayload, libelle: "" }, "libelle")).toContain("validation.required")
    })

    it("rejects an 81-character libelle as too long", () => {
      const libelle = "a".repeat(81)

      expect(messagesFor({ ...validPayload, libelle }, "libelle")).toContain("validation.tooLong")
    })

    it("accepts a libelle of exactly 80 characters, the inclusive boundary", () => {
      const libelle = "a".repeat(80)
      const result = banniereSchema.safeParse({ ...validPayload, libelle })

      expect(result.success).toBe(true)
    })
  })

  describe("alt", () => {
    it("rejects an empty alt as required", () => {
      expect(messagesFor({ ...validPayload, alt: "" }, "alt")[0]).toBe("validation.required")
    })

    it("rejects a 9-character alt as too short", () => {
      const alt = "a".repeat(9)

      expect(messagesFor({ ...validPayload, alt }, "alt")[0]).toBe("validation.tooShort")
    })

    it("accepts an alt of exactly 10 characters, the inclusive floor", () => {
      const alt = "a".repeat(10)
      const result = banniereSchema.safeParse({ ...validPayload, alt })

      expect(result.success).toBe(true)
    })

    it("rejects a 401-character alt as too long", () => {
      const alt = "a".repeat(401)

      expect(messagesFor({ ...validPayload, alt }, "alt")).toContain("validation.tooLong")
    })
  })

  describe("focus", () => {
    it("rejects a negative focus as out of range", () => {
      expect(messagesFor({ ...validPayload, focus: -1 }, "focus")).toContain("validation.outOfRange")
    })

    it("rejects a focus above 100 as out of range", () => {
      expect(messagesFor({ ...validPayload, focus: 101 }, "focus")).toContain("validation.outOfRange")
    })

    it("rejects a fractional focus as out of range", () => {
      expect(messagesFor({ ...validPayload, focus: 50.5 }, "focus")).toContain("validation.outOfRange")
    })

    it("accepts a focus of exactly 0, the inclusive lower boundary", () => {
      const result = banniereSchema.safeParse({ ...validPayload, focus: 0 })

      expect(result.success).toBe(true)
    })

    it("accepts a focus of exactly 100, the inclusive upper boundary", () => {
      const result = banniereSchema.safeParse({ ...validPayload, focus: 100 })

      expect(result.success).toBe(true)
    })

    it("accepts focus being omitted entirely", () => {
      const { focus: _focus, ...rest } = validPayload
      const result = banniereSchema.safeParse(rest)

      expect(result.success).toBe(true)
    })
  })

  describe("emplacement", () => {
    it("accepts both placements of the opening row", () => {
      expect(banniereSchema.safeParse({ ...validPayload, emplacement: "principal" }).success).toBe(true)
      expect(banniereSchema.safeParse({ ...validPayload, emplacement: "promo" }).success).toBe(true)
    })

    it("refuses an unknown or missing placement, as the backend refuses null", () => {
      expect(messagesFor({ ...validPayload, emplacement: "sidebar" }, "emplacement")).toEqual(["validation.required"])
      expect(messagesFor({ ...validPayload, emplacement: null }, "emplacement")).toEqual(["validation.required"])
    })
  })

  describe("active", () => {
    it("accepts active being omitted entirely", () => {
      const { active: _active, ...rest } = validPayload
      const result = banniereSchema.safeParse(rest)

      expect(result.success).toBe(true)
    })
  })
})
