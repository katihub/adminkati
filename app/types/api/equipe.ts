/** Mirrors `prisma/schema.prisma:256-263` in the backend. */
export type TeamRole = "direction" | "comptoir" | "preparation" | "livreur"
export type TeamSort = "nom" | "recent"

/** Mirrors `src/equipe/equipe.dto.ts:83-103` in the backend. */
export interface TeamDirectoryQuery {
  q?: string
  role?: TeamRole
  actif?: boolean
  tri?: TeamSort
  page?: number
  taille?: number
}

/** Mirrors `src/equipe/equipe.service.ts:24-37` in the backend. */
export interface TeamMember {
  id: string
  courriel: string
  nom: string
  telephone: string | null
  roles: TeamRole[]
  /**
   * The keys (`vitrine.points_vente.cle`) of the counters this member is attached to.
   *
   * AN EMPTY LIST IS NOT "NOTHING": it is the whole shop. The backend narrows a
   * member to his counters only once the list carries at least one key, so the
   * panel must never read `[]` as "no access" — every screen says so in words.
   */
  comptoirs: string[]
  actif: boolean
  creeLe: string
  invitLe?: string | null
  premiereConnexionLe: string | null
  desactiveLe: string | null
}

/** Mirrors `src/equipe/equipe.service.ts:230-263` in the backend. */
export interface TeamDirectoryPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: TeamMember[]
}

/** Mirrors `src/equipe/equipe.dto.ts:46-76` in the backend. */
export interface UpdateTeamMemberInput {
  roles?: TeamRole[]
  nom?: string
  telephone?: string | null
  /** The whole list replaces the previous one; `[]` puts the member back on the whole shop. */
  comptoirs?: string[]
}

/** Mirrors `src/equipe/equipe.service.ts:288-296` in the backend. */
export interface DeactivateTeamMemberResult {
  id: string
  actif: false
  desactiveLe: string
}

/** Reactivation returns the same canonical member projection as a detail read. */
export type ReactivateTeamMemberResult = TeamMember

/**
 * Mirrors `InscrireMembreDto` (`src/equipe/equipe.dto.ts:26-52`).
 *
 * `telephone` follows the backend's Cameroonian mobile shape exactly —
 * `+237 6XX XX XX XX`, spaces included. `roles` must carry at least one.
 */
export interface HireTeamMemberInput {
  courriel: string
  nom: string
  roles: TeamRole[]
  telephone?: string
  /** Omitted, or empty, hires someone on the whole shop. */
  comptoirs?: string[]
}

/**
 * What `POST /equipe/membres` returns: the member, plus whether the invitation
 * actually left. The backend sets it deliberately so the panel can say
 * « prévenez-le vous-même » instead of pretending the mail was sent
 * (`equipe.service.ts:110-122`).
 */
export interface HireTeamMemberResult extends TeamMember {
  invitationEnvoyee: boolean
}
