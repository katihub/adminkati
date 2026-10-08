import type {
  CatalogueIngestionState,
  CatalogueProposal,
  CatalogueProposalList,
  CatalogueProposalQuery,
  ProposalDecisionResult,
  ProposalRefusalInput,
} from "@/types/api/catalogue"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useCatalogue(filters: MaybeRefOrGetter<CatalogueProposalQuery> = {}) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))
  const state = useQuery<CatalogueIngestionState>({
    queryKey: apiQueryKeys.catalogue.state,
    queryFn: () => apiFetch<CatalogueIngestionState>("/catalogue/etat"),
  })
  const proposals = useQuery<CatalogueProposalList>({
    queryKey: computed(() => apiQueryKeys.catalogue.proposals(params.value)),
    queryFn: () => apiFetch<CatalogueProposalList>("/catalogue/administration/propositions", { query: params.value }),
  })
  return { state, proposals }
}

export function useCatalogueProposals(filters: MaybeRefOrGetter<CatalogueProposalQuery> = {}) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))

  return useQuery<CatalogueProposalList>({
    queryKey: computed(() => apiQueryKeys.catalogue.proposals(params.value)),
    queryFn: () => apiFetch<CatalogueProposalList>("/catalogue/administration/propositions", { query: params.value }),
  })
}

export function useCatalogueProposal(id: MaybeRefOrGetter<number | null | undefined>) {
  const apiFetch = useApiFetch()
  const proposalId = computed(() => toValue(id))

  return useQuery<CatalogueProposal>({
    queryKey: computed(() => apiQueryKeys.catalogue.proposal(proposalId.value ?? 0)),
    queryFn: () => apiFetch<CatalogueProposal>(`/catalogue/administration/propositions/${proposalId.value}`),
    enabled: computed(() => proposalId.value !== null && proposalId.value !== undefined),
  })
}

export function useCatalogueMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = async (id: number) => {
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.catalogue.all })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.catalogue.proposal(id) })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.taxonomy.all })
  }
  const accept = useMutation<ProposalDecisionResult, Error, number>({
    mutationFn: id => apiWrite(`/catalogue/administration/propositions/${id}/accepter`, { method: "POST" }),
    onSuccess: result => invalidate(result.id),
  })
  const refuse = useMutation<ProposalDecisionResult, Error, { id: number; input: ProposalRefusalInput }>({
    mutationFn: ({ id, input }) =>
      apiWrite(`/catalogue/administration/propositions/${id}/refuser`, { method: "POST", body: input }),
    onSuccess: result => invalidate(result.id),
  })
  return { accept, refuse }
}
