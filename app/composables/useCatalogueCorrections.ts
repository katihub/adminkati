import type {
  AdminMarketplaceProduct,
  OfferAvailabilityInput,
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
  const availability = useMutation({
    mutationFn: ({ id, body }: { id: string; body: OfferAvailabilityInput }) =>
      api(`/marketplace/administration/offres/${encodeURIComponent(id)}/disponibilite`, { method: "PATCH", body }),
    onSuccess: refresh,
  })
  /** Every offer of the product at once; `sansPieces` lists tracked offers still without stock. */
  const productAvailability = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Omit<OfferAvailabilityInput, "quantite"> }) =>
      api<{ offres: number; sansPieces: string[] }>(
        `/marketplace/administration/produits/${encodeURIComponent(id)}/disponibilite`,
        { method: "PATCH", body },
      ),
    onSuccess: refresh,
  })
  return { product, create, offer, availability, productAvailability }
}
