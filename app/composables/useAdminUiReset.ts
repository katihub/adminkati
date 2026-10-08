import type { Pinia } from "pinia"
import { useOrderWorkspaceStore } from "@/stores/order-workspace"
import { useProductListStore } from "@/stores/product-list"

export function useAdminUiReset(pinia: Pinia = usePinia()) {
  return function resetAdminUi() {
    useProductListStore(pinia).$reset()
    useOrderWorkspaceStore(pinia).$reset()
  }
}
