import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useDeliveryIntervals } from "@/composables/useDeliveryIntervals"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PATH = "/api/v1/catalogue/administration/delais-livraison"

async function mountProbe() {
  let query!: ReturnType<typeof useDeliveryIntervals>
  const Probe = defineComponent({
    setup() {
      query = useDeliveryIntervals()
      return () => h("div")
    },
  })
  const wrapper = await mountSuspended(Probe)
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 50))
  await flushPromises()
  return { wrapper, query }
}

describe("useDeliveryIntervals", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("fetches the delivery intervals array under the deliveryIntervals key", async () => {
    const options = [
      { id: 1, min_valeur: 2, max_valeur: null, unite: "jours", est_defaut: true, actif: true, utilise_par: 3 },
    ]
    const cleanup = registerEndpoint(PATH, { method: "GET", handler: () => options })

    const { wrapper, query } = await mountProbe()

    expect(query.data.value).toEqual(options)
    expect(useNuxtApp().$queryClient.getQueryData(apiQueryKeys.deliveryIntervals.all)).toEqual(options)
    wrapper.unmount()
    cleanup()
  })
})
