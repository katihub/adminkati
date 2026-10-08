import type { PointVenteAdmin } from "@/types/api/vitrine"
import { ref, watch } from "vue"
import { usePointVenteMutations } from "@/composables/usePointsVente"
import { apiErrorText, toApiError } from "@/utils/api-error"
import { pointOfSaleToast } from "@/utils/point-of-sale-toast"

/**
 * The delete confirmation and its outcome. The backend's refusal stays inside the dialog rather
 * than in a toast: a 409 is an instruction — which orders still name this counter, and to
 * deactivate it instead — and a toast would take it away before it is read.
 */
export function usePointOfSaleDelete() {
  const { t } = useI18n()
  const { remove } = usePointVenteMutations()

  const target = ref<PointVenteAdmin | null>(null)
  const open = ref(false)
  const error = ref("")
  const refused = ref(false)

  watch(open, isOpen => {
    if (isOpen) return
    error.value = ""
    refused.value = false
  })

  function ask(point: PointVenteAdmin) {
    target.value = point
    open.value = true
  }

  function confirm() {
    const point = target.value
    if (!point) return
    remove.mutate(point.id, {
      onSuccess: () => {
        open.value = false
        pointOfSaleToast(t("pointsOfSale.toast.deleted", { name: point.libelle }))
      },
      onError: removeError => {
        error.value = apiErrorText(removeError, t)
        refused.value = toApiError(removeError).status === 409
      },
    })
  }

  return { target, open, error, refused, ask, confirm, isPending: remove.isPending }
}
