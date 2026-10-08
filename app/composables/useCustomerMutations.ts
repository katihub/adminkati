import type { CustomerAccountDetail } from "@/types/api/clients"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

/**
 * SUSPENDRE ET RÉACTIVER, QUI N'AVAIENT AUCUN BOUTON.
 *
 * `POST /clients/:id/suspendre` et `/reactiver` existent depuis le début
 * (`src/profil/profil.controller.ts:104-122`) et la page clients affichait déjà
 * le statut, le filtrait, le coloriait — sans jamais offrir de le changer. Les
 * deux routes rendent la fiche complète (`changerStatut` termine sur
 * `lirePourAdministration`), donc le détail se met à jour sans second appel.
 */
export function useCustomerMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()

  const invalidateCustomers = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.customers.all })

  const suspend = useMutation<CustomerAccountDetail, Error, string>({
    mutationFn: id =>
      apiWrite<CustomerAccountDetail>(`/clients/${encodeURIComponent(id)}/suspendre`, { method: "POST" }),
    onSuccess: invalidateCustomers,
  })

  const reactivate = useMutation<CustomerAccountDetail, Error, string>({
    mutationFn: id =>
      apiWrite<CustomerAccountDetail>(`/clients/${encodeURIComponent(id)}/reactiver`, { method: "POST" }),
    onSuccess: invalidateCustomers,
  })

  return { suspend, reactivate }
}
