import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

export interface ReportedReview {
  id: string
  note: number
  commentaire: string | null
  statut: "publie" | "signale" | "masque"
  dimension: "produit" | "vendeur" | "livraison"
  creeLe: string
  signaleLe: string | null
  modereLe: string | null
  auteur: string
  ville: string | null
  ligne: { offreTitreCapture: string; sousCommande: { reference: string; boutique: { nom: string; slug: string } } }
  signalements: Array<{ id: string; auteurType: string; motif: string; creeLe: string }>
}

/** Reviews reported since their last moderation (direction only). */
export function useReportedReviews() {
  const apiFetch = useApiFetch()
  return useQuery<ReportedReview[]>({
    queryKey: apiQueryKeys.reportedReviews.all,
    queryFn: () => apiFetch("/marketplace/reputation/avis/a-moderer"),
  })
}

export function useReviewModeration() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, statut, motif }: { id: string; statut: "publie" | "masque"; motif: string }) =>
      apiWrite(`/marketplace/reputation/avis/${encodeURIComponent(id)}/moderation`, {
        method: "POST",
        body: { statut, motif },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.reportedReviews.all }),
  })
}
