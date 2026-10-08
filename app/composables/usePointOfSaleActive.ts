import type { PointVenteAdmin } from "@/types/api/vitrine"
import { computed } from "vue"
import { usePointVenteMutations } from "@/composables/usePointsVente"
import { apiErrorText } from "@/utils/api-error"
import { pointOfSaleErrorToast, pointOfSaleToast } from "@/utils/point-of-sale-toast"

/** Showing or hiding a counter on the storefront, from its row, its menu or the delete dialog. */
export function usePointOfSaleActive() {
  const { t } = useI18n()
  const { update } = usePointVenteMutations()

  /** The row whose switch is in flight, so only that one is disabled. */
  const pendingId = computed(() => (update.isPending.value ? (update.variables.value?.id ?? null) : null))

  function setActive(point: PointVenteAdmin, active: boolean, onDone?: () => void) {
    if (update.isPending.value) return
    update.mutate(
      { id: point.id, patch: { active } },
      {
        onSuccess: () => {
          onDone?.()
          if (active) {
            pointOfSaleToast(t("pointsOfSale.toast.shown", { name: point.libelle }))
            return
          }
          pointOfSaleToast(t("pointsOfSale.toast.hidden", { name: point.libelle }), {
            label: t("pointsOfSale.toast.undo"),
            onClick: () => setActive(point, true),
          })
        },
        onError: error => pointOfSaleErrorToast(apiErrorText(error, t)),
      },
    )
  }

  return { setActive, pendingId, isPending: update.isPending }
}
