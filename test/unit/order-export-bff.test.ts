import type { RequestListener, Server } from "node:http"
import type { AddressInfo } from "node:net"
import { Buffer } from "node:buffer"
import { once } from "node:events"
import { createServer } from "node:http"
import { createApp, defineEventHandler, toNodeListener } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import handler from "../../server/api/v1/[...path]"

const accessToken = "export-token"
const pdf = Buffer.from("%PDF-1.4\norder export\n%%EOF")
let bff: Server
let upstream: Server
let upstreamAuthorization: string | undefined
let upstreamUrl: string | undefined

vi.mock("../../server/utils/api-session", () => ({
  ensureFreshSession: vi.fn(async () => ({ accessToken })),
}))

function origin(server: Server): string {
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("server did not listen on TCP")
  return `http://127.0.0.1:${(address as AddressInfo).port}`
}

async function startServer(listener: RequestListener): Promise<Server> {
  const server = createServer(listener)
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  return server
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()))
  })
}

describe("order PDF export BFF", () => {
  beforeEach(async () => {
    upstreamAuthorization = undefined
    upstreamUrl = undefined
    upstream = await startServer((request, response) => {
      upstreamAuthorization = request.headers.authorization
      upstreamUrl = request.url
      response.writeHead(200, {
        "content-disposition": "attachment; filename=commande-NT-000042-facture-fr.pdf",
        "content-type": "application/pdf",
      })
      response.end(pdf)
    })
    vi.stubGlobal("useRuntimeConfig", () => ({ apiBaseUrl: origin(upstream) }))

    const app = createApp()
    app.use(
      defineEventHandler(event => {
        // Like the real router, the param is the pathname only; the query string travels separately.
        event.context.params = { path: new URL(event.path, "http://bff").pathname.replace(/^\/api\/v1\//, "") }
        return handler(event)
      }),
    )
    bff = await startServer(toNodeListener(app))
  })

  afterEach(async () => {
    await Promise.all([stopServer(bff), stopServer(upstream)])
    vi.unstubAllGlobals()
  })

  it("preserves PDF bytes and download headers from the authenticated backend export", async () => {
    const response = await fetch(`${origin(bff)}/api/v1/commandes/NT-000042/export?document=facture&locale=fr`)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/pdf")
    expect(response.headers.get("content-disposition")).toBe("attachment; filename=commande-NT-000042-facture-fr.pdf")
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf)
    expect(upstreamAuthorization).toBe(`Bearer ${accessToken}`)
    expect(upstreamUrl).toBe("/v1/commandes/NT-000042/export?document=facture&locale=fr")
  })
})
