import type { CustomerAccountDetail, CustomerDirectoryPage, CustomerDirectoryQuery } from "@/types/api/clients"
import type { QueryClient } from "@tanstack/vue-query"
import type { MaybeRefOrGetter } from "vue"
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export type CustomersFilters = Omit<CustomerDirectoryQuery, "page">

function nextCustomerPage(lastPage: CustomerDirectoryPage) {
  return lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined
}

export function prefetchCustomers(queryClient: QueryClient, filters: CustomersFilters) {
  const apiFetch = useApiFetch()

  return queryClient.prefetchInfiniteQuery<CustomerDirectoryPage>({
    queryKey: apiQueryKeys.customers.list(filters),
    queryFn: ({ pageParam }) =>
      apiFetch<CustomerDirectoryPage>("/clients/annuaire", {
        query: { ...filters, page: pageParam },
      }),
    initialPageParam: 1,
    getNextPageParam: nextCustomerPage,
  })
}

export function useCustomers(filters: MaybeRefOrGetter<CustomersFilters> = {}) {
  const currentFilters = computed(() => toValue(filters))

  return useInfiniteQuery<CustomerDirectoryPage>({
    queryKey: computed(() => apiQueryKeys.customers.list(currentFilters.value)),
    queryFn: ({ pageParam }) =>
      useApiFetch()<CustomerDirectoryPage>("/clients/annuaire", {
        query: { ...currentFilters.value, page: pageParam },
      }),
    initialPageParam: 1,
    getNextPageParam: nextCustomerPage,
  })
}

export function useCustomer(id: MaybeRefOrGetter<string | null | undefined>) {
  const apiFetch = useApiFetch()
  const customerId = computed(() => toValue(id))

  return useQuery<CustomerAccountDetail>({
    queryKey: computed(() => apiQueryKeys.customers.detail(customerId.value)),
    queryFn: () => apiFetch<CustomerAccountDetail>(`/clients/${encodeURIComponent(customerId.value ?? "")}`),
    enabled: computed(() => Boolean(customerId.value)),
  })
}
