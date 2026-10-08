import type { ProduitCreateInput } from "@/schemas/produit"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useUpdateProduit } from "@/composables/useProduitMutations"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PRODUIT_INPUT = { nom: "Casque test", prix: 10_000 } as ProduitCreateInput

function seedProductCaches(queryClient: ReturnType<typeof useNuxtApp>["$queryClient"], id: number) {
  queryClient.setQueryData(apiQueryKeys.products.list({ etat: "actifs" }), {
    produits: [],
    total: 0,
    page: 1,
    pages: 1,
    taille: 50,
  })
  queryClient.setQueryData(apiQueryKeys.products.detail(id), { id })
}

describe("produit mutations", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("invalidates both the product's own detail and every list on update", async () => {
    const queryClient = useNuxtApp().$queryClient
    seedProductCaches(queryClient, 42)
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits/42", {
      method: "PATCH",
      handler: () => ({ id: 42, nom: "Renamed" }),
    })

    const Probe = defineComponent({
      async setup() {
        const update = useUpdateProduit(42)
        await update.mutateAsync(PRODUIT_INPUT)
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(queryClient.getQueryState(apiQueryKeys.products.list({ etat: "actifs" }))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(apiQueryKeys.products.detail(42))?.isInvalidated).toBe(true)

    cleanup()
    wrapper.unmount()
  })
})
