import type { TeamMember } from "@/types/api/equipe"
import { computed } from "vue"
import { useTeam } from "./useTeam"

/**
 * The backend's own max page size (`equipe.dto.ts`) — comfortably above a real shop roster.
 *  Id→name resolution needs the whole roster in one shot, not `useTeam`'s paginated slices; a
 *  roster that somehow exceeds this is a known, accepted limit, same class as the caisse list's
 *  own 100-row cap.
 */
const ROSTER_PAGE_SIZE = 200

export function useTeamRoster() {
  const query = useTeam({ taille: ROSTER_PAGE_SIZE })
  const members = computed<TeamMember[]>(() => query.data.value?.pages.flatMap(page => page.elements) ?? [])
  return { members, isPending: query.isPending, error: query.error }
}
