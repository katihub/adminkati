import type {
  MarketplaceReturnDetail,
  MarketplaceReturnFilters,
  MarketplaceReturnsPage,
  SellerWithdrawalFilters,
  SellerWithdrawalsPage,
  CommissionAcquisitionResult,
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
    mutationFn: ({ id, telephone }: { id: string; telephone?: string }) =>
      apiWrite(`/marketplace/demandes-client/retours/${encodeURIComponent(id)}/remboursement`, {
        method: "POST",
        body: telephone ? { telephone } : {},
      }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  })
  const reconcileRefund = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`/marketplace/remboursements/fapshi/${encodeURIComponent(id)}/rapprocher`, { method: "POST" }),
    onSuccess: (_data, id) => invalidate(id),
  })
  const receive = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`/marketplace/demandes-client/retours/${encodeURIComponent(id)}/reception`, { method: "POST" }),
    onSuccess: (_data, id) => invalidate(id),
  })
  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
      motif,
      responsable,
      fraisRetourFcfa,
    }: {
      id: string
      decision: "autorise" | "refuse"
      motif: string
      responsable: "client" | "vendeur" | "agent_livraison" | "katihub" | "indetermine"
      fraisRetourFcfa: number
    }) =>
      apiWrite(`/marketplace/demandes-client/retours/${encodeURIComponent(id)}/decision`, {
        method: "POST",
        body: { decision, motif, responsable, fraisRetourFcfa },
      }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  })
  const arbitrate = useMutation({
    mutationFn: ({ id, decision, motif }: { id: string; decision: "autorise" | "refuse"; motif: string }) =>
      apiWrite(`/marketplace/demandes-client/retours/${encodeURIComponent(id)}/arbitrage`, {
        method: "POST",
        body: { decision, motif },
      }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  })
  const reply = useMutation({
    mutationFn: ({ demandId, contenu }: { id: string; demandId: string; contenu: string }) =>
      apiWrite(`/marketplace/demandes-client/${encodeURIComponent(demandId)}/messages`, {
        method: "POST",
        body: { contenu },
      }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  })
  return { reimburse, reconcileRefund, receive, decide, arbitrate, reply }
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

export function useSellerWithdrawals(filters: MaybeRefOrGetter<SellerWithdrawalFilters>) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))
  return useQuery<SellerWithdrawalsPage>({
    queryKey: computed(() => apiQueryKeys.marketplaceOperations.withdrawals(params.value)),
    queryFn: () => apiFetch("/marketplace/finance/retraits", { query: params.value }),
  })
}

export function useSellerFinanceMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceOperations.all })
  const acquireCommissions = useMutation<CommissionAcquisitionResult, Error, number>({
    mutationFn: (limite = 100) =>
      apiWrite<CommissionAcquisitionResult>("/marketplace/finance/commissions/acquisition", {
        method: "POST",
        body: { limite },
      }),
    onSuccess: invalidate,
  })
  const decideWithdrawal = useMutation({
    mutationFn: ({ id, decision, motif }: { id: string; decision: "approuve" | "refuse"; motif?: string }) =>
      apiWrite(`/marketplace/finance/retraits/${encodeURIComponent(id)}/decision`, {
        method: "POST",
        body: { decision, ...(motif ? { motif } : {}) },
      }),
    onSuccess: invalidate,
  })
  const recordTransfer = useMutation({
    mutationFn: ({
      id,
      referenceExterne,
      preuveStockageCle,
      preuveEmpreinteSha256,
      preuveMime,
      preuveTailleOctets,
    }: {
      id: string
      referenceExterne: string
      preuveStockageCle: string
      preuveEmpreinteSha256: string
      preuveMime: string
      preuveTailleOctets: number
    }) =>
      apiWrite(`/marketplace/finance/retraits/${encodeURIComponent(id)}/reversement`, {
        method: "POST",
        body: { referenceExterne, preuveStockageCle, preuveEmpreinteSha256, preuveMime, preuveTailleOctets },
      }),
    onSuccess: invalidate,
  })
  return { acquireCommissions, decideWithdrawal, recordTransfer }
}
