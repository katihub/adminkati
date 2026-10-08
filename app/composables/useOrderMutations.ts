import type {
  AdvanceOrderInput,
  AdvanceOrderResult,
  AssignLivreurInput,
  CollectPaymentInput,
  CollectPaymentResult,
  CommandeDetail,
  ConfirmOrderResult,
} from "@/types/api/commandes"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { toApiError } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useOrderMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()

  async function invalidateOrder(reference: string) {
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.orders.all })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.orders.detail(reference) })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.caisse.all })
  }

  const confirm = useMutation<ConfirmOrderResult, Error, string>({
    mutationFn: reference =>
      apiWrite<ConfirmOrderResult>(`/commandes/${encodeURIComponent(reference)}/confirmer`, { method: "POST" }),
    onSuccess: async (_data, reference) => {
      // Confirming reserves stock, so inventory and product screens are stale too.
      await Promise.all([
        invalidateOrder(reference),
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all }),
      ])
    },
    // A 409 means the order moved under us: a price drift sends it back to `soumise`
    // with new totals, and a stale status is refused. Either way the cached order is wrong.
    onError: (error, reference) => (toApiError(error).status === 409 ? invalidateOrder(reference) : undefined),
  })
  function orderAction<TResult, TInput extends Record<string, any>>(action: string) {
    return useMutation<TResult, Error, { reference: string; input: TInput }>({
      mutationFn: ({ reference, input }) =>
        apiWrite<TResult>(`/commandes/${encodeURIComponent(reference)}/${action}`, { method: "POST", body: input }),
      onSuccess: (_data, variables) => invalidateOrder(variables.reference),
    })
  }

  const advance = orderAction<AdvanceOrderResult, AdvanceOrderInput>("avancer")
  const collectPayment = orderAction<CollectPaymentResult, CollectPaymentInput>("encaisser")

  /**
   * Naming the courier without moving the order. The counter corrects a wrong
   * assignment, or names one before departure so the courier sees the round
   * coming. Moving to `en_remise` already assigns; this is the repair.
   */
  const assignLivreur = orderAction<CommandeDetail, AssignLivreurInput>("livreur")

  return { confirm, advance, collectPayment, assignLivreur }
}
