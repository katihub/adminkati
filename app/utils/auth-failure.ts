import type { QueryClient } from "@tanstack/vue-query"
import { toApiError } from "./api-error"

export type AuthFailureReason = "deactivated"

interface AuthFailureDependencies {
  queryClient: Pick<QueryClient, "clear">
  logout: () => Promise<unknown>
  probe: () => Promise<{ type?: string }>
  redirect: (reason?: AuthFailureReason) => unknown
}

export function createAuthFailureHandler(dependencies: AuthFailureDependencies) {
  let forbiddenProbe: Promise<void> | undefined

  async function logoutAndRedirect(reason?: AuthFailureReason) {
    await dependencies.logout()
    dependencies.queryClient.clear()
    await dependencies.redirect(reason)
  }

  async function handle(error: unknown): Promise<void> {
    const status = toApiError(error).status
    if (status === 401) {
      await logoutAndRedirect()
      return
    }
    if (status !== 403) return

    forbiddenProbe ||= (async () => {
      try {
        const identity = await dependencies.probe()
        if (identity.type !== "equipe") await logoutAndRedirect()
      } catch (probeError) {
        if (toApiError(probeError).status === 403) await logoutAndRedirect("deactivated")
      }
    })().finally(() => {
      forbiddenProbe = undefined
    })

    await forbiddenProbe
  }

  return { handle }
}
