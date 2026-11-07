import type { ProductCheckAction, ProductCheckItem } from "@/types/api/marketplace-product-check"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { productCheckPath } from "@/utils/product-check"

/** The products shops published or changed without validation, newest first (7 November 2026). */
export function useProductChecks() {
  const apiFetch = useApiFetch()
  return useQuery<ProductCheckItem[]>({
    queryKey: apiQueryKeys.marketplaceModeration.productChecks,
    queryFn: () => apiFetch("/marketplace/moderation/produits-a-controler"),
  })
}

export function useProductCheckAction() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, motif }: { id: string; action: ProductCheckAction; motif?: string }) =>
      apiWrite(productCheckPath(id, action), { method: "POST", ...(motif ? { body: { motif } } : {}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceModeration.all }),
  })
}
