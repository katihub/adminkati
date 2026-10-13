import type {
  CreatePilotInput,
  MarketplacePilot,
  PilotAction,
  PilotEvaluation,
  PilotMeasurement,
  PilotReferences,
} from "@/types/api/marketplace-pilot"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PATH = "/marketplace/deploiement/pilotes"

export function useMarketplacePilots() {
  const apiFetch = useApiFetch()
  return useQuery<MarketplacePilot[]>({
    queryKey: apiQueryKeys.marketplacePilots.list,
    queryFn: () => apiFetch(PATH),
  })
}

export function useMarketplacePilotReferences() {
  const apiFetch = useApiFetch()
  return useQuery<PilotReferences>({
    queryKey: apiQueryKeys.marketplacePilots.references,
    queryFn: () => apiFetch(`${PATH}/references`),
  })
}

export function useMarketplacePilotMeasures(id: MaybeRefOrGetter<string | null>) {
  const apiFetch = useApiFetch()
  const pilotId = computed(() => toValue(id))
  return useQuery<PilotMeasurement>({
    queryKey: computed(() => apiQueryKeys.marketplacePilots.measures(pilotId.value)),
    queryFn: () => apiFetch(`${PATH}/${encodeURIComponent(pilotId.value!)}/mesures`),
    enabled: computed(() => Boolean(pilotId.value)),
  })
}

export function useMarketplacePilotMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplacePilots.all })

  const create = useMutation<MarketplacePilot, Error, CreatePilotInput>({
    mutationFn: body => apiWrite(PATH, { method: "POST", body }),
    onSuccess: refresh,
  })
  const transition = useMutation<MarketplacePilot, Error, { id: string; action: PilotAction }>({
    mutationFn: ({ id, action }) => apiWrite(`${PATH}/${encodeURIComponent(id)}/${action}`, { method: "POST" }),
    onSuccess: refresh,
  })
  // One key per click: a network retry of the same click replays, a new click records a new snapshot.
  const evaluate = useMutation<PilotEvaluation, Error, { id: string; cleIdempotence: string }>({
    mutationFn: ({ id, cleIdempotence }) =>
      apiWrite(`${PATH}/${encodeURIComponent(id)}/evaluations`, { method: "POST", body: { cleIdempotence } }),
    onSuccess: refresh,
  })
  return { create, transition, evaluate }
}
