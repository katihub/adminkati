import type { MarketplaceAdminOfferPage, MarketplaceOfferFilters } from "@/types/api/marketplace-catalogue-admin"
import type { MaybeRefOrGetter } from "vue"
import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

/** Every offer of every shop, one page at a time; the previous page stays on screen while the next loads. */
export function useMarketplaceAdminOffers(filters: MaybeRefOrGetter<MarketplaceOfferFilters>) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))
  return useQuery<MarketplaceAdminOfferPage>({
    queryKey: computed(() => apiQueryKeys.marketplaceAdminOffers.list(params.value)),
    queryFn: () => apiFetch("/marketplace/administration/offres", { query: params.value }),
    placeholderData: keepPreviousData,
  })
}
