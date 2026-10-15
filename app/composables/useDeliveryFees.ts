import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

/** The priced modes: Kati Express, shop delivery and travel-agency shipping. Pickup is always free and has no fee. */
export type DeliveryMode = "katihub" | "vendeur" | "agence"

export interface DeliveryFee {
  id: string
  ville: string
  mode: DeliveryMode
  montantFcfa: number
  gratuitDesFcfa: number | null
  actif: boolean
  creeLe: string
  modifieLe: string
}

export interface DeliveryFeeInput {
  ville: string
  mode: DeliveryMode
  montantFcfa: number
  gratuitDesFcfa?: number
}

export interface DeliveryFeeUpdate {
  montantFcfa?: number
  /** `null` removes the free-delivery threshold. */
  gratuitDesFcfa?: number | null
  actif?: boolean
}

/** KatiHub's delivery fee grid, inactive tariffs included (direction only). */
export function useDeliveryFees() {
  const apiFetch = useApiFetch()
  return useQuery<DeliveryFee[]>({
    queryKey: apiQueryKeys.deliveryFees.admin,
    queryFn: () => apiFetch("/marketplace/livraison/tarifs/administration"),
  })
}

export function useDeliveryFeeMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.deliveryFees.all })
  const create = useMutation({
    mutationFn: (body: DeliveryFeeInput) => apiWrite("/marketplace/livraison/tarifs", { method: "POST", body }),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: DeliveryFeeUpdate }) =>
      apiWrite(`/marketplace/livraison/tarifs/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`/marketplace/livraison/tarifs/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })
  return { create, update, remove }
}
