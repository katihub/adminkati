import type { DemandeAssistanceDetail, RepondreDemandeInput } from "@/types/api/assistant"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { toApiError } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { DEMANDES_ASSISTANCE_PATH } from "./useDemandesAssistance"

function demandePath(id: string, action: "reponse" | "cloture") {
  return `${DEMANDES_ASSISTANCE_PATH}/${encodeURIComponent(id)}/${action}`
}

/**
 * Both writes answer with the whole detail, so the panel shows the new state at
 * once; the invalidation still runs because the list rows and the per-status
 * counters moved too.
 *
 * A 409 means a colleague closed the request first. The screen is stale, not
 * the operator wrong, so it is refreshed as well — the backend's own sentence
 * says what happened, and the refreshed status shows it.
 */
function useSettleDemande() {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.assistant.all })

  return {
    onSuccess: async (demande: DemandeAssistanceDetail) => {
      queryClient.setQueryData(apiQueryKeys.assistant.detail(demande.id), demande)
      await refresh()
    },
    onError: async (error: unknown) => {
      if (toApiError(error).status === 409) await refresh()
    },
  }
}

export function useReponseDemande() {
  const apiWrite = useApiWrite()

  return useMutation<DemandeAssistanceDetail, Error, { id: string; input: RepondreDemandeInput }>({
    mutationFn: ({ id, input }) =>
      apiWrite<DemandeAssistanceDetail>(demandePath(id, "reponse"), { method: "POST", body: input }),
    ...useSettleDemande(),
  })
}

export function useClotureDemande() {
  const apiWrite = useApiWrite()

  return useMutation<DemandeAssistanceDetail, Error, string>({
    mutationFn: id => apiWrite<DemandeAssistanceDetail>(demandePath(id, "cloture"), { method: "POST" }),
    ...useSettleDemande(),
  })
}
