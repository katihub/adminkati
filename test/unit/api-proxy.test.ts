import type { H3Event } from "h3"
import { Buffer } from "node:buffer"
import { IncomingMessage, ServerResponse } from "node:http"
import { Socket } from "node:net"
import { createEvent } from "h3"
import { beforeEach, describe, expect, it, vi } from "vitest"
import handler from "../../server/api/v1/[...path]"

const boundary = vi.hoisted(() => ({
  body: undefined as Buffer<ArrayBufferLike> | undefined,
  sendProxy: vi.fn(),
}))

vi.mock("../../server/utils/api-session", () => ({
  ensureFreshSession: vi.fn(async () => ({ accessToken: "fresh-token" })),
}))

vi.mock("h3", async importOriginal => {
  const actual = await importOriginal<typeof import("h3")>()
  return {
    ...actual,
    readRawBody: vi.fn(async () => boundary.body),
    sendProxy: boundary.sendProxy,
  }
})

function request(
  path: string,
  method: string,
  body: Buffer,
  contentType = "image/png",
  search = "",
  extraHeaders: Record<string, string> = {},
): H3Event {
  const req = new IncomingMessage(new Socket())
  req.url = `/api/v1/${path}${search}`
  req.method = method
  req.headers = { "content-type": contentType, "user-agent": "test-agent", ...extraHeaders }
  const event = createEvent(req, new ServerResponse(req))
  event.context.params = { path }
  boundary.body = body
  return event
}

describe("admin API BFF boundary", () => {
  beforeEach(() => {
    boundary.sendProxy.mockReset()
    boundary.sendProxy.mockResolvedValue({ proxied: true })
    vi.stubGlobal("useRuntimeConfig", () => ({ apiBaseUrl: "https://backend.example" }))
  })

  /* The backend throttled every operator as this server's single address: 20 parallel calls
     from one product page came back as 11 × 429 ("the cost history is unavailable"). The
     shared secret lets the backend recognise this server; it must reach the backend, and no
     visitor address may be declared alongside it, or the backend would count one again. */
  it("identifies this server to the backend rate limiter when the shared secret is configured", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ apiBaseUrl: "https://backend.example", backendSharedSecret: "partage" }))
    await handler(request("catalogue/administration/produits/42/couts", "GET", Buffer.alloc(0)))

    const headers = boundary.sendProxy.mock.calls[0]![2].fetchOptions.headers as Record<string, string>
    expect(headers["x-secret-service"]).toBe("partage")
    expect(headers).not.toHaveProperty("x-visiteur-ip")
  })

  it("sends no secret header when none is configured", async () => {
    await handler(request("catalogue/administration/produits/42/couts", "GET", Buffer.alloc(0)))

    const headers = boundary.sendProxy.mock.calls[0]![2].fetchOptions.headers as Record<string, string>
    expect(headers).not.toHaveProperty("x-secret-service")
  })

  it("forwards the query string so list filters and paging reach the backend", async () => {
    await handler(
      request("catalogue/administration/produits", "GET", Buffer.alloc(0), "application/json", "?stock=rupture&page=2"),
    )

    expect(boundary.sendProxy.mock.calls[0]![1]).toBe(
      "https://backend.example/v1/catalogue/administration/produits?stock=rupture&page=2",
    )
  })

  it("forwards a raw binary body and allowlisted metadata to the backend", async () => {
    const body = Buffer.from([0, 1, 127, 255])
    const result = await handler(request("catalogue/administration/produits/42/images", "POST", body))

    expect(result).toEqual({ proxied: true })
    expect(boundary.sendProxy).toHaveBeenCalledWith(
      expect.anything(),
      "https://backend.example/v1/catalogue/administration/produits/42/images",
      expect.objectContaining({
        fetchOptions: expect.objectContaining({
          method: "POST",
          body,
          headers: expect.objectContaining({
            authorization: "Bearer fresh-token",
            "content-type": "image/png",
            "user-agent": "test-agent",
          }),
        }),
      }),
    )
  })

  it("rejects a body over five megabytes before proxying it", async () => {
    const body = Buffer.alloc(5_000_001)

    await expect(handler(request("catalogue/administration/produits/42/images", "POST", body))).rejects.toMatchObject({
      statusCode: 413,
    })
    expect(boundary.sendProxy).not.toHaveBeenCalled()
  })

  it("accepts a raw body of exactly five megabytes", async () => {
    const body = Buffer.alloc(5_000_000)

    await expect(handler(request("catalogue/administration/produits/42/images", "POST", body))).resolves.toEqual({
      proxied: true,
    })
    expect(boundary.sendProxy).toHaveBeenCalled()
  })

  it("proxies a five MiB stock-import upload with its boundary and idempotency key intact", async () => {
    const contentType = "multipart/form-data; boundary=----WebKitFormBoundaryT7"
    const key = "3f8e2b6a-9c1d-4e57-8a0b-1d2c3e4f5a6b"
    const body = Buffer.alloc(5 * 1024 * 1024 + 512, 1)

    await handler(
      request("catalogue/administration/produits/inventaire/import", "POST", body, contentType, "", {
        "cle-idempotence": key,
      }),
    )

    const [, target, options] = boundary.sendProxy.mock.calls[0]!
    expect(target).toBe("https://backend.example/v1/catalogue/administration/produits/inventaire/import")
    expect(options.fetchOptions.headers).toMatchObject({ "content-type": contentType, "cle-idempotence": key })
    expect(options.fetchOptions.body).toBe(body)
  })
})
