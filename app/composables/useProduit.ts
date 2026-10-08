import type { ProductDetail } from "@/types/api/produits"
import type { MaybeRefOrGetter } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

/**
 * `id` is nullable so a consumer can hold this query open across "no selection yet"
 * states (add mode, an empty catalogue) without a conditional composable call — the
 * query simply stays disabled until a real id arrives.
 */
/**
 * `autorise` EXISTE PARCE QU'UN IDENTIFIANT NE SUFFIT PAS À AVOIR LE DROIT.
 *
 * La fiche produit est `@Roles(direction, comptoir)`. La requête n'était
 * conditionnée qu'à la présence d'un identifiant : ouvrir une commande en
 * préparation tirait donc six appels, six 403 dans les journaux du backend,
 * et six vignettes qui n'arrivaient jamais — sans que rien ne l'explique à
 * l'écran. Les appelants qui calculent déjà ce droit le passent ici.
 */
export function useProduit(id: MaybeRefOrGetter<number | null>, autorise: MaybeRefOrGetter<boolean> = true) {
  const currentId = computed(() => toValue(id))

  return useQuery<ProductDetail>({
    queryKey: computed(() => apiQueryKeys.products.detail(currentId.value)),
    queryFn: () => useApiFetch()<ProductDetail>(`/catalogue/administration/produits/${currentId.value}`),
    enabled: computed(() => currentId.value !== null && toValue(autorise)),
  })
}
