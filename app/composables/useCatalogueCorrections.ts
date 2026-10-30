import type {
  AdminMarketplaceProduct,
  MarketplaceProductCorrection,
  MarketplaceOfferCorrection,
} from "@/types/api/catalogue-products"
import { useMutation, useQueryClient } from "@tanstack/vue-query"

export function useCatalogueCorrections() {
  const api = useApiWrite()
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: ["v1", "marketplace"] })
  const product = useMutation({
    mutationFn: ({ id, body }: { id: string; body: MarketplaceProductCorrection }) =>
      api(`/marketplace/administration/produits/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: refresh,
  })
  const create = useMutation({
    mutationFn: (body: {
      nom: string
      slug: string
      categorieId: string
      marque?: string
      description?: string
      descriptionCourte?: string
      ficheTechnique?: string
    }) => api<Pick<AdminMarketplaceProduct, "id">>("/marketplace/produits", { method: "POST", body }),
    onSuccess: refresh,
  })
  const offer = useMutation({
    mutationFn: ({ id, body }: { id: string; body: MarketplaceOfferCorrection }) =>
      api(`/marketplace/administration/offres/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: refresh,
  })
  return { product, create, offer }
}
