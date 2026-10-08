import type { ApiStatistiquesApercu, Periode } from "@/types/api/statistiques"
import type { MaybeRefOrGetter } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useStatistiquesApercu(periode: MaybeRefOrGetter<Periode>) {
  const currentPeriode = computed(() => toValue(periode))

  return useQuery<ApiStatistiquesApercu>({
    queryKey: computed(() => apiQueryKeys.statistics.overview(currentPeriode.value)),
    queryFn: () =>
      useApiFetch()<ApiStatistiquesApercu>("/statistiques/apercu", {
        query: { periode: currentPeriode.value },
      }),
  })
}
