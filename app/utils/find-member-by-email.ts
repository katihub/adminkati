import type { TeamMember } from "@/types/api/equipe"

/** Looks a member up by email, ignoring case and stray whitespace. `null` when there is no address or nobody on the roster has it. */
export function findMemberByEmail(email: string | null | undefined, members: TeamMember[]): TeamMember | null {
  const wanted = email?.trim().toLowerCase()
  if (!wanted) return null

  return members.find(member => member.courriel.trim().toLowerCase() === wanted) ?? null
}
