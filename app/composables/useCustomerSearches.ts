import type { CustomerSearchDashboard, CustomerSearchPeriod } from "@/types/api/customer-searches"
import type { MaybeRefOrGetter } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useCustomerSearches(days: MaybeRefOrGetter<CustomerSearchPeriod>, enabled: MaybeRefOrGetter<boolean>) {
  const currentDays = computed(() => toValue(days))

  return useQuery<CustomerSearchDashboard>({
    queryKey: computed(() => apiQueryKeys.customerSearches.overview(currentDays.value)),
    queryFn: () =>
      useApiFetch()<CustomerSearchDashboard>("/catalogue/administration/requetes-clients", {
        query: { jours: currentDays.value },
      }),
    enabled: computed(() => toValue(enabled)),
  })
}
