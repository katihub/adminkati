import type { TeamNotificationsPage } from "@/utils/notifications"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"

const KEY = ["v1", "notifications-app", "equipe"] as const

/** The bell counter: checked every 30 seconds, and again whenever the tab comes back into focus. */
export function useTeamNotificationCount() {
  const api = useApiFetch()
  return useQuery<{ nonLues: number }>({
    queryKey: [...KEY, "compteur"],
    queryFn: () => api("/notifications-app/equipe/compteur"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

/** Newest first, a page at a time; `suivant` is the date the next page starts before. */
export function useTeamNotifications(limite = 20) {
  const api = useApiFetch()
  return useInfiniteQuery<TeamNotificationsPage>({
    queryKey: [...KEY, "liste", limite],
    queryFn: ({ pageParam }) =>
      api("/notifications-app/equipe", { query: { limite, ...(pageParam ? { avant: pageParam } : {}) } }),
    initialPageParam: "",
    getNextPageParam: page => page.suivant ?? undefined,
    refetchInterval: 60_000,
  })
}

export function useTeamNotificationMutations() {
  const api = useApiWrite()
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: KEY })
  return {
    markRead: useMutation({
      mutationFn: (id: string) => api(`/notifications-app/equipe/${encodeURIComponent(id)}/lue`, { method: "POST" }),
      onSuccess: refresh,
    }),
    markAllRead: useMutation({
      mutationFn: () => api("/notifications-app/equipe/tout-lu", { method: "POST" }),
      onSuccess: refresh,
    }),
  }
}
