import type { ProductListQuery, ProductListResponse } from "@/types/api/produits"
import type { QueryClient } from "@tanstack/vue-query"
import type { MaybeRefOrGetter } from "vue"
import { useInfiniteQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export type ProduitsFilters = ProductListQuery

function nextProductPage(lastPage: ProductListResponse) {
  return lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined
}

export function prefetchProduits(queryClient: QueryClient, filters: ProduitsFilters) {
  const apiFetch = useApiFetch()

  return queryClient.prefetchInfiniteQuery<ProductListResponse>({
    queryKey: apiQueryKeys.products.list(filters),
    queryFn: ({ pageParam }) =>
      apiFetch<ProductListResponse>("/catalogue/administration/produits", {
        query: { ...filters, page: pageParam },
      }),
    initialPageParam: 1,
    getNextPageParam: nextProductPage,
  })
}

export function useProduits(filters: MaybeRefOrGetter<ProduitsFilters>) {
  const currentFilters = computed(() => toValue(filters))

  return useInfiniteQuery<ProductListResponse>({
    queryKey: computed(() => apiQueryKeys.products.list(currentFilters.value)),
    queryFn: ({ pageParam }) =>
      useApiFetch()<ProductListResponse>("/catalogue/administration/produits", {
        query: { ...currentFilters.value, page: pageParam },
      }),
    initialPageParam: 1,
    getNextPageParam: nextProductPage,
  })
}
