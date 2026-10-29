import type {
  InstallmentCategoryRule,
  InstallmentPlan,
  InstallmentPlanStatus,
  InstallmentRuleInput,
  InstallmentSettings,
  InstallmentSettingsUpdate,
} from "@/types/api/installment-plans"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const BASE = "/marketplace/echelonnement"

/** The global switch and the rules per main category (direction only). */
export function useInstallmentSettings() {
  const apiFetch = useApiFetch()
  const settings = useQuery<InstallmentSettings>({
    queryKey: apiQueryKeys.installmentPlans.settings,
    queryFn: () => apiFetch(`${BASE}/parametres`),
  })
  const rules = useQuery<InstallmentCategoryRule[]>({
    queryKey: apiQueryKeys.installmentPlans.rules,
    queryFn: () => apiFetch(`${BASE}/regles`),
  })
  return { settings, rules }
}

export function useInstallmentPlanList(status: MaybeRefOrGetter<InstallmentPlanStatus | "">) {
  const apiFetch = useApiFetch()
  return useQuery<InstallmentPlan[]>({
    queryKey: computed(() => apiQueryKeys.installmentPlans.list(toValue(status))),
    queryFn: () => {
      const value = toValue(status)
      return apiFetch(`${BASE}/admin/plans`, { query: value ? { statut: value } : {} })
    },
  })
}

export function useInstallmentMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.installmentPlans.all })
  const plan = (reference: string, action: string) => `${BASE}/admin/plans/${encodeURIComponent(reference)}/${action}`
  return {
    updateSettings: useMutation({
      mutationFn: (body: InstallmentSettingsUpdate) => apiWrite(`${BASE}/parametres`, { method: "PATCH", body }),
      onSuccess: refresh,
    }),
    updateRule: useMutation({
      mutationFn: ({ categoryId, body }: { categoryId: string; body: InstallmentRuleInput }) =>
        apiWrite(`${BASE}/regles/${encodeURIComponent(categoryId)}`, { method: "PUT", body }),
      onSuccess: refresh,
    }),
    cancelForFailure: useMutation({
      mutationFn: ({ reference, motif }: { reference: string; motif: string }) =>
        apiWrite(plan(reference, "defaillance"), { method: "POST", body: { motif } }),
      onSuccess: refresh,
    }),
    markRefunded: useMutation({
      mutationFn: ({ reference, note }: { reference: string; note: string }) =>
        apiWrite(plan(reference, "remboursement"), { method: "POST", body: { note } }),
      onSuccess: refresh,
    }),
    refundViaGateway: useMutation({
      mutationFn: (reference: string) =>
        apiWrite(plan(reference, "remboursement/passerelle"), { method: "POST", body: {} }),
      onSuccess: refresh,
    }),
    reconcileRefund: useMutation({
      mutationFn: (reference: string) => apiWrite(plan(reference, "remboursement/rapprocher"), { method: "POST" }),
      onSuccess: refresh,
    }),
    retryConversion: useMutation({
      mutationFn: (reference: string) => apiWrite(plan(reference, "conversion"), { method: "POST" }),
      onSuccess: refresh,
    }),
  }
}
