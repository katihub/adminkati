import type { DevisDetail, DevisListItem, StatutDevis } from "@/types/api/devis"
import type { QueryClient } from "@tanstack/vue-query"
import type { MaybeRefOrGetter } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function prefetchQuotes(queryClient: QueryClient, status?: StatutDevis) {
  const apiFetch = useApiFetch()

  return queryClient.prefetchQuery<DevisListItem[]>({
    queryKey: apiQueryKeys.quotes.list(status),
    queryFn: () =>
      apiFetch<DevisListItem[]>("/devis/equipe", {
        query: status ? { statut: status } : {},
      }),
  })
}

export function useQuotes(
  status: MaybeRefOrGetter<StatutDevis | undefined> = undefined,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const currentStatus = computed(() => toValue(status))
  const isEnabled = computed(() => toValue(enabled))

  return useQuery<DevisListItem[]>({
    queryKey: computed(() => apiQueryKeys.quotes.list(currentStatus.value)),
    queryFn: () =>
      useApiFetch()<DevisListItem[]>("/devis/equipe", {
        query: currentStatus.value ? { statut: currentStatus.value } : {},
      }),
    enabled: isEnabled,
  })
}

export function useQuote(reference: MaybeRefOrGetter<string | null | undefined>) {
  const apiFetch = useApiFetch()
  const currentReference = computed(() => toValue(reference))

  return useQuery<DevisDetail>({
    queryKey: computed(() => apiQueryKeys.quotes.detail(currentReference.value)),
    queryFn: () => apiFetch<DevisDetail>(`/devis/${encodeURIComponent(currentReference.value ?? "")}`),
    enabled: computed(() => Boolean(currentReference.value)),
  })
}
