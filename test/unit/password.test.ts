import { describe, expect, it } from "vitest"
import { passwordFailure } from "../../server/utils/password"

describe("password update failures", () => {
  it("reads 401 and 403 from Supabase as an expired link, anything else as a refused password", () => {
    expect(passwordFailure(401)).toEqual({ statusCode: 401, reason: "expired_link" })
    expect(passwordFailure(403)).toEqual({ statusCode: 401, reason: "expired_link" })
    expect(passwordFailure(422)).toEqual({ statusCode: 400, reason: "rejected" })
    expect(passwordFailure(undefined)).toEqual({ statusCode: 400, reason: "rejected" })
  })
})
