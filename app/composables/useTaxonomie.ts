import type { Taxonomie } from "@/types/api/produits"
import { useQuery } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

/**
 * The backend's own comment on this endpoint notes the taxonomy "changes once a month" — a
 * long staleTime keeps every category/brand picker from refetching on each navigation.
 */
const TAXONOMIE_STALE_TIME = 24 * 60 * 60 * 1000

export function useTaxonomie() {
  const apiFetch = useApiFetch()

  return useQuery<Taxonomie>({
    queryKey: apiQueryKeys.taxonomy.all,
    queryFn: () => apiFetch<Taxonomie>("/catalogue/administration/taxonomie"),
    staleTime: TAXONOMIE_STALE_TIME,
  })
}
