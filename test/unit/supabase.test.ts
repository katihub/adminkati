import { createClient } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createAuthClient, refresh, signIn } from "../../server/utils/supabase"

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }))

describe("supabase authentication wrappers", () => {
  const session = { access_token: "access", refresh_token: "refresh", expires_at: null }
  let auth: {
    refreshSession: ReturnType<typeof vi.fn>
    signInWithPassword: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.stubGlobal("useRuntimeConfig", () => ({ supabaseUrl: "https://supabase.test", supabaseAnonKey: "anon-key" }))
    auth = { refreshSession: vi.fn(), signInWithPassword: vi.fn() }
    vi.mocked(createClient).mockImplementation(() => ({ auth }) as unknown as ReturnType<typeof createClient>)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("creates a non-persisting client with the private runtime configuration", () => {
    createAuthClient()

    expect(createClient).toHaveBeenCalledWith("https://supabase.test", "anon-key", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  })

  it("maps a sign-in session without inventing an expiry", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null })

    await expect(signIn("ada@example.com", "secret")).resolves.toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: 0,
    })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "ada@example.com", password: "secret" })
  })

  it("maps a rotated refresh session", async () => {
    auth.refreshSession.mockResolvedValue({ data: { session: { ...session, expires_at: 123 } }, error: null })

    await expect(refresh("refresh")).resolves.toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: 123,
    })
    expect(auth.refreshSession).toHaveBeenCalledWith({ refresh_token: "refresh" })
  })

  it("rejects provider errors and missing sessions", async () => {
    const providerError = Object.assign(new Error("invalid"), { name: "AuthError", status: 400 })
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: providerError })
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: null })

    await expect(signIn("ada@example.com", "bad")).rejects.toBe(providerError)
    await expect(signIn("ada@example.com", "bad")).rejects.toThrow("Authentication returned no session")
  })
})
