import type {
  FocalPointMember,
  FocalPointShop,
  FocalPointShopFilters,
  FocalPointShopsPage,
  FocalShopOrdersPage,
} from "@/types/api/points-focaux"
import type { MaybeRefOrGetter } from "vue"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const BASE = "/points-focaux"

/** The team members holding the KATI focal point role (direction). */
export function useFocalPointMembers() {
  const apiFetch = useApiFetch()
  return useQuery<FocalPointMember[]>({
    queryKey: apiQueryKeys.focalPoints.members,
    queryFn: () => apiFetch(BASE),
  })
}

/** The shops and their focal point, for the assignment screen (direction). */
export function useFocalPointShops(filters: MaybeRefOrGetter<FocalPointShopFilters>) {
  const apiFetch = useApiFetch()
  const query = computed(() => toValue(filters))
  return useQuery<FocalPointShopsPage>({
    queryKey: computed(() => apiQueryKeys.focalPoints.shops(query.value)),
    queryFn: () => apiFetch(`${BASE}/boutiques`, { query: query.value }),
    placeholderData: keepPreviousData,
  })
}

/** Assigns a shop to a focal point, or removes it (`membreId: null`). */
export function useAssignFocalPoint() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shopId, membreId }: { shopId: string; membreId: string | null }) =>
      apiWrite<FocalPointShop>(`${BASE}/boutiques/${encodeURIComponent(shopId)}`, {
        method: "PUT",
        body: { membreId },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.focalPoints.all }),
  })
}

/** The shops assigned to the focal point who is signed in. */
export function useMyFocalShops() {
  const apiFetch = useApiFetch()
  return useQuery<FocalPointShop[]>({
    queryKey: apiQueryKeys.focalPoints.mine,
    queryFn: () => apiFetch(`${BASE}/mes-boutiques`),
  })
}

/** A shop's orders with the customers' contact details (read only). */
export function useFocalShopOrders(shopId: MaybeRefOrGetter<string | null>, page: MaybeRefOrGetter<number>) {
  const apiFetch = useApiFetch()
  const id = computed(() => toValue(shopId))
  const current = computed(() => toValue(page))
  return useQuery<FocalShopOrdersPage>({
    queryKey: computed(() => apiQueryKeys.focalPoints.orders(id.value, current.value)),
    queryFn: () =>
      apiFetch(`${BASE}/boutiques/${encodeURIComponent(id.value!)}/commandes`, { query: { page: current.value } }),
    enabled: computed(() => Boolean(id.value)),
    placeholderData: keepPreviousData,
  })
}
