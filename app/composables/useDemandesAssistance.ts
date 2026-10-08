import type {
  DemandeAssistanceDetail,
  DemandesAssistancePage,
  ListerDemandesAssistanceQuery,
} from "@/types/api/assistant"
import type { MaybeRefOrGetter } from "vue"
import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export const DEMANDES_ASSISTANCE_PATH = "/assistant/administration/demandes"

/**
 * Page-numbered rather than infinite, unlike orders: the counters travel with
 * each page, and a queue the team works through top-down reads better as
 * pages it can name than as a scroll that reshuffles as requests get answered.
 */
export function useDemandesAssistance(filters: MaybeRefOrGetter<ListerDemandesAssistanceQuery>) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))

  return useQuery<DemandesAssistancePage>({
    queryKey: computed(() => apiQueryKeys.assistant.list(params.value)),
    queryFn: () => apiFetch<DemandesAssistancePage>(DEMANDES_ASSISTANCE_PATH, { query: params.value }),
    // Keeps the status counters on screen while the next page or tab loads.
    placeholderData: keepPreviousData,
  })
}

export function useDemandeAssistance(id: MaybeRefOrGetter<string | null | undefined>) {
  const apiFetch = useApiFetch()
  const selectedId = computed(() => toValue(id))

  return useQuery<DemandeAssistanceDetail>({
    queryKey: computed(() => apiQueryKeys.assistant.detail(selectedId.value)),
    queryFn: () =>
      apiFetch<DemandeAssistanceDetail>(`${DEMANDES_ASSISTANCE_PATH}/${encodeURIComponent(selectedId.value ?? "")}`),
    enabled: computed(() => Boolean(selectedId.value)),
  })
}
