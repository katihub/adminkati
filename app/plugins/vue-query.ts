import { dehydrate, hydrate, MutationCache, QueryCache, QueryClient, VueQueryPlugin } from "@tanstack/vue-query"

export default defineNuxtPlugin({
  name: "vue-query",
  setup(nuxtApp) {
    let authFailure: ReturnType<typeof useAuthFailure>
    const handleAuthFailure = (error: unknown) => {
      void authFailure.handle(error)
    }
    const queryClient = new QueryClient({
      queryCache: new QueryCache({ onError: handleAuthFailure }),
      mutationCache: new MutationCache({ onError: handleAuthFailure }),
      defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
    })
    authFailure = useAuthFailure(queryClient)
    if (nuxtApp.payload.state["vue-query"]) hydrate(queryClient, nuxtApp.payload.state["vue-query"] as any)
    nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
    if (import.meta.server) {
      nuxtApp.hook("app:rendered", () => {
        nuxtApp.payload.state["vue-query"] = dehydrate(queryClient)
      })
    }
    return { provide: { queryClient } }
  },
})
