import type {
  OfferVerificationInput,
  PublishedOffer,
  PublishedOfferFilter,
  RefusedLine,
  RefusedLineFilter,
} from "@/types/api/marketplace-catalogue-quality"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

/** Published offers matching a search, verified ones first (direction only). */
export function usePublishedOffers(search: MaybeRefOrGetter<string>, filter: MaybeRefOrGetter<PublishedOfferFilter>) {
  const apiFetch = useApiFetch()
  const params = computed(() => ({ recherche: toValue(search).trim() || undefined, filtre: toValue(filter) }))
  return useQuery<PublishedOffer[]>({
    queryKey: computed(() => apiQueryKeys.verifiedOffers.list(params.value)),
    queryFn: () => apiFetch("/marketplace/moderation/offres-publiees", { query: params.value }),
  })
}

export function useOfferVerification() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: OfferVerificationInput }) =>
      apiWrite(`/marketplace/moderation/offres-publiees/${encodeURIComponent(id)}/verification`, {
        method: "POST",
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.verifiedOffers.all }),
  })
}

/** Lines refused by shops without stock tracking, with the deposit owed back (direction only). */
export function useRefusedLines(filter: MaybeRefOrGetter<RefusedLineFilter>) {
  const apiFetch = useApiFetch()
  return useQuery<RefusedLine[]>({
    queryKey: computed(() => apiQueryKeys.refusedLines.list(toValue(filter))),
    queryFn: () => apiFetch("/marketplace/refus-lignes", { query: { filtre: toValue(filter) } }),
  })
}

export function useRefusedLineRefunds() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.refusedLines.all })
  const refund = useMutation({
    mutationFn: ({ id, telephone }: { id: string; telephone?: string }) =>
      apiWrite(`/marketplace/refus-lignes/${encodeURIComponent(id)}/remboursement`, {
        method: "POST",
        body: telephone ? { telephone } : {},
      }),
    onSuccess: invalidate,
  })
  const reconcile = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`/marketplace/refus-lignes/${encodeURIComponent(id)}/rapprochement`, { method: "POST" }),
    onSuccess: invalidate,
  })
  return { refund, reconcile }
}
