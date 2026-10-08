import type { ArchiveQuoteResult, RefreshQuoteResult } from "@/types/api/devis"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useQuoteMutations() {
  const apiFetch = useApiFetch()
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()

  async function invalidateQuote(reference: string) {
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.quotes.all })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.quotes.detail(reference) })
  }

  const refresh = useMutation<RefreshQuoteResult, Error, string>({
    mutationFn: reference => apiFetch<RefreshQuoteResult>(`/devis/${encodeURIComponent(reference)}/rafraichir`),
  })
  const archive = useMutation<ArchiveQuoteResult, Error, string>({
    mutationFn: reference =>
      apiWrite<ArchiveQuoteResult>(`/devis/${encodeURIComponent(reference)}`, { method: "DELETE" }),
    onSuccess: (_data, reference) => invalidateQuote(reference),
  })

  return { refresh, archive }
}
