import type {
  AjusterStockInput,
  ChangerDisponibiliteInput,
  ChangerStatutStockInput,
  InventaireHistorique,
  InventaireProduit,
} from "@/types/api/inventaire"
import type { MaybeRefOrGetter } from "vue"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const HISTORY_PAGE_SIZE = 20

function productPath(productId: number) {
  return `/catalogue/administration/produits/${productId}`
}

function inventoryPath(productId: number) {
  return `${productPath(productId)}/inventaire`
}

/** Pages of the movement history, newest first; the first page also carries the current stock state. */
export function useProductInventory(productId: MaybeRefOrGetter<number>) {
  const id = computed(() => toValue(productId))

  return useInfiniteQuery<InventaireHistorique>({
    queryKey: computed(() => apiQueryKeys.products.inventory(id.value)),
    queryFn: ({ pageParam }) =>
      useApiFetch()<InventaireHistorique>(inventoryPath(id.value), {
        query: { page: pageParam, taille: HISTORY_PAGE_SIZE },
      }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
  })
}

/** Every stock write changes what the list, the detail, the history and the overview statistics show. */
function useInvalidateInventory(productId: MaybeRefOrGetter<number>) {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all }),
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.inventory(toValue(productId)) }),
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.statistics.overview() }),
    ])
}

export function useAdjustProductInventory(productId: MaybeRefOrGetter<number>) {
  const write = useApiWrite()
  const invalidate = useInvalidateInventory(productId)

  return useMutation<InventaireProduit, Error, AjusterStockInput>({
    mutationFn: input =>
      write<InventaireProduit>(`${inventoryPath(toValue(productId))}/mouvements`, { method: "POST", body: input }),
    onSuccess: () => {
      void invalidate()
    },
  })
}

/** A refused change (e.g. stock arrived meanwhile) leaves the screen stale, so it reloads on failure too. */
export function useSetProductStockStatus(productId: MaybeRefOrGetter<number>) {
  const write = useApiWrite()
  const invalidate = useInvalidateInventory(productId)

  return useMutation<InventaireProduit, Error, ChangerStatutStockInput>({
    mutationFn: input =>
      write<InventaireProduit>(`${inventoryPath(toValue(productId))}/statut`, { method: "PATCH", body: input }),
    onSettled: () => {
      void invalidate()
    },
  })
}

/** The selling status is the direction's call, apart from the count: it never creates a stock row or a movement. */
export function useSetProductAvailability(productId: MaybeRefOrGetter<number>) {
  const write = useApiWrite()
  const invalidate = useInvalidateInventory(productId)

  return useMutation<InventaireProduit, Error, ChangerDisponibiliteInput>({
    mutationFn: input =>
      write<InventaireProduit>(`${productPath(toValue(productId))}/disponibilite`, { method: "PATCH", body: input }),
    onSettled: () => {
      void invalidate()
    },
  })
}
