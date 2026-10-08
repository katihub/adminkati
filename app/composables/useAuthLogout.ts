import { useQueryClient } from "@tanstack/vue-query"
import { useAdminUiReset } from "./useAdminUiReset"

export function useAuthLogout(queryClient = useQueryClient()) {
  const { $csrfFetch } = useNuxtApp()
  const resetAdminUi = useAdminUiReset()

  return async function logout() {
    try {
      await $csrfFetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Local auth state must still be cleared when the server is unreachable.
    } finally {
      queryClient.clear()
      resetAdminUi()
    }
  }
}
