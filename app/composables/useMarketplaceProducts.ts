import type {
  AdminMarketplaceProductDetail,
  AdminMarketplaceProductsPage,
  MarketplaceProductFilters,
} from "@/types/api/catalogue-products"
import type { MaybeRefOrGetter } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"

export function useMarketplaceProducts(filters: MaybeRefOrGetter<MarketplaceProductFilters>) {
  const api = useApiFetch()
  return useQuery<AdminMarketplaceProductsPage>({
    queryKey: computed(() => ["v1", "marketplace", "administration", "produits", "liste", toValue(filters)]),
    queryFn: () => api("/marketplace/administration/produits", { query: toValue(filters) }),
  })
}

export function useMarketplaceProduct(id: MaybeRefOrGetter<string | null>) {
  const api = useApiFetch()
  return useQuery<AdminMarketplaceProductDetail>({
    queryKey: computed(() => ["v1", "marketplace", "administration", "produits", toValue(id)]),
    queryFn: () => api(`/marketplace/administration/produits/${encodeURIComponent(toValue(id) ?? "")}`),
    enabled: computed(() => Boolean(toValue(id))),
  })
}
