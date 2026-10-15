import type { LocalityCity, LocalityUpdate } from "@/types/api/localities"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

/** The cities and neighbourhoods of the storefront's dropdowns (direction only). */
export function useLocalities() {
  const apiFetch = useApiFetch()
  return useQuery<LocalityCity[]>({
    queryKey: apiQueryKeys.localities.admin,
    queryFn: () => apiFetch("/marketplace/localites/administration"),
  })
}

export function useLocalityMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.localities.all })
  const createCity = useMutation({
    mutationFn: (nom: string) => apiWrite("/marketplace/localites/villes", { method: "POST", body: { nom } }),
    onSuccess: invalidate,
  })
  const updateCity = useMutation({
    mutationFn: ({ id, body }: { id: string; body: LocalityUpdate }) =>
      apiWrite(`/marketplace/localites/villes/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: invalidate,
  })
  /** Several neighbourhoods at once; the ones already listed are ignored by the server. */
  const addDistricts = useMutation({
    mutationFn: ({ cityId, noms }: { cityId: string; noms: string[] }) =>
      apiWrite<{ ajoutes: number; ignores: number }>(
        `/marketplace/localites/villes/${encodeURIComponent(cityId)}/quartiers`,
        { method: "POST", body: { noms } },
      ),
    onSuccess: invalidate,
  })
  /** The API takes `active` for a neighbourhood too, and stores it as `actif`. */
  const updateDistrict = useMutation({
    mutationFn: ({ id, body }: { id: string; body: LocalityUpdate }) =>
      apiWrite(`/marketplace/localites/quartiers/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: invalidate,
  })
  return { createCity, updateCity, addDistricts, updateDistrict }
}
