import type { AddProductCostInput, ProductCostRecord } from "@/types/api/statistics-management"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

function costsPath(productId: number) {
  return `/catalogue/administration/produits/${productId}/couts`
}

export function useProductCosts(productId: MaybeRefOrGetter<number | null>, enabled: MaybeRefOrGetter<boolean> = true) {
  const currentProductId = computed(() => toValue(productId))
  const isEnabled = computed(() => Boolean(toValue(enabled)) && currentProductId.value !== null)

  return useQuery<ProductCostRecord[]>({
    queryKey: computed(() => apiQueryKeys.products.costs(currentProductId.value)),
    queryFn: () => useApiFetch()<ProductCostRecord[]>(costsPath(currentProductId.value!)),
    enabled: isEnabled,
  })
}

export function useAddProductCost() {
  const queryClient = useQueryClient()
  const write = useApiWrite()

  return useMutation<ProductCostRecord, Error, AddProductCostInput>({
    mutationFn: input =>
      write<ProductCostRecord>(costsPath(input.productId), {
        method: "POST",
        body: { cost: input.cost },
      }),
    onSuccess: (_cost, input) => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.costs(input.productId) })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.detail(input.productId) })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.statistics.overview() })
    },
  })
}
