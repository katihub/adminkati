import type { CreateCategoryInput, MarketplaceCategory, UpdateCategoryInput } from "@/types/api/marketplace-categories"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

/** The whole marketplace category tree, inactive nodes included (direction only). */
export function useMarketplaceCategories() {
  const apiFetch = useApiFetch()
  return useQuery<MarketplaceCategory[]>({
    queryKey: apiQueryKeys.marketplaceCategories.admin,
    queryFn: () => apiFetch("/marketplace/categories/administration"),
  })
}

export function useMarketplaceCategoryMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceCategories.all })
  const create = useMutation({
    mutationFn: (body: CreateCategoryInput) => apiWrite("/marketplace/categories", { method: "POST", body }),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCategoryInput }) =>
      apiWrite(`/marketplace/categories/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => apiWrite(`/marketplace/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })
  return { create, update, remove }
}
