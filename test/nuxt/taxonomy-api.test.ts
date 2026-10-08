import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getMethod, readBody } from "h3"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useTaxonomy } from "@/composables/useTaxonomy"
import { useTaxonomyMutations } from "@/composables/useTaxonomyMutations"
import { apiQueryKeys } from "@/utils/api-query-keys"

const taxonomy = {
  rayons: [{ id: "network", slug: "network", nom: "Network", nom_court: "Net", compte_total: 2 }],
  categories: [
    {
      id: 7,
      nom: "Routers",
      slug: "routers",
      parent_id: null,
      niveau: 0,
      rayon: "network",
      compte_total: 2,
      masquee: false,
    },
  ],
  marques: [{ nom: "TestBrand", slug: "testbrand", nombre_produits: 2 }],
}

describe("taxonomy API integration", () => {
  it("fetches taxonomy once while exposing categories, departments, and brands", async () => {
    let calls = 0
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/taxonomie", {
      method: "GET",
      handler: () => {
        calls += 1
        return taxonomy
      },
    })
    let first: ReturnType<typeof useTaxonomy> | undefined
    let second: ReturnType<typeof useTaxonomy> | undefined
    const Probe = defineComponent({
      setup() {
        first = useTaxonomy()
        second = useTaxonomy()
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(calls).toBe(1)
    expect(first?.data.value).toEqual(taxonomy)
    expect(second?.categories.value).toEqual(taxonomy.categories)
    expect(second?.departments.value).toEqual(taxonomy.rayons)
    expect(second?.brands.value).toEqual(taxonomy.marques)

    cleanup()
    wrapper.unmount()
  })

  it("creates a category through the BFF, invalidates shared data, and returns its id", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(apiQueryKeys.taxonomy.all, taxonomy)
    queryClient.setQueryData(apiQueryKeys.products.all, { total: 2 })
    let observedMethod = ""
    let observedBody: unknown
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/categories", {
      method: "POST",
      handler: async event => {
        observedMethod = getMethod(event)
        observedBody = await readBody(event)
        return { id: 8, raw_database_column: "not-a-normalized-category" }
      },
    })
    let createdId: number | undefined
    const Probe = defineComponent({
      async setup() {
        const { create } = useTaxonomyMutations()
        const result = await create.mutateAsync({ nom: "Switches", slug: "switches", rayon_id: "network" })
        createdId = result.id
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observedMethod).toBe("POST")
    expect(observedBody).toEqual({ nom: "Switches", slug: "switches", rayon_id: "network" })
    expect(createdId).toBe(8)
    expect(queryClient.getQueryState(apiQueryKeys.taxonomy.all)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(apiQueryKeys.products.all)?.isInvalidated).toBe(true)

    cleanup()
    wrapper.unmount()
    queryClient.clear()
  })
})
