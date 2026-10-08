import type { PointVenteAdmin } from "@/types/api/vitrine"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { usePointVenteMutations } from "@/composables/usePointsVente"
import { apiQueryKeys } from "@/utils/api-query-keys"

const ADMIN_PATH = "/api/v1/vitrine/administration/points-vente"
const listKey = apiQueryKeys.pointsOfSale.all

function makePoint(id: number): PointVenteAdmin {
  return {
    id,
    cle: `Comptoir-${id}`,
    libelle: `Comptoir ${id}`,
    ville: "Douala",
    quartier: `Quartier ${id}`,
    repere: `Repère ${id}`,
    telephones: [],
    carte: null,
    horaires: null,
    latitude: null,
    longitude: null,
    ordre: id * 10,
    active: true,
    creee_le: "2026-09-01T08:00:00.000Z",
    modifiee_le: "2026-09-01T08:00:00.000Z",
    modifiee_par: null,
  }
}

async function withMutations(run: (mutations: ReturnType<typeof usePointVenteMutations>) => Promise<unknown>) {
  const Probe = defineComponent({
    async setup() {
      await run(usePointVenteMutations())
      return () => h("div")
    },
  })
  const wrapper = await mountSuspended(Probe)
  await flushPromises()
  wrapper.unmount()
}

describe("points of sale API", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows the new order before the backend answers", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(listKey, [makePoint(1), makePoint(2), makePoint(3)])
    let orderSeenByServer: number[] | undefined
    const cleanup = registerEndpoint(`${ADMIN_PATH}/reordonner`, {
      method: "POST",
      handler: async event => {
        orderSeenByServer = queryClient.getQueryData<PointVenteAdmin[]>(listKey)?.map(point => point.id)
        return (await readBody<{ ids: number[] }>(event)).ids.map(makePoint)
      },
    })

    await withMutations(m => m.reorder.mutateAsync([3, 1, 2]))

    expect(orderSeenByServer).toEqual([3, 1, 2])

    cleanup()
  })
})
