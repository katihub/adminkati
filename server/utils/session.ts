import type { PublicSession, SessionData } from "@/types/session"
import type { H3Event, SessionConfig } from "h3"
import process from "node:process"
import { deleteCookie, getCookie, getRequestProtocol, unsealSession, useSession } from "h3"

export function getSessionConfig(event?: H3Event): SessionConfig {
  const { sessionPassword } = useRuntimeConfig()
  const secure =
    process.env.NODE_ENV === "development"
      ? false
      : event
        ? getRequestProtocol(event, { xForwardedProto: true }) === "https"
        : true
  return {
    name: "nt-session",
    password: sessionPassword,
    maxAge: 60 * 60 * 12,
    sessionHeader: false,
    cookie: { httpOnly: true, secure, sameSite: "lax", path: "/" },
  }
}

export const sessionConfig = getSessionConfig

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

const sessionStringFields = ["accessToken", "refreshToken"] as const
const userStringFields = ["userId", "membreId", "nom", "courriel"] as const
const validRoles = ["direction", "comptoir", "preparation", "livreur", "point_focal"] as const

function hasStringFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every(field => typeof value[field] === "string")
}

function isRole(value: unknown): value is SessionData["user"]["roles"][number] {
  return validRoles.includes(value as (typeof validRoles)[number])
}

function isRoleList(value: unknown): value is SessionData["user"]["roles"] {
  return Array.isArray(value) && value.every(isRole)
}

/** Absent is legitimate: a deployment that predates the perimeter has no such field. */
function isComptoirList(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every(entry => typeof entry === "string"))
}

function isSessionUser(value: unknown): value is SessionData["user"] {
  if (!isRecord(value)) return false
  return hasStringFields(value, userStringFields) && isRoleList(value.roles) && isComptoirList(value.comptoirs)
}

function isSessionData(value: unknown): value is SessionData {
  if (
    !isRecord(value) ||
    !hasStringFields(value, sessionStringFields) ||
    typeof value.expiresAt !== "number" ||
    !Number.isFinite(value.expiresAt)
  )
    return false
  return isSessionUser(value.user)
}

export async function readSession(event: H3Event): Promise<SessionData | null> {
  const sealed = getCookie(event, "nt-session")
  if (!sealed) return null
  try {
    const session = await unsealSession(event, getSessionConfig(event), sealed)
    return isSessionData(session.data) ? session.data : null
  } catch {
    return null
  }
}

export async function writeSession(event: H3Event, data: SessionData): Promise<void> {
  const session = await useSession(event, getSessionConfig(event))
  await session.update(data)
}

export function endSession(event: H3Event): void {
  const cookie = getSessionConfig(event).cookie
  deleteCookie(event, "nt-session", {
    httpOnly: true,
    secure: typeof cookie === "object" ? cookie.secure : undefined,
    sameSite: "lax",
    path: "/",
  })
}

export function toPublicSession(data: SessionData): PublicSession {
  return { ...data.user }
}
