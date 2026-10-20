import type { AnnonceAdmin } from "@/types/api/vitrine"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

export const ANNONCES_PATH = "/vitrine/administration/annonces"

export function useAnnonces() {
  const apiFetch = useApiFetch()
  return useQuery<AnnonceAdmin[]>({
    queryKey: apiQueryKeys.announcements.all,
    queryFn: () => apiFetch<AnnonceAdmin[]>(ANNONCES_PATH),
  })
}

export function useAnnonceMutations() {
  const write = useApiWrite()
  const client = useQueryClient()
  const invalidate = () => client.invalidateQueries({ queryKey: apiQueryKeys.announcements.all })
  return {
    create: useMutation({
      mutationFn: (texte: string) => write<AnnonceAdmin>(ANNONCES_PATH, { method: "POST", body: { texte } }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: number; texte?: string; active?: boolean }) =>
        write<AnnonceAdmin>(`${ANNONCES_PATH}/${id}`, { method: "PATCH", body }),
      onSuccess: invalidate,
    }),
    reorder: useMutation({
      mutationFn: (ids: number[]) =>
        write<AnnonceAdmin[]>(`${ANNONCES_PATH}/reordonner`, { method: "POST", body: { ids } }),
      onSuccess: invalidate,
    }),
  }
}
