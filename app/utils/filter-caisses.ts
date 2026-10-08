import type { CaisseStatusFilter } from "@/stores/caisse-workspace"
import type { CaisseListItem, StatutRemiseCaisse } from "@/types/api/caisse"
import type { TeamMember } from "@/types/api/equipe"
import { resolveMemberName } from "./resolve-member-name"

/** Same definition `GET /caisses/encours` uses for outstanding cash. */
const ATTENTION_STATUSES: StatutRemiseCaisse[] = ["ouverte", "litige"]

export interface CaisseFilterCriteria {
  searchTerm: string
  statusFilter: CaisseStatusFilter
  selectedPorteurId: string | null
}

/**
 * `GET /caisses` has no search param and takes one `statut` value, not a set — every filter
 *  this list panel offers (needs-attention, search-by-name, click-a-porteur) is applied here,
 *  client-side, against one unfiltered fetch.
 */
export function filterCaisses(
  caisses: CaisseListItem[],
  criteria: CaisseFilterCriteria,
  team: TeamMember[],
): CaisseListItem[] {
  const search = criteria.searchTerm.trim().toLowerCase()

  return caisses.filter(caisse => {
    if (criteria.selectedPorteurId && caisse.porteurId !== criteria.selectedPorteurId) return false

    if (criteria.statusFilter === "attention") {
      if (!ATTENTION_STATUSES.includes(caisse.statut)) return false
    } else if (criteria.statusFilter && caisse.statut !== criteria.statusFilter) {
      return false
    }

    if (search) {
      const name = resolveMemberName(caisse.porteurId, team) ?? ""
      if (!name.toLowerCase().includes(search)) return false
    }

    return true
  })
}
