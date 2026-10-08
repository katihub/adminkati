import type { PublicSession } from "@/types/session"
import { useQueryClient } from "@tanstack/vue-query"
import { onScopeDispose, shallowRef } from "vue"

/**
 * Reads the session `app.vue` keeps at ["v1", "moi"] instead of owning a second
 * fetch of it. Reactive rather than read-once because that query refetches after
 * hydration and on window focus, and the shell outlives every navigation.
 */
export function useCachedSession(queryClient = useQueryClient()) {
  const read = () => queryClient.getQueryData<PublicSession | null>(["v1", "moi"]) ?? null
  const session = shallowRef<PublicSession | null>(read())

  onScopeDispose(
    queryClient.getQueryCache().subscribe(() => {
      session.value = read()
    }),
  )

  return session
}
