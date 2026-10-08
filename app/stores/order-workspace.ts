import type { ListerCommandesEquipeQuery, StatutCommande } from "@/types/api/commandes"
import type { OrderDateRange } from "@/utils/order-date-range"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

type OrderSort = NonNullable<ListerCommandesEquipeQuery["tri"]>

export const useOrderWorkspaceStore = defineStore("order-workspace", () => {
  const searchTerm = ref("")
  const status = ref<StatutCommande>()
  const comptoirs = ref<string[]>([])
  const sort = ref<OrderSort>("recent")
  const dateRange = ref<OrderDateRange>()
  const pageSize = 50

  const filters = computed<ListerCommandesEquipeQuery>(() => ({
    ...(searchTerm.value.trim() ? { q: searchTerm.value.trim() } : {}),
    ...(status.value ? { statut: status.value } : {}),
    // Aucun comptoir coché = pas de filtre du tout : l'annuaire garde tout, les
    // livraisons à domicile comprises. Envoyer `[]` poserait une question vide.
    ...(comptoirs.value.length > 0 ? { comptoir: [...comptoirs.value] } : {}),
    tri: sort.value,
    taille: pageSize,
  }))

  function setSearchTerm(value: string) {
    searchTerm.value = value
  }

  function setStatus(value: StatutCommande | undefined) {
    status.value = value
  }

  function setComptoirs(value: string[]) {
    comptoirs.value = [...value]
  }

  function setSort(value: OrderSort | undefined) {
    sort.value = value ?? "recent"
  }

  function setDateRange(value: OrderDateRange | undefined) {
    dateRange.value = value
  }

  function $reset() {
    searchTerm.value = ""
    status.value = undefined
    comptoirs.value = []
    sort.value = "recent"
    dateRange.value = undefined
  }

  return { filters, dateRange, setSearchTerm, setStatus, setComptoirs, setSort, setDateRange, $reset }
})
