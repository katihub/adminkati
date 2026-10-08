import { describe, expect, it, vi } from "vitest"
import { withRefreshLock } from "../../server/utils/refresh-lock"

describe("withRefreshLock", () => {
  it("runs one refresh for concurrent calls by the same user", async () => {
    const run = vi.fn(async () => "rotated")
    const [first, second] = await Promise.all([withRefreshLock("u1", run), withRefreshLock("u1", run)])

    expect(run).toHaveBeenCalledTimes(1)
    expect(first).toBe("rotated")
    expect(second).toBe("rotated")
  })

  it("keeps different users independent", async () => {
    const run = vi.fn(async () => "rotated")
    await Promise.all([withRefreshLock("u1", run), withRefreshLock("u2", run)])

    expect(run).toHaveBeenCalledTimes(2)
  })

  it("clears a rejected refresh so the next call can retry", async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error("temporary")).mockResolvedValue("recovered")

    const first = withRefreshLock("u1", run)
    const second = withRefreshLock("u1", run)
    await expect(first).rejects.toThrow("temporary")
    await expect(second).rejects.toThrow("temporary")
    await expect(withRefreshLock("u1", run)).resolves.toBe("recovered")
    expect(run).toHaveBeenCalledTimes(2)
  })

  it("runs again after the previous call settles", async () => {
    const run = vi.fn(async () => "rotated")
    await withRefreshLock("u1", run)
    await withRefreshLock("u1", run)

    expect(run).toHaveBeenCalledTimes(2)
  })
})
