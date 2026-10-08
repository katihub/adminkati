import { computed } from "vue"
import { useCaisseEncours } from "@/composables/useCaisse"
import { useTeamRoster } from "@/composables/useTeamRoster"
import { resolveMemberName } from "@/utils/resolve-member-name"

export interface CaisseEncoursEntry {
  porteurId: string
  name: string
  amount: number
  count: number
}

/** Outstanding-cash-by-porteur snapshot backing the FilterBar's porteur filter options. */
export function useCaisseEncoursEntries() {
  const { t } = useI18n()
  const { data, isPending, error } = useCaisseEncours()
  const { members } = useTeamRoster()

  const entries = computed<CaisseEncoursEntry[]>(() =>
    (data.value ?? [])
      .map(row => ({
        porteurId: row.porteurId,
        name: resolveMemberName(row.porteurId, members.value) ?? t("caisse.common.unknownMember"),
        amount: row._sum.montantAttendu ?? 0,
        count: row._count._all,
      }))
      .sort((a, b) => b.amount - a.amount),
  )

  return { entries, isPending, error }
}
