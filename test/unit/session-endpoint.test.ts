import type { H3Event } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../../server/utils/session", () => ({
  readSession: vi.fn(async () => null),
  toPublicSession: vi.fn(),
}))

describe("session endpoint", () => {
  afterEach(() => vi.restoreAllMocks())

  it("writes JSON null with a successful status for an anonymous request", async () => {
    const response = { end: vi.fn(), getHeader: vi.fn(), setHeader: vi.fn(), statusCode: 200 }
    const event = { handled: false, node: { res: response } } as unknown as H3Event
    const { default: handler } = await import("../../server/api/auth/session.get")

    await handler(event)
    await new Promise(resolve => setImmediate(resolve))

    expect(response.statusCode).toBe(200)
    expect(response.end).toHaveBeenCalledWith("null")
  })
})
