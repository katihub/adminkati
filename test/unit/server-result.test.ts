import { afterEach, describe, expect, it, vi } from "vitest"
import { unwrapOrThrow } from "../../server/utils/result"
import { err } from "../../shared/utils/result"

function thrownBy(run: () => unknown): Record<string, unknown> {
  try {
    run()
  } catch (error) {
    return error as Record<string, unknown>
  }
  throw new Error("expected the call to throw")
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("unwrapOrThrow", () => {
  it.each([
    ["validation", 400],
    ["unauthenticated", 401],
    ["forbidden", 403],
    ["not_found", 404],
    ["conflict", 409],
    ["external", 502],
    ["internal", 500],
  ] as const)("maps %s to HTTP %s and exposes only the code, never the cause", (code, statusCode) => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const cause = new Error("SELECT * FROM users WHERE token = 'abc'")

    const thrown = thrownBy(() => unwrapOrThrow(err(code, "errors.some_code", cause)))

    expect(thrown).toMatchObject({ statusCode, statusMessage: "errors.some_code" })
    expect(thrown.data).toEqual({ code })
  })

  it("logs the cause once for unexpected failures and stays quiet for expected ones", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    const cause = new Error("db down")

    thrownBy(() => unwrapOrThrow(err("not_found", "order.not_found", cause)))
    expect(logged).not.toHaveBeenCalled()

    thrownBy(() => unwrapOrThrow(err("internal", "errors.server", cause)))
    expect(logged).toHaveBeenCalledTimes(1)
    expect(logged.mock.calls[0]).toContain(cause)
  })
})
