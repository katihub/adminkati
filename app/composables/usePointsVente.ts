import type {
  Comptoir,
  CreerPointVenteInput,
  ModifierPointVenteInput,
  PointVenteAdmin,
  SuppressionPointVente,
} from "@/types/api/vitrine"
import type { Role } from "@/types/session"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { useCachedSession } from "@/composables/useCachedSession"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { sortByIds } from "@/utils/point-of-sale"

export const POINTS_VENTE_PATH = "/vitrine/administration/points-vente"

/**
 * The roles the backend lets through on `GET administration/points-vente`
 * (`vitrine.controller.ts:443`). A `preparation` or `livreur` session asking for
 * the counters gets a 403, so the query stays disabled rather than firing one.
 */
const COMPTOIR_READERS: readonly Role[] = ["direction", "comptoir"]

/** Every counter, closed ones included, in display order. No pagination: a shop has a handful. */
export function usePointsVente(enabled: MaybeRefOrGetter<boolean> = true) {
  const apiFetch = useApiFetch()

  return useQuery<PointVenteAdmin[]>({
    queryKey: apiQueryKeys.pointsOfSale.all,
    queryFn: () => apiFetch<PointVenteAdmin[]>(POINTS_VENTE_PATH),
    enabled: computed(() => toValue(enabled)),
  })
}

/**
 * The published counters, as the key/label pairs every perimeter screen needs —
 * a member's counters, an order's counter, the orders filter. Closed counters are
 * left out: nobody should be attached to a counter customers can no longer reach.
 *
 * `canRead` is false for the roles the backend refuses, and those screens then
 * fall back on the raw key instead of an empty list that would read as "none".
 */
export function useComptoirs() {
  const session = useCachedSession()
  const canRead = computed(() => COMPTOIR_READERS.some(role => session.value?.roles.includes(role) ?? false))
  const { data, isPending, error } = usePointsVente(canRead)

  const comptoirs = computed<Comptoir[]>(() =>
    (Array.isArray(data.value) ? data.value : [])
      .filter(point => point.active)
      .map(point => ({ cle: point.cle, libelle: point.libelle })),
  )

  return { comptoirs, canRead, isPending, error }
}

export function usePointVenteMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const queryKey = apiQueryKeys.pointsOfSale.all

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const create = useMutation<PointVenteAdmin, Error, CreerPointVenteInput>({
    mutationFn: body => apiWrite<PointVenteAdmin>(POINTS_VENTE_PATH, { method: "POST", body }),
    onSuccess: invalidate,
  })

  const update = useMutation<PointVenteAdmin, Error, { id: number; patch: ModifierPointVenteInput }>({
    mutationFn: ({ id, patch }) =>
      apiWrite<PointVenteAdmin>(`${POINTS_VENTE_PATH}/${id}`, { method: "PATCH", body: patch }),
    onSuccess: invalidate,
  })

  /**
   * Optimistic, unlike the other writes. Moving a counter with the keyboard is one press per
   * step, and the list must show the new position at once — otherwise focus follows a row that
   * has not moved yet and the next press reads the old order. A refusal puts the order back.
   */
  const reorder = useMutation<PointVenteAdmin[], Error, number[], { previous?: PointVenteAdmin[] }>({
    mutationFn: ids =>
      apiWrite<PointVenteAdmin[]>(`${POINTS_VENTE_PATH}/reordonner`, { method: "POST", body: { ids } }),
    onMutate: async ids => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<PointVenteAdmin[]>(queryKey)
      if (previous) queryClient.setQueryData(queryKey, sortByIds(previous, ids))
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: invalidate,
  })

  const remove = useMutation<SuppressionPointVente, Error, number>({
    mutationFn: id => apiWrite<SuppressionPointVente>(`${POINTS_VENTE_PATH}/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  return { create, update, reorder, remove }
}
