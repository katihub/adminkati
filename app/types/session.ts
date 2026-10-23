/** Postgres enum `role`, mirrored from ../NowTech-backend-/prisma/schema.prisma:256-263. */
export type Role = "direction" | "comptoir" | "preparation" | "livreur" | "point_focal"

export interface PublicSession {
  userId: string
  membreId: string
  nom: string
  courriel: string
  roles: Role[]
  /**
   * The counters this member is attached to; empty means the whole shop.
   *
   * Optional on purpose. A deployment that predates the perimeter answers `/moi`
   * without the field, and the panel has to read that as "no restriction" rather
   * than lock every cash-in on an older backend.
   */
  comptoirs?: string[]
}

export interface SessionData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: PublicSession
}

declare module "h3" {
  interface H3EventContext {
    session?: SessionData
  }
}
