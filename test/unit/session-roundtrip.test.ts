import type { SessionData } from "../../app/types/session"
import { IncomingMessage, ServerResponse } from "node:http"
import { parse } from "cookie-es"
import { createEvent } from "h3"
import { describe, expect, it, vi } from "vitest"

const session: SessionData = {
  accessToken: "access-secret",
  refreshToken: "refresh-secret",
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  user: {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles: ["direction"],
  },
}

function makeEvent(cookie?: string, headers: Record<string, string> = {}) {
  const request = Object.assign(new IncomingMessage(null as any), {
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
  })
  const response = new ServerResponse(request)
  return createEvent(request, response)
}

function secureCookieValue(config: { cookie?: false | { secure?: boolean } }) {
  return typeof config.cookie === "object" ? config.cookie.secure : undefined
}

describe("session persistence", () => {
  it("only marks the session cookie secure for HTTPS requests", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ sessionPassword: "a".repeat(32) }))
    const { getSessionConfig } = await import("../../server/utils/session")

    expect(secureCookieValue(getSessionConfig(makeEvent()))).toBe(false)
    expect(secureCookieValue(getSessionConfig(makeEvent(undefined, { "x-forwarded-proto": "https" })))).toBe(true)
  })

  it("keeps development cookies usable when the browser reports a proxy protocol", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubGlobal("useRuntimeConfig", () => ({ sessionPassword: "a".repeat(32) }))
    const { getSessionConfig } = await import("../../server/utils/session")

    expect(secureCookieValue(getSessionConfig(makeEvent(undefined, { "x-forwarded-proto": "https" })))).toBe(false)

    vi.unstubAllEnvs()
  })

  it("returns decoded session data after writing and sealing a session", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ sessionPassword: "a".repeat(32) }))
    const { readSession, writeSession } = await import("../../server/utils/session")
    const writeEvent = makeEvent()

    await writeSession(writeEvent, session)
    const setCookie = writeEvent.node.res.getHeader("set-cookie")
    const rawCookie = Array.isArray(setCookie) ? setCookie[0] : typeof setCookie === "string" ? setCookie : ""
    if (!rawCookie) throw new Error("writeSession did not set a cookie")
    const cookiePair = rawCookie.split(";")[0]
    if (!cookiePair) throw new Error("writeSession did not set nt-session")
    const sealedCookie = parse(cookiePair)["nt-session"]
    if (!sealedCookie) throw new Error("writeSession did not set nt-session")
    const readEvent = makeEvent(`nt-session=${sealedCookie}`)

    await expect(readSession(readEvent)).resolves.toEqual(session)
  })

  it("rejects a sealed session with an unsupported role", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ sessionPassword: "a".repeat(32) }))
    const { readSession, writeSession } = await import("../../server/utils/session")
    const writeEvent = makeEvent()

    await writeSession(writeEvent, {
      ...session,
      user: { ...session.user, roles: ["administrator"] },
    } as unknown as SessionData)
    const setCookie = writeEvent.node.res.getHeader("set-cookie")
    const rawCookie = Array.isArray(setCookie) ? setCookie[0] : typeof setCookie === "string" ? setCookie : ""
    if (!rawCookie) throw new Error("writeSession did not set a cookie")
    const cookiePair = rawCookie.split(";")[0]
    if (!cookiePair) throw new Error("writeSession did not set nt-session")
    const sealedCookie = parse(cookiePair)["nt-session"]
    if (!sealedCookie) throw new Error("writeSession did not set nt-session")
    const readEvent = makeEvent(`nt-session=${sealedCookie}`)

    await expect(readSession(readEvent)).resolves.toBeNull()
  })
})
