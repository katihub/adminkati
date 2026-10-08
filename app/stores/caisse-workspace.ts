import type { StatutRemiseCaisse } from "@/types/api/caisse"
import { defineStore } from "pinia"
import { ref } from "vue"

/**
 * `"attention"` is `ouverte ∪ litige`, the same definition `GET /caisses/encours` uses for
 *  outstanding cash — a selectable value, not the default. `undefined` means no filter (all
 *  statuses), and that's where the filter starts.
 */
export type CaisseStatusFilter = StatutRemiseCaisse | "attention" | undefined

export const useCaisseWorkspaceStore = defineStore("caisse-workspace", () => {
  const searchTerm = ref("")
  const statusFilter = ref<CaisseStatusFilter>(undefined)
  const selectedPorteurId = ref<string | null>(null)

  function setSearchTerm(value: string) {
    searchTerm.value = value
  }

  function setStatusFilter(value: CaisseStatusFilter) {
    statusFilter.value = value
  }

  function setSelectedPorteur(value: string | null) {
    selectedPorteurId.value = value
  }

  function $reset() {
    searchTerm.value = ""
    statusFilter.value = undefined
    selectedPorteurId.value = null
  }

  return { searchTerm, statusFilter, selectedPorteurId, setSearchTerm, setStatusFilter, setSelectedPorteur, $reset }
})
