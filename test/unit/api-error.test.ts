import { describe, expect, it } from "vitest"
import { toApiError } from "../../app/utils/api-error"

describe("toApiError", () => {
  it.each([
    [400, "errors.badRequest"],
    [401, "errors.unauthorized"],
    [403, "errors.forbidden"],
    [404, "errors.notFound"],
    [409, "errors.conflict"],
    [413, "errors.tooLarge"],
    [429, "errors.tooManyRequests"],
    [500, "errors.server"],
    [503, "errors.server"],
  ])("maps status %s", (status, headlineKey) => {
    expect(toApiError({ statusCode: status, message: "detail" }).headlineKey).toBe(headlineKey)
  })

  it("maps an unprovisioned admin account to the login-specific message", () => {
    expect(toApiError({ statusCode: 403, data: { reason: "not_team" } }).headlineKey).toBe("auth.login.errors.notTeam")
  })

  it("maps network failures to the unreachable message", () => {
    expect(toApiError(new Error("offline")).headlineKey).toBe("errors.unreachable")
  })

  /**
   * Never a raw backend/Nitro message — `message` here is deliberately never read by
   *  `toApiError` at all, since a developer-facing exception string is not something a
   *  user should see (the requirement this guards: no dev context in an error the user
   *  can see).
   */
  it("never surfaces the raw error message, even when the caller provides one", () => {
    expect(toApiError({ statusCode: 409, message: "Cette caisse est déjà validée." })).not.toHaveProperty("detail")
    expect(toApiError({ statusCode: 403, message: "Forbidden: insufficient_scope at line 42" })).not.toHaveProperty(
      "detail",
    )
  })
})
