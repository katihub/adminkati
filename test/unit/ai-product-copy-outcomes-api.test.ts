import type { H3Event } from "h3"
import { IncomingMessage, ServerResponse } from "node:http"
import { Socket } from "node:net"
import { createEvent } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const boundary = vi.hoisted(() => ({ body: undefined as unknown }))

vi.mock("../../server/utils/api-session", () => ({ ensureFreshSession: vi.fn() }))
vi.mock("../../server/utils/ai/audit", () => ({ writeProductCopyOutcomeAudit: vi.fn() }))
vi.mock("h3", async importOriginal => {
  const actual = await importOriginal<typeof import("h3")>()
  return { ...actual, readBody: vi.fn(async () => boundary.body) }
})

const DIRECTION_SESSION = { accessToken: "fresh-token", user: { userId: "u-1", roles: ["direction"] } }
const VALID_BODY = { requestId: "6ed7502b-5216-4e19-b4f2-d7e37d673f9f", field: "shortDescription", action: "applied" }

function buildEvent(): H3Event {
  const req = new IncomingMessage(new Socket())
  req.url = "/api/ai/products/suggestions/outcomes"
  req.method = "POST"
  req.headers = { "content-type": "application/json" }
  return createEvent(req, new ServerResponse(req))
}

async function freshHandler() {
  vi.resetModules()
  const sessionModule = await import("../../server/utils/api-session")
  const auditModule = await import("../../server/utils/ai/audit")
  const ensureFreshSession = vi.mocked(sessionModule.ensureFreshSession)
  const writeProductCopyOutcomeAudit = vi.mocked(auditModule.writeProductCopyOutcomeAudit)
  ensureFreshSession.mockResolvedValue(DIRECTION_SESSION as never)
  writeProductCopyOutcomeAudit.mockImplementation(() => {})
  const handlerModule = await import("../../server/api/ai/products/suggestions/outcomes.post")

  return {
    handler: handlerModule.default as (event: H3Event) => Promise<{ ok: boolean }>,
    ensureFreshSession,
    writeProductCopyOutcomeAudit,
  }
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe("POST /api/ai/products/suggestions/outcomes", () => {
  it("records only the actor, UUID request id, field, action and timestamp", async () => {
    const mocks = await freshHandler()
    boundary.body = VALID_BODY

    await expect(mocks.handler(buildEvent())).resolves.toEqual({ ok: true })

    expect(mocks.writeProductCopyOutcomeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "u-1",
        requestId: VALID_BODY.requestId,
        field: "shortDescription",
        action: "applied",
        occurredAt: expect.any(Number),
      }),
    )
    expect(JSON.stringify(mocks.writeProductCopyOutcomeAudit.mock.calls[0]?.[0])).not.toContain("fresh-token")
  })

  it.each([
    [{ requestId: "not-a-uuid", field: "shortDescription", action: "applied" }],
    [{ ...VALID_BODY, field: "price" }],
    [{ ...VALID_BODY, action: "saved" }],
    [{ ...VALID_BODY, productId: 42 }],
  ])("rejects malformed or surplus metadata without recording it", async body => {
    const mocks = await freshHandler()
    boundary.body = body

    await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.writeProductCopyOutcomeAudit).not.toHaveBeenCalled()
  })

  it("rejects an unauthenticated or non-direction caller", async () => {
    const mocks = await freshHandler()
    boundary.body = VALID_BODY
    mocks.ensureFreshSession.mockResolvedValueOnce(null)

    await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 401 })
    mocks.ensureFreshSession.mockResolvedValueOnce({
      accessToken: "token",
      user: { userId: "u-2", roles: ["comptoir"] },
    } as never)
    await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.writeProductCopyOutcomeAudit).not.toHaveBeenCalled()
  })
})
