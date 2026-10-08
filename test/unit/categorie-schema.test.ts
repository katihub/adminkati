import { describe, expect, it } from "vitest"
import { categorieSchema } from "../../app/schemas/categorie"

const validRoot = {
  nom: "Informatique",
  slug: "informatique",
  parent_id: null,
  rayon_id: "tech",
}

function messagesFor(input: unknown, field: string) {
  const result = categorieSchema.safeParse(input)

  return (result.error?.issues ?? []).filter(issue => issue.path[0] === field).map(issue => issue.message)
}

describe("categorieSchema", () => {
  it("accepts a root category with its department", () => {
    expect(categorieSchema.safeParse(validRoot).success).toBe(true)
  })

  it("rejects a root category without a department", () => {
    expect(messagesFor({ ...validRoot, rayon_id: null }, "rayon_id")).toContain("validation.required")
  })

  it("accepts a child category without a writable department", () => {
    const result = categorieSchema.safeParse({
      nom: "Ordinateurs portables",
      slug: "ordinateurs-portables",
      parent_id: 12,
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).not.toHaveProperty("rayon_id")
  })

  it("rejects a child category that submits a department instead of inheriting it", () => {
    expect(messagesFor({ ...validRoot, parent_id: 12 }, "rayon_id")).toContain("validation.invalidCategoryDepartment")
  })

  it("accepts exactly 200 characters for both writable names", () => {
    const value = "a".repeat(200)

    expect(categorieSchema.safeParse({ ...validRoot, nom: value, slug: value }).success).toBe(true)
  })

  it("rejects a name or slug that exceeds the backend's 200-character limit", () => {
    const tooLong = "a".repeat(201)

    expect(messagesFor({ ...validRoot, nom: tooLong }, "nom")).toContain("validation.tooLong")
    expect(messagesFor({ ...validRoot, slug: tooLong }, "slug")).toContain("validation.tooLong")
  })
})
