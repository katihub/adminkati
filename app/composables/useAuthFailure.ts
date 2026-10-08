import { useQueryClient } from "@tanstack/vue-query"
import { createAuthFailureHandler } from "@/utils/auth-failure"
import { useAuthLogout } from "./useAuthLogout"

export function useAuthFailure(queryClient = useQueryClient()) {
  const nuxtApp = useNuxtApp()
  const logout = useAuthLogout(queryClient)

  return createAuthFailureHandler({
    queryClient,
    logout,
    probe: () => $fetch<{ type?: string }>("/api/v1/moi"),
    redirect: reason => {
      const locale = nuxtApp.$i18n.locale.value
      const route = nuxtApp.$router.currentRoute.value
      return navigateTo({
        path: locale === "en" ? "/login" : `/${locale}/connexion`,
        query: { next: route.fullPath, ...(reason ? { reason } : {}) },
      })
    },
  })
}
