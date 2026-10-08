import { describe, expect, it } from "vitest"
import { attempt } from "../../shared/utils/result"

const fail = (cause: unknown) => ({ code: "internal" as const, message: "errors.server", cause })

describe("attempt", () => {
  it("returns Ok with the value when the function succeeds", async () => {
    expect(await attempt(async () => 42, fail)).toEqual({ ok: true, value: 42 })
  })

  it("turns a throw, sync or async, into the caller's Err and keeps the original error as cause", async () => {
    const boom = new Error("boom")
    const expected = { ok: false, error: { code: "internal", message: "errors.server", cause: boom } }

    expect(
      await attempt(async () => {
        throw boom
      }, fail),
    ).toEqual(expected)
    expect(
      await attempt(() => {
        throw boom
      }, fail),
    ).toEqual(expected)
  })
})
