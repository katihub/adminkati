import type { StatutDevis } from "@/types/api/devis"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

export const useQuoteWorkspaceStore = defineStore("quote-workspace", () => {
  const status = ref<StatutDevis>()
  const filters = computed(() => (status.value ? { statut: status.value } : {}))

  function setStatus(value: StatutDevis | undefined) {
    status.value = value
  }

  function $reset() {
    status.value = undefined
  }

  return { filters, setStatus, $reset }
})
