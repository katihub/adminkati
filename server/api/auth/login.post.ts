import type { AuthTokens } from "../../utils/supabase"
import type { LoginInput } from "@/schemas/login"
import type { ApiAppelant } from "@/types/api/auth"
import type { SessionData } from "@/types/session"
import type { H3Event } from "h3"
import { defineEventHandler, readValidatedBody, setResponseStatus } from "h3"
import { loginSchema } from "@/schemas/login"
import { toPublicSession, writeSession } from "../../utils/session"
import { signIn } from "../../utils/supabase"

// Never log this body: it contains a plaintext password and server logs outlive sessions.
type LoginFailureReason = "backend_unreachable" | "deactivated" | "invalid_credentials" | "invalid_input" | "not_team"

function loginFailure(event: H3Event, statusCode: number, reason: LoginFailureReason) {
  setResponseStatus(event, statusCode)
  return { reason }
}

type IdentityLookup =
  | { user: ApiAppelant | null }
  | { statusCode: 403 | 502; reason: "deactivated" | "backend_unreachable" }
type LoginAttempt = { tokens: AuthTokens } | { statusCode: 400 | 401; reason: "invalid_input" | "invalid_credentials" }
type LoginOutcome = { session: SessionData } | { statusCode: number; reason: LoginFailureReason }

async function readLoginInput(event: H3Event): Promise<LoginInput | null> {
  try {
    return await readValidatedBody(event, value => loginSchema.parse(value))
  } catch {
    return null
  }
}

async function authenticate(input: LoginInput): Promise<AuthTokens | null> {
  try {
    return await signIn(input.email, input.password)
  } catch {
    return null
  }
}

async function authenticateRequest(event: H3Event): Promise<LoginAttempt> {
  const body = await readLoginInput(event)
  if (!body) return { statusCode: 400, reason: "invalid_input" }
  const tokens = await authenticate(body)
  if (!tokens) return { statusCode: 401, reason: "invalid_credentials" }
  return { tokens }
}

async function lookupIdentity(tokens: AuthTokens): Promise<IdentityLookup> {
  const config = useRuntimeConfig()
  try {
    const user = await $fetch<ApiAppelant | null>(`${config.apiBaseUrl}/v1/moi`, {
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    })
    return { user }
  } catch (error: any) {
    return error?.response?.status === 403
      ? { statusCode: 403, reason: "deactivated" }
      : { statusCode: 502, reason: "backend_unreachable" }
  }
}

function createSession(tokens: AuthTokens, user: Extract<ApiAppelant, { type: "equipe" }>): SessionData {
  return {
    ...tokens,
    user: {
      userId: user.userId,
      membreId: user.membreId,
      nom: user.nom,
      courriel: user.courriel,
      roles: user.roles,
      // Le périmètre voyage avec la session : sans lui, l'écran des commandes
      // proposerait des encaissements que le backend refuse par un 403.
      ...(user.comptoirs ? { comptoirs: user.comptoirs } : {}),
    },
  }
}

function resolveIdentity(identity: IdentityLookup, tokens: AuthTokens): LoginOutcome {
  if ("reason" in identity) return identity
  if (!identity.user || identity.user.type !== "equipe") return { statusCode: 403, reason: "not_team" }
  return { session: createSession(tokens, identity.user) }
}

export default defineEventHandler(async event => {
  const attempt = await authenticateRequest(event)
  if ("reason" in attempt) return loginFailure(event, attempt.statusCode, attempt.reason)
  const outcome = resolveIdentity(await lookupIdentity(attempt.tokens), attempt.tokens)
  if ("reason" in outcome) return loginFailure(event, outcome.statusCode, outcome.reason)
  await writeSession(event, outcome.session)
  return toPublicSession(outcome.session)
})
