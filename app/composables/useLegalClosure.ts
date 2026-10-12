import type { RegisterLegalProofInput, LegalClosureState } from "@/types/api/legal-closure"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PATH = "/marketplace/deploiement/cloture-juridique"

export function useLegalClosure() {
  const apiFetch = useApiFetch()
  return useQuery<LegalClosureState>({
    queryKey: apiQueryKeys.legalClosure.state,
    queryFn: () => apiFetch(PATH),
  })
}

export function useLegalClosureMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const register = useMutation({
    mutationFn: (body: RegisterLegalProofInput) => apiWrite(`${PATH}/preuves`, { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.legalClosure.all }),
  })
  return { register }
}
