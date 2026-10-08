import type { PublicSession, Role } from "@/types/session"

export type AccessResult = "allow" | "anonymous" | "forbidden" | "undeclared"
export interface AccessMeta {
  public?: boolean
  team?: boolean
  roles?: Role[]
}

export function canAccess(session: PublicSession | null, meta: AccessMeta): AccessResult {
  if (meta.public) return "allow"
  if (!session) return "anonymous"
  if (meta.roles) return meta.roles.some(role => session.roles.includes(role)) ? "allow" : "forbidden"
  if (meta.team) return "allow"
  return "undeclared"
}
