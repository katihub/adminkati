import { describe, expect, it, vi } from "vitest"
import { createAuthFailureHandler } from "../../app/utils/auth-failure"

function createDependencies(probe: () => Promise<{ type?: string }>) {
  return {
    queryClient: { clear: vi.fn() },
    logout: vi.fn(async () => undefined),
    probe,
    redirect: vi.fn(async () => undefined),
  }
}

describe("auth failure handling", () => {
  it("shares one identity probe across concurrent forbidden failures", async () => {
    const probe = vi.fn(async () => ({ type: "equipe" }))
    const dependencies = createDependencies(probe)
    const { handle } = createAuthFailureHandler(dependencies)

    await Promise.all([handle({ statusCode: 403 }), handle({ statusCode: 403 })])

    expect(probe).toHaveBeenCalledTimes(1)
    expect(dependencies.logout).not.toHaveBeenCalled()
    expect(dependencies.redirect).not.toHaveBeenCalled()
  })

  it("logs out with a deactivated reason when the identity probe is forbidden", async () => {
    const probeError = Object.assign(new Error("forbidden"), { statusCode: 403 })
    const dependencies = createDependencies(async () => {
      throw probeError
    })
    const { handle } = createAuthFailureHandler(dependencies)

    await handle({ statusCode: 403 })

    expect(dependencies.logout).toHaveBeenCalledOnce()
    expect(dependencies.queryClient.clear).toHaveBeenCalledOnce()
    expect(dependencies.redirect).toHaveBeenCalledWith("deactivated")
  })
})
