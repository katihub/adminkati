import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError } from "h3"
import { createPinia, setActivePinia } from "pinia"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useAuthLogout } from "@/composables/useAuthLogout"
import { useOrderWorkspaceStore } from "@/stores/order-workspace"
import { useProductListStore } from "@/stores/product-list"

const successfulLogout = () => null
function failedLogout() {
  throw createError({ statusCode: 503 })
}

describe("admin UI state reset", () => {
  it.each([
    ["successful", successfulLogout],
    ["failed", failedLogout],
  ] as const)("clears session UI and query state after %s logout", async (_outcome, handler) => {
    const cleanup = registerEndpoint("/api/auth/logout", { method: "POST", handler })
    let queryClient: ReturnType<typeof useNuxtApp>["$queryClient"] | undefined
    const Probe = defineComponent({
      async setup() {
        const pinia = createPinia()
        setActivePinia(pinia)
        const products = useProductListStore()
        products.setSearchTerm("phone")
        queryClient = useNuxtApp().$queryClient
        queryClient.setQueryData(["v1", "moi"], { userId: "u1" })
        await useAuthLogout(queryClient)()
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(useProductListStore().filters).toEqual({ etat: "tous", tri: "recent", page: 1, taille: 50 })
    expect(useOrderWorkspaceStore().filters).toEqual({ tri: "recent", taille: 50 })
    expect(queryClient?.getQueryData(["v1", "moi"])).toBeUndefined()

    cleanup()
    wrapper.unmount()
    queryClient?.clear()
  })
})
