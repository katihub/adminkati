import type {
  OutboundDispatchReport,
  OutboundNotification,
  OutboundNotificationFilters,
  OutboundNotificationsPage,
  OutboundNotificationsSummary,
} from "@/types/api/notifications"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PATH = "/notifications"

export function useOutboundNotificationsSummary() {
  const apiFetch = useApiFetch()
  return useQuery<OutboundNotificationsSummary>({
    queryKey: apiQueryKeys.outboundNotifications.summary,
    queryFn: () => apiFetch(`${PATH}/synthese`),
    refetchInterval: 30_000,
  })
}

export function useOutboundNotifications(filters: MaybeRefOrGetter<OutboundNotificationFilters>) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))
  return useQuery<OutboundNotificationsPage>({
    queryKey: computed(() => apiQueryKeys.outboundNotifications.list(params.value)),
    queryFn: () => apiFetch(PATH, { query: params.value }),
  })
}

export function useOutboundNotificationMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.outboundNotifications.all })

  const retry = useMutation<OutboundNotification, Error, string>({
    mutationFn: id => apiWrite(`${PATH}/${encodeURIComponent(id)}/relancer`, { method: "POST" }),
    onSuccess: refresh,
  })
  const dispatch = useMutation<OutboundDispatchReport, Error, void>({
    mutationFn: () => apiWrite(`${PATH}/traiter`, { method: "POST" }),
    onSuccess: refresh,
  })
  return { retry, dispatch }
}
