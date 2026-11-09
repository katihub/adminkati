import type { AccountAction, AccountActionResult, AccountDetail, AccountSummary } from "@/types/api/accounts"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { accountActionPath } from "@/utils/account-access"

const KEY = ["v1", "comptes"] as const

/** Customers and sellers matching an e-mail, a name or a phone (3 characters at least). */
export function useAccountSearch(query: MaybeRefOrGetter<string>) {
  const apiFetch = useApiFetch()
  const q = computed(() => toValue(query).trim())
  return useQuery<AccountSummary[]>({
    queryKey: computed(() => [...KEY, "recherche", q.value]),
    queryFn: () => apiFetch("/comptes", { query: { q: q.value } }),
    enabled: computed(() => q.value.length >= 3),
  })
}

/** One account: who it is, its sign-in state, and what the caller may do. */
export function useAccountDetail(email: MaybeRefOrGetter<string | null | undefined>) {
  const apiFetch = useApiFetch()
  const courriel = computed(() => toValue(email)?.trim().toLowerCase() ?? "")
  return useQuery<AccountDetail>({
    queryKey: computed(() => [...KEY, "detail", courriel.value]),
    queryFn: () => apiFetch("/comptes/detail", { query: { courriel: courriel.value } }),
    enabled: computed(() => courriel.value.includes("@")),
    retry: false,
  })
}

export function useAccountAction() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ courriel, action, motif }: { courriel: string; action: AccountAction; motif?: string }) =>
      apiWrite<AccountActionResult>(accountActionPath(action), {
        method: "POST",
        body: { courriel, ...(motif ? { motif } : {}) },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
