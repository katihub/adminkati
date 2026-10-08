import type { DelaiLivraison } from "@/types/api/delais-livraison"
import { useQuery } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

export const DELIVERY_INTERVALS_PATH = "/catalogue/administration/delais-livraison"

/** Fetched when the product form mounts rather than prefetched in SSR: it is not above the fold. */
export function useDeliveryIntervals() {
  const apiFetch = useApiFetch()

  return useQuery<DelaiLivraison[]>({
    queryKey: apiQueryKeys.deliveryIntervals.all,
    queryFn: () => apiFetch<DelaiLivraison[]>(DELIVERY_INTERVALS_PATH),
  })
}
