import { computed } from "vue"
import { useDeliveryIntervalLabel } from "@/composables/useDeliveryIntervalLabel"
import { useDeliveryIntervals } from "@/composables/useDeliveryIntervals"
import { useTaxonomie } from "@/composables/useTaxonomie"
import { isEmptyValue } from "@/utils/empty-value"

const EMPTY_VALUE = "N/A"

/**
 * History rows store column values, so id columns arrive as bare numbers. Both lookups read lists
 * the product form already keeps in the query cache, and an id they cannot resolve (archived,
 * deleted, list still loading) is shown as-is rather than hidden.
 */
export function useHistoryValueFormatter() {
  const intervalLabel = useDeliveryIntervalLabel()
  const { data: intervals } = useDeliveryIntervals()
  const { data: taxonomie } = useTaxonomie()

  const intervalById = computed(() => new Map((intervals.value ?? []).map(interval => [interval.id, interval])))
  const categoryNameById = computed(
    () => new Map((taxonomie.value?.categories ?? []).map(category => [category.id, category.nom])),
  )

  function resolve(field: string, value: unknown): string | undefined {
    if (field === "delai_livraison_id") {
      const interval = intervalById.value.get(Number(value))
      return interval ? intervalLabel(interval) : undefined
    }
    if (field === "categorie_principale_id") return categoryNameById.value.get(Number(value))
    return undefined
  }

  return (field: string, value: unknown): string => {
    if (isEmptyValue(value)) return EMPTY_VALUE
    return resolve(field, value) ?? String(value)
  }
}
