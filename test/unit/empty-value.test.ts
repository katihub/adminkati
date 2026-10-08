import { describe, expect, it } from "vitest"
import { isEmptyValue } from "../../app/utils/empty-value"

describe("empty value", () => {
  it.each([null, undefined, ""])("treats %j as empty", value => {
    expect(isEmptyValue(value)).toBe(true)
  })

  it.each([0, false, "0", " ", "N/A", [], {}])("keeps %j, a real value", value => {
    expect(isEmptyValue(value)).toBe(false)
  })
})
