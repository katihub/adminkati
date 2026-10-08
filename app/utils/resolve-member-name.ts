import type { TeamMember } from "@/types/api/equipe"

/**
 * Looks a membre id up in the team roster. `null` when the roster hasn't loaded yet or the
 *  id genuinely isn't in it — callers fall back to their own placeholder text, not this util
 *  (keeps this function free of an i18n dependency).
 */
export function resolveMemberName(id: string, members: TeamMember[]): string | null {
  return members.find(member => member.id === id)?.nom ?? null
}
