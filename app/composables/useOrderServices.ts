import type { UpdateCategoryInput } from "@/types/api/marketplace-categories"
import type { OrderServicesSettings, OrderServicesSettingsUpdate } from "@/types/api/order-services"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

/** The KATI insurance settings (direction only). */
export function useOrderServicesSettings() {
  const apiFetch = useApiFetch()
  return useQuery<OrderServicesSettings>({
    queryKey: apiQueryKeys.orderServices.settings,
    queryFn: () => apiFetch("/marketplace/services-commande/reglages"),
  })
}

export function useOrderServicesMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const updateSettings = useMutation({
    mutationFn: (body: OrderServicesSettingsUpdate) =>
      apiWrite("/marketplace/services-commande/reglages", { method: "PATCH", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.orderServices.all }),
  })
  /** The installation price of a category lives on the category itself. */
  const updateInstallation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Pick<UpdateCategoryInput, "installationActive" | "installationPrixFcfa">
    }) => apiWrite(`/marketplace/categories/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.marketplaceCategories.all }),
  })
  return { updateSettings, updateInstallation }
}
