import type { TeamDirectoryPage, TeamDirectoryQuery, TeamMember } from "@/types/api/equipe"
import type { QueryClient } from "@tanstack/vue-query"
import type { MaybeRefOrGetter } from "vue"
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export type TeamFilters = Omit<TeamDirectoryQuery, "page">

function nextTeamPage(lastPage: TeamDirectoryPage) {
  return lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined
}

export function prefetchTeam(queryClient: QueryClient, filters: TeamFilters) {
  const apiFetch = useApiFetch()

  return queryClient.prefetchInfiniteQuery<TeamDirectoryPage>({
    queryKey: apiQueryKeys.team.list(filters),
    queryFn: ({ pageParam }) =>
      apiFetch<TeamDirectoryPage>("/equipe/membres/annuaire", {
        query: { ...filters, page: pageParam },
      }),
    initialPageParam: 1,
    getNextPageParam: nextTeamPage,
  })
}

export function useTeam(filters: MaybeRefOrGetter<TeamFilters> = {}) {
  const currentFilters = computed(() => toValue(filters))

  return useInfiniteQuery<TeamDirectoryPage>({
    queryKey: computed(() => apiQueryKeys.team.list(currentFilters.value)),
    queryFn: ({ pageParam }) =>
      useApiFetch()<TeamDirectoryPage>("/equipe/membres/annuaire", {
        query: { ...currentFilters.value, page: pageParam },
      }),
    initialPageParam: 1,
    getNextPageParam: nextTeamPage,
  })
}

export function useTeamMember(id: MaybeRefOrGetter<string | null | undefined>) {
  const apiFetch = useApiFetch()
  const memberId = computed(() => toValue(id))

  return useQuery<TeamMember>({
    queryKey: computed(() => apiQueryKeys.team.detail(memberId.value)),
    queryFn: () => apiFetch<TeamMember>(`/equipe/membres/${encodeURIComponent(memberId.value ?? "")}`),
    enabled: computed(() => Boolean(memberId.value)),
  })
}
