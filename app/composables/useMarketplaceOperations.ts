import type {
  MarketplaceReturnDetail,
  MarketplaceReturnFilters,
  MarketplaceReturnsPage,
  SellerTrustDetail,
  SellerTrustFilters,
  SellerTrustPage,
} from "@/types/api/marketplace-operations"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useMarketplaceReturns(filters: MaybeRefOrGetter<MarketplaceReturnFilters>) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))
  return useQuery<MarketplaceReturnsPage>({
    queryKey: computed(() => apiQueryKeys.marketplaceOperations.returns(params.value)),
    queryFn: () => apiFetch("/marketplace/demandes-client/retours", { query: params.value }),
  })
}

export function useMarketplaceReturn(id: MaybeRefOrGetter<string | null>) {
  const apiFetch = useApiFetch()
  const returnId = computed(() => toValue(id))
  return useQuery<MarketplaceReturnDetail>({
    queryKey: computed(() => apiQueryKeys.marketplaceOperations.returnDetail(returnId.value)),
    queryFn: () => apiFetch(`/marketplace/demandes-client/retours/${encodeURIComponent(returnId.value!)}`),
    enabled: computed(() => Boolean(returnId.value)),
  })
}

export function useMarketplaceReturnMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = async (id: string) => {
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceOperations.all })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceOperations.returnDetail(id) })
  }
  const reimburse = useMutation({
    mutationFn: ({ id, referenceExterne }: { id: string; referenceExterne: string }) =>
      apiWrite(`/marketplace/demandes-client/retours/${encodeURIComponent(id)}/remboursement`, {
        method: "POST",
        body: { referenceExterne },
      }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  })
  const receive = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`/marketplace/demandes-client/retours/${encodeURIComponent(id)}/reception`, { method: "POST" }),
    onSuccess: (_data, id) => invalidate(id),
  })
  return { reimburse, receive }
}

export function useSellerTrustList(filters: MaybeRefOrGetter<SellerTrustFilters>) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))
  return useQuery<SellerTrustPage>({
    queryKey: computed(() => apiQueryKeys.marketplaceOperations.sellers(params.value)),
    queryFn: () => apiFetch("/marketplace/reputation/vendeurs", { query: params.value }),
  })
}

export function useSellerTrustDetail(id: MaybeRefOrGetter<string | null>) {
  const apiFetch = useApiFetch()
  const sellerId = computed(() => toValue(id))
  return useQuery<SellerTrustDetail>({
    queryKey: computed(() => apiQueryKeys.marketplaceOperations.sellerDetail(sellerId.value)),
    queryFn: () => apiFetch(`/marketplace/reputation/vendeurs/${encodeURIComponent(sellerId.value!)}`),
    enabled: computed(() => Boolean(sellerId.value)),
  })
}

export function useSellerTrustMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = async (sellerId: string) => {
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceOperations.all })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceOperations.sellerDetail(sellerId) })
  }
  const rehabilitate = useMutation({
    mutationFn: ({ sanctionId, motif }: { sellerId: string; sanctionId: string; motif: string }) =>
      apiWrite(`/marketplace/reputation/sanctions/${encodeURIComponent(sanctionId)}/rehabilitation`, {
        method: "POST",
        body: { motif },
      }),
    onSuccess: (_data, variables) => invalidate(variables.sellerId),
  })
  return { rehabilitate }
}
