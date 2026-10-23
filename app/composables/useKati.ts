import type {
  KatiAdjustmentInput,
  KatiClientBalance,
  KatiClientSheet,
  KatiCommissionUnderReview,
  KatiIndicators,
  KatiPolicy,
  KatiRules,
  KatiSponsorship,
  KatiTransferFilters,
  KatiTransfersPage,
} from "@/types/api/kati"
import type { MaybeRefOrGetter } from "vue"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const BASE = "/marketplace/kati"

export function useKatiIndicators() {
  const apiFetch = useApiFetch()
  return useQuery<KatiIndicators>({
    queryKey: apiQueryKeys.kati.indicators,
    queryFn: () => apiFetch(`${BASE}/administration/indicateurs`),
  })
}

export function useKatiClients(search: MaybeRefOrGetter<string>) {
  const apiFetch = useApiFetch()
  const recherche = computed(() => toValue(search).trim())
  return useQuery<KatiClientBalance[]>({
    queryKey: computed(() => apiQueryKeys.kati.clients(recherche.value)),
    queryFn: () =>
      apiFetch(`${BASE}/administration/clients`, { query: recherche.value ? { recherche: recherche.value } : {} }),
  })
}

export function useKatiClientSheet(clientId: MaybeRefOrGetter<string | null>) {
  const apiFetch = useApiFetch()
  const id = computed(() => toValue(clientId))
  return useQuery<KatiClientSheet>({
    queryKey: computed(() => apiQueryKeys.kati.client(id.value)),
    queryFn: () => apiFetch(`${BASE}/administration/clients/${encodeURIComponent(id.value!)}`),
    enabled: computed(() => Boolean(id.value)),
  })
}

/** Every KATI transfer between clients, newest first. */
export function useKatiTransfers(filters: MaybeRefOrGetter<KatiTransferFilters>) {
  const apiFetch = useApiFetch()
  const query = computed(() => toValue(filters))
  return useQuery<KatiTransfersPage>({
    queryKey: computed(() => apiQueryKeys.kati.transfers(query.value)),
    queryFn: () => apiFetch(`${BASE}/administration/transferts`, { query: query.value }),
    placeholderData: keepPreviousData,
  })
}

export function useKatiSponsorships(filter: MaybeRefOrGetter<"en_revue" | "tous">) {
  const apiFetch = useApiFetch()
  return useQuery<{ attributions: KatiCommissionUnderReview[]; parrainages: KatiSponsorship[] }>({
    queryKey: computed(() => apiQueryKeys.kati.sponsorships(toValue(filter))),
    queryFn: () => apiFetch(`${BASE}/administration/parrainages`, { query: { filtre: toValue(filter) } }),
  })
}

export function useKatiPolicies() {
  const apiFetch = useApiFetch()
  return useQuery<KatiPolicy[]>({
    queryKey: apiQueryKeys.kati.policies,
    queryFn: () => apiFetch(`${BASE}/politiques`),
  })
}

export function useKatiMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.kati.all })
  const adjust = useMutation({
    mutationFn: ({ clientId, body }: { clientId: string; body: KatiAdjustmentInput }) =>
      apiWrite(`${BASE}/administration/clients/${encodeURIComponent(clientId)}/ajustements`, { method: "POST", body }),
    onSuccess: invalidate,
  })
  const validateCommission = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`${BASE}/administration/commissions/${encodeURIComponent(id)}/validation`, { method: "POST" }),
    onSuccess: invalidate,
  })
  const cancelCommission = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      apiWrite(`${BASE}/administration/commissions/${encodeURIComponent(id)}/annulation`, {
        method: "POST",
        body: { motif },
      }),
    onSuccess: invalidate,
  })
  const revokeSponsorship = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      apiWrite(`${BASE}/parrainages/${encodeURIComponent(id)}/revocation`, { method: "POST", body: { motif } }),
    onSuccess: invalidate,
  })
  const saveDraft = useMutation({
    mutationFn: (regles: KatiRules) => apiWrite(`${BASE}/politiques`, { method: "POST", body: { regles } }),
    onSuccess: invalidate,
  })
  const approve = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`${BASE}/politiques/${encodeURIComponent(id)}/approbation`, { method: "POST" }),
    onSuccess: invalidate,
  })
  const runJobs = useMutation({
    mutationFn: () => apiWrite(`${BASE}/traitements`, { method: "POST" }),
    onSuccess: invalidate,
  })
  return { adjust, validateCommission, cancelCommission, revokeSponsorship, saveDraft, approve, runJobs }
}
