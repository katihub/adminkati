import { describe, expect, it } from "vitest"
import { z } from "zod/v4"
import { toFieldErrorKeys } from "../../app/utils/form-errors"

const schema = z.object({
  name: z.string().min(3, { error: "validation.tooShort" }).regex(/^\d+$/, { error: "validation.numeric" }),
})

function errorFor(input: unknown) {
  const result = schema.safeParse(input)

  if (result.success) throw new Error("expected the fixture schema to reject this input")

  return result.error
}

describe("toFieldErrorKeys", () => {
  it("keeps the first issue reported for a field when a field reports several", () => {
    expect(toFieldErrorKeys(errorFor({ name: "ab" }))).toEqual({ name: "validation.tooShort" })
  })

  it("returns an empty map for an error carrying no issues", () => {
    expect(toFieldErrorKeys(new z.ZodError([]))).toEqual({})
  })

  it("drops form-level issues instead of keying them under an empty string", () => {
    const keys = toFieldErrorKeys(errorFor("not an object"))

    expect(keys).toEqual({})
    expect(Object.keys(keys)).not.toContain("")
  })
})
