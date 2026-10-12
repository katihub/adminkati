import type {
  MarketplaceOfferReview,
  MarketplaceProductReview,
  SellerReviewDetail,
  SellerReviewFilters,
  SellerReviewPage,
} from "@/types/api/marketplace-moderation"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useSellerReviewList(filters: MaybeRefOrGetter<SellerReviewFilters>) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))
  return useQuery<SellerReviewPage>({
    queryKey: computed(() => apiQueryKeys.marketplaceModeration.sellers(params.value)),
    queryFn: () => apiFetch("/vendeurs", { query: params.value }),
  })
}

export function useSellerReviewDetail(id: MaybeRefOrGetter<string | null>) {
  const apiFetch = useApiFetch()
  const sellerId = computed(() => toValue(id))
  return useQuery<SellerReviewDetail>({
    queryKey: computed(() => apiQueryKeys.marketplaceModeration.seller(sellerId.value)),
    queryFn: () => apiFetch(`/vendeurs/${encodeURIComponent(sellerId.value!)}`),
    enabled: computed(() => Boolean(sellerId.value)),
  })
}

export function useSellerReviewMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = async (sellerId: string) => {
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceModeration.all })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceModeration.seller(sellerId) })
  }
  const claimDocument = useMutation({
    mutationFn: ({ sellerId, documentId }: { sellerId: string; documentId: string }) =>
      apiWrite(
        `/vendeurs/${encodeURIComponent(sellerId)}/documents/${encodeURIComponent(documentId)}/prise-en-charge`,
        { method: "POST" },
      ),
    onSuccess: (_data, variables) => invalidate(variables.sellerId),
  })
  const decideDocument = useMutation({
    mutationFn: ({
      sellerId,
      documentId,
      decision,
      motif,
    }: {
      sellerId: string
      documentId: string
      decision: "valide" | "refuse"
      motif?: string
    }) =>
      apiWrite(`/vendeurs/${encodeURIComponent(sellerId)}/documents/${encodeURIComponent(documentId)}/decision`, {
        method: "POST",
        body: { decision, ...(motif ? { motif } : {}) },
      }),
    onSuccess: (_data, variables) => invalidate(variables.sellerId),
  })
  const decideApplication = useMutation({
    mutationFn: ({
      sellerId,
      decision,
      motif,
    }: {
      sellerId: string
      decision: "approuve" | "modification_demandee" | "refuse"
      motif?: string
    }) =>
      apiWrite(`/vendeurs/${encodeURIComponent(sellerId)}/decision-dossier`, {
        method: "POST",
        body: { decision, ...(motif ? { motif } : {}) },
      }),
    onSuccess: (_data, variables) => invalidate(variables.sellerId),
  })
  return { claimDocument, decideDocument, decideApplication }
}

export function useMarketplaceProductReviews() {
  const apiFetch = useApiFetch()
  return useQuery<MarketplaceProductReview[]>({
    queryKey: apiQueryKeys.marketplaceModeration.products,
    queryFn: () => apiFetch("/marketplace/moderation/produits"),
  })
}

export function useMarketplaceOfferReviews() {
  const apiFetch = useApiFetch()
  return useQuery<MarketplaceOfferReview[]>({
    queryKey: apiQueryKeys.marketplaceModeration.offers,
    queryFn: () => apiFetch("/marketplace/moderation/offres"),
  })
}

export function useMarketplaceCatalogueModerationMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceModeration.all })
  const claimProduct = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`/marketplace/moderation/produits/${encodeURIComponent(id)}/prise-en-charge`, { method: "POST" }),
    onSuccess: invalidate,
  })
  const decideProduct = useMutation({
    mutationFn: ({
      id,
      decision,
      motif,
    }: {
      id: string
      decision: "actif" | "modification_demandee" | "refuse"
      motif?: string
    }) =>
      apiWrite(`/marketplace/moderation/produits/${encodeURIComponent(id)}/decision`, {
        method: "POST",
        body: { decision, ...(motif ? { motif } : {}) },
      }),
    onSuccess: invalidate,
  })
  const claimOffer = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`/marketplace/moderation/offres/${encodeURIComponent(id)}/prise-en-charge`, { method: "POST" }),
    onSuccess: invalidate,
  })
  const decideOffer = useMutation({
    mutationFn: ({
      id,
      decision,
      motif,
    }: {
      id: string
      decision: "approuvee" | "modification_demandee" | "refusee"
      motif?: string
    }) =>
      apiWrite(`/marketplace/moderation/offres/${encodeURIComponent(id)}/decision`, {
        method: "POST",
        body: { decision, ...(motif ? { motif } : {}) },
      }),
    onSuccess: invalidate,
  })
  return { claimProduct, decideProduct, claimOffer, decideOffer }
}
