import type { PaymentAttemptState, PaymentAttemptsPage, PaymentGatewayCertification } from "@/types/api/payment-gateway"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const BASE = "/paiements/kratospay"

/** What the direction sees of the Kratospay configuration, never the key. */
export function usePaymentGatewayCertification() {
  const apiFetch = useApiFetch()
  return useQuery<PaymentGatewayCertification>({
    queryKey: apiQueryKeys.paymentGateway.certification,
    queryFn: () => apiFetch(`${BASE}/certification`),
  })
}

export function usePaymentAttempts(state: MaybeRefOrGetter<PaymentAttemptState>) {
  const apiFetch = useApiFetch()
  const etat = computed(() => toValue(state))
  return useQuery<PaymentAttemptsPage>({
    queryKey: computed(() => apiQueryKeys.paymentGateway.attempts(etat.value)),
    queryFn: () => apiFetch(`${BASE}/transactions`, { query: { etat: etat.value } }),
  })
}

/** Asks Kratospay where an attempt stands, and applies the answer. */
export function useCheckPaymentAttempt() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (transId: string) =>
      apiWrite<{ encaisse: boolean; statut: string; motif?: string }>(
        `${BASE}/transactions/${encodeURIComponent(transId)}/consultation`,
        { method: "POST" },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.paymentGateway.all }),
  })
}
