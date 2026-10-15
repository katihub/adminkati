import type { ShopAgent, ShopAgentFilter } from "@/types/api/shop-agents"
import type { Ref } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

/** The shops' delivery agents (direction only): those awaiting verification, or all of them. */
export function useShopAgents(filter: Ref<ShopAgentFilter>) {
  const apiFetch = useApiFetch()
  return useQuery<ShopAgent[]>({
    queryKey: computed(() => apiQueryKeys.shopAgents.list(filter.value)),
    queryFn: () => apiFetch(`/marketplace/expeditions/agents-boutiques?statut=${filter.value}`),
  })
}

export function useShopAgentMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  /** Verifying an agent sets the cash it may hold; without it, nor a city ceiling, it collects nothing. */
  const verify = useMutation({
    mutationFn: ({ id, plafondEspecesFcfa }: { id: string; plafondEspecesFcfa?: number }) =>
      apiWrite(`/marketplace/expeditions/agents/${encodeURIComponent(id)}/verification`, {
        method: "POST",
        body: plafondEspecesFcfa === undefined ? {} : { plafondEspecesFcfa },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.shopAgents.all }),
  })
  return { verify }
}
