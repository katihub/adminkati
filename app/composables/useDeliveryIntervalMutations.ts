import type { DelaiLivraison, DelaiLivraisonInput, DelaiLivraisonPatch } from "@/types/api/delais-livraison"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { DELIVERY_INTERVALS_PATH } from "@/composables/useDeliveryIntervals"
import { apiQueryKeys } from "@/utils/api-query-keys"

export interface UpdateDeliveryIntervalVariables {
  id: number
  patch: DelaiLivraisonPatch
}

function useIntervalWrite() {
  const queryClient = useQueryClient()
  const write = useApiWrite()

  /** Products embed the resolved option, so writes that can change what they show refresh them too. */
  function invalidate(affectsProducts: boolean) {
    queryClient.invalidateQueries({ queryKey: apiQueryKeys.deliveryIntervals.all })
    if (affectsProducts) queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
  }

  function patch(id: number, body: DelaiLivraisonPatch) {
    return write<DelaiLivraison>(`${DELIVERY_INTERVALS_PATH}/${id}`, { method: "PATCH", body })
  }

  return { write, invalidate, patch }
}

export function useCreateDeliveryInterval() {
  const { write, invalidate } = useIntervalWrite()

  return useMutation<DelaiLivraison, Error, DelaiLivraisonInput>({
    mutationFn: input => write<DelaiLivraison>(DELIVERY_INTERVALS_PATH, { method: "POST", body: input }),
    onSuccess: () => invalidate(false),
  })
}

export function useUpdateDeliveryInterval() {
  const { patch, invalidate } = useIntervalWrite()

  return useMutation<DelaiLivraison, Error, UpdateDeliveryIntervalVariables>({
    mutationFn: ({ id, patch: body }) => patch(id, body),
    onSuccess: () => invalidate(true),
  })
}

export function useArchiveDeliveryInterval() {
  const { patch, invalidate } = useIntervalWrite()

  return useMutation<DelaiLivraison, Error, number>({
    mutationFn: id => patch(id, { actif: false }),
    onSuccess: () => invalidate(true),
  })
}

export function useRestoreDeliveryInterval() {
  const { patch, invalidate } = useIntervalWrite()

  return useMutation<DelaiLivraison, Error, number>({
    mutationFn: id => patch(id, { actif: true }),
    onSuccess: () => invalidate(false),
  })
}
