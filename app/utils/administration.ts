import type { Role } from "@/types/session"

/**
 * WHO RUNS KATIMARKET (12 November 2026): the direction, and the KatiMarket manager (`gestionnaire`),
 * who has the same rights EXCEPT money going out (seller withdrawals, refunds, till closing, a
 * seller's commission rate, instalment settings), the audit, and giving or removing the direction
 * and manager roles. The backend enforces every one of these; the panel only hides what would be
 * refused. Mirrors `BackendKati/src/commun/garde/administration.ts`.
 */
export const ADMINISTRATION_ROLES: readonly Role[] = ["direction", "gestionnaire"]

/** Roles only the direction gives, removes, or edits on a member. */
export const DIRECTION_RESERVED_ROLES: readonly Role[] = ["direction", "gestionnaire"]

export function isAdministration(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some(role => role === "direction" || role === "gestionnaire")
}

/** Money going out stays with the direction alone. */
export function canMoveMoney(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).includes("direction")
}

/** The roles this caller may give: everything for the direction, none of the reserved ones otherwise. */
export function assignableTeamRoles<T extends string>(
  all: readonly T[],
  callerRoles: readonly string[] | null | undefined,
) {
  return canMoveMoney(callerRoles) ? [...all] : all.filter(role => !DIRECTION_RESERVED_ROLES.includes(role as Role))
}

/** A member holding a reserved role is managed by the direction alone. */
export function canManageMember(callerRoles: readonly string[] | null | undefined, memberRoles: readonly string[]) {
  if (canMoveMoney(callerRoles)) return true
  if (!isAdministration(callerRoles)) return false
  return !memberRoles.some(role => DIRECTION_RESERVED_ROLES.includes(role as Role))
}
