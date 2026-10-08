import type { AuthError, Session, SupabaseClient } from "@supabase/supabase-js"
import process from "node:process"
import { createClient } from "@supabase/supabase-js"

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

interface BackendAuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
}

function localAuthBypassEnabled(): boolean {
  const config = useRuntimeConfig()
  return process.env.NODE_ENV !== "production" && config.localAuthBypass === true
}

function toBackendAuthTokens(session: BackendAuthSession): AuthTokens {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + session.expires_in,
  }
}

async function signInWithLocalBackend(email: string, password: string): Promise<AuthTokens> {
  const config = useRuntimeConfig()
  const session = await $fetch<BackendAuthSession>(`${config.apiBaseUrl}/v1/auth/connexion`, {
    method: "POST",
    body: { email, motDePasse: password },
  })
  return toBackendAuthTokens(session)
}

async function refreshWithLocalBackend(refreshToken: string): Promise<AuthTokens> {
  const config = useRuntimeConfig()
  const session = await $fetch<BackendAuthSession>(`${config.apiBaseUrl}/v1/auth/rafraichir`, {
    method: "POST",
    body: { refreshToken },
  })
  return toBackendAuthTokens(session)
}

// GOTCHA: this must remain a factory. GoTrueClient keeps currentSession in memory even when
// persistSession is false; a module singleton would leak one request's session into another.
export function createAuthClient(): SupabaseClient {
  const config = useRuntimeConfig()
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function toAuthTokens(session: Session | null, error: AuthError | null, message: string): AuthTokens {
  if (error || !session) throw error ?? new Error(message)
  return { accessToken: session.access_token, refreshToken: session.refresh_token, expiresAt: session.expires_at ?? 0 }
}

export async function signIn(email: string, password: string): Promise<AuthTokens> {
  if (localAuthBypassEnabled()) return signInWithLocalBackend(email, password)

  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password })
  const tokens = toAuthTokens(data.session, error, "Authentication returned no session")
  return tokens
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  if (localAuthBypassEnabled()) return refreshWithLocalBackend(refreshToken)

  const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token: refreshToken })
  return toAuthTokens(data.session, error, "Refresh returned no session")
}

export async function revoke(accessToken: string, refreshToken: string): Promise<void> {
  if (localAuthBypassEnabled()) return

  const client = createAuthClient()
  const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  if (error) throw error
  const result = await client.auth.signOut({ scope: "local" })
  if (result.error) throw result.error
}
