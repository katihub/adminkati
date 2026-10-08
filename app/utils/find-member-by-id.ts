import type { TeamMember } from "@/types/api/equipe"

/** Looks a member up by id. `null` when there is no id or nobody on the roster has it. */
export function findMemberById(id: string | null | undefined, members: TeamMember[]): TeamMember | null {
  if (!id) return null

  return members.find(member => member.id === id) ?? null
}
