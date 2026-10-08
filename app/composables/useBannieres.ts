import type { BanniereAdmin } from "@/types/api/vitrine"
import type { QueryClient } from "@tanstack/vue-query"
import type { MaybeRefOrGetter } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const BANNIERES_PATH = "/vitrine/administration/bannieres"

export function prefetchBannieres(queryClient: QueryClient) {
  const apiFetch = useApiFetch()

  return queryClient.prefetchQuery<BanniereAdmin[]>({
    queryKey: apiQueryKeys.banners.all,
    queryFn: () => apiFetch<BanniereAdmin[]>(BANNIERES_PATH),
  })
}

/** No pagination on this endpoint (`vitrine.service.ts:88-98`) — a plain list query. */
export function useBannieres(enabled: MaybeRefOrGetter<boolean> = true) {
  const apiFetch = useApiFetch()

  return useQuery<BanniereAdmin[]>({
    queryKey: apiQueryKeys.banners.all,
    queryFn: () => apiFetch<BanniereAdmin[]>(BANNIERES_PATH),
    enabled: computed(() => toValue(enabled)),
  })
}
