import { describe, expect, it } from "vitest"
import { toAppError } from "../../app/utils/app-error"

describe("toAppError", () => {
  it("reads the category and the message code our own server sent", () => {
    const fetchError = {
      statusCode: 404,
      data: { statusCode: 404, statusMessage: "order.not_found", data: { code: "not_found" } },
    }

    expect(toAppError(fetchError)).toMatchObject({ code: "not_found", message: "order.not_found" })
  })

  it("falls back on the status for a proxied backend error and never surfaces its prose as the message", () => {
    const proxied = { statusCode: 401, data: { statusCode: 401, statusMessage: "Session expirée, reconnectez-vous" } }

    expect(toAppError(proxied)).toMatchObject({ code: "unauthenticated", message: "errors.unauthorized" })
  })

  it.each([
    ["a network failure", new TypeError("fetch failed: ECONNREFUSED 10.0.0.5:3000")],
    ["a category we do not know", { statusCode: 500, data: { data: { code: "toString" } } }],
    ["a non-object", "boom"],
  ])("returns internal with a generic message and the original as cause for %s", (_label, cause) => {
    const error = toAppError(cause)

    expect(error.code).toBe("internal")
    expect(error.message).toBe("errors.server")
    expect(error.cause).toBe(cause)
  })
})
