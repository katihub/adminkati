import type {
  CaisseCountInput,
  CaisseCountResult,
  CaisseDetail,
  CaisseDiscrepancyInput,
  CaisseDiscrepancyResult,
  CaisseEncours,
  CaisseListItem,
  CaisseValidationResult,
} from "@/types/api/caisse"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useCaisse(id: MaybeRefOrGetter<string>) {
  const apiFetch = useApiFetch()
  const caisseId = computed(() => toValue(id))
  return useQuery<CaisseDetail>({
    queryKey: computed(() => apiQueryKeys.caisse.detail(caisseId.value)),
    queryFn: () => apiFetch<CaisseDetail>(`/caisses/${encodeURIComponent(caisseId.value)}`),
    enabled: computed(() => Boolean(caisseId.value)),
  })
}

export function useCaisses(status?: MaybeRefOrGetter<string | undefined>) {
  const apiFetch = useApiFetch()
  const selected = computed(() => toValue(status))
  return useQuery<CaisseListItem[]>({
    queryKey: computed(() => apiQueryKeys.caisse.list(selected.value)),
    queryFn: () =>
      apiFetch<CaisseListItem[]>("/caisses", { query: selected.value ? { statut: selected.value } : undefined }),
  })
}

export function useCaisseEncours() {
  const apiFetch = useApiFetch()
  return useQuery<CaisseEncours[]>({
    queryKey: apiQueryKeys.caisse.encours,
    queryFn: () => apiFetch<CaisseEncours[]>("/caisses/encours"),
  })
}

export function useCaisseMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.caisse.all })
    if (id) await queryClient.invalidateQueries({ queryKey: apiQueryKeys.caisse.detail(id) })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.orders.all })
  }
  const count = useMutation<CaisseCountResult, Error, { id: string; input: CaisseCountInput }>({
    mutationFn: ({ id, input }) => apiWrite(`/caisses/${id}/compter`, { method: "POST", body: input }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  })
  const nameDiscrepancy = useMutation<CaisseDiscrepancyResult, Error, { id: string; input: CaisseDiscrepancyInput }>({
    mutationFn: ({ id, input }) => apiWrite(`/caisses/${id}/ecart`, { method: "POST", body: input }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  })
  const validate = useMutation<CaisseValidationResult, Error, string>({
    mutationFn: id => apiWrite(`/caisses/${id}/valider`, { method: "POST" }),
    onSuccess: (_data, id) => invalidate(id),
  })
  return { count, nameDiscrepancy, validate }
}
