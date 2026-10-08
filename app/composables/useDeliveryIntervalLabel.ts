import type { DelaiLivraison } from "@/types/api/delais-livraison"
import { deliveryIntervalLabel } from "@/utils/delivery-interval"

type IntervalValue = Pick<DelaiLivraison, "min_valeur" | "max_valeur" | "unite">

export function useDeliveryIntervalLabel() {
  const { t } = useI18n()

  return (option: IntervalValue) => {
    const { key, count, params } = deliveryIntervalLabel(option)
    return t(key, params, count)
  }
}
