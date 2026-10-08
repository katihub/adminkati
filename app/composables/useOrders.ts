import type { CommandeAnnuairePage, CommandeDetail, ListerCommandesEquipeQuery } from "@/types/api/commandes"
import type { QueryClient } from "@tanstack/vue-query"
import type { MaybeRefOrGetter } from "vue"
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export type CommandesFilters = ListerCommandesEquipeQuery

function nextOrderPage(lastPage: CommandeAnnuairePage) {
  return lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined
}

export function prefetchOrders(queryClient: QueryClient, filters: CommandesFilters) {
  const apiFetch = useApiFetch()

  return queryClient.prefetchInfiniteQuery<CommandeAnnuairePage>({
    queryKey: apiQueryKeys.orders.list(filters),
    queryFn: ({ pageParam }) =>
      apiFetch<CommandeAnnuairePage>("/commandes/equipe/annuaire", {
        query: { ...filters, page: pageParam },
      }),
    initialPageParam: 1,
    getNextPageParam: nextOrderPage,
  })
}

export function useOrders(filters: MaybeRefOrGetter<CommandesFilters> = {}, enabled: MaybeRefOrGetter<boolean> = true) {
  const currentFilters = computed(() => toValue(filters))
  const isEnabled = computed(() => toValue(enabled))

  return useInfiniteQuery<CommandeAnnuairePage>({
    queryKey: computed(() => apiQueryKeys.orders.list(currentFilters.value)),
    queryFn: ({ pageParam }) =>
      useApiFetch()<CommandeAnnuairePage>("/commandes/equipe/annuaire", {
        query: { ...currentFilters.value, page: pageParam },
      }),
    enabled: isEnabled,
    initialPageParam: 1,
    getNextPageParam: nextOrderPage,
  })
}

export function useOrder(reference: MaybeRefOrGetter<string | null | undefined>) {
  const apiFetch = useApiFetch()
  const selectedReference = computed(() => toValue(reference))

  return useQuery<CommandeDetail>({
    queryKey: computed(() => apiQueryKeys.orders.detail(selectedReference.value)),
    queryFn: () => apiFetch<CommandeDetail>(`/commandes/${encodeURIComponent(selectedReference.value ?? "")}`),
    enabled: computed(() => Boolean(selectedReference.value)),
  })
}
