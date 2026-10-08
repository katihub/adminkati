import type { DevisDetail, DevisListItem } from "@/types/api/devis"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useQuoteMutations } from "@/composables/useQuoteMutations"
import { useQuotes } from "@/composables/useQuotes"
import { apiQueryKeys } from "@/utils/api-query-keys"

const quote: DevisListItem = {
  id: "devis-1",
  reference: "DV-000042",
  statut: "ouvert",
  totalTtc: 125_000,
  creeLe: "2026-01-05T10:00:00.000Z",
  clientId: "client-1",
  _count: { lignes: 2 },
}

const detail: DevisDetail = {
  ...quote,
  catalogueGenereLe: "2026-01-05T09:59:00.000Z",
  totalHt: 105_042,
  tva: 19_958,
  tauxTva: "0.1900",
  commandeId: null,
  commandeReference: null,
  majLe: "2026-01-05T10:00:00.000Z",
  lignes: [
    {
      id: "devis-ligne-1",
      devisId: "devis-1",
      rang: 0,
      produitId: 42,
      slug: "riz-parfume-25kg",
      nomFige: "Riz parfumé 25kg",
      prixFige: 62_500,
      quantite: 2,
    },
  ],
}

describe("quotes API integration", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("forwards the optional status filter to the team list endpoint", async () => {
    let observedQuery: Record<string, unknown> | undefined
    const cleanup = registerEndpoint("/api/v1/devis/equipe", {
      method: "GET",
      handler: event => {
        observedQuery = getQuery(event)
        return [quote]
      },
    })
    let query: ReturnType<typeof useQuotes> | undefined
    const Probe = defineComponent({
      setup() {
        query = useQuotes("commande")
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observedQuery).toEqual({ statut: "commande" })
    expect(query?.data.value).toEqual([quote])

    cleanup()
    wrapper.unmount()
  })

  it("archives a quote and invalidates quote queries", async () => {
    const queryClient = useNuxtApp().$queryClient
    const listKey = apiQueryKeys.quotes.list()
    const detailKey = apiQueryKeys.quotes.detail("DV-000042")
    queryClient.setQueryData(listKey, [quote])
    queryClient.setQueryData(detailKey, detail)
    const cleanup = registerEndpoint("/api/v1/devis/DV-000042", {
      method: "DELETE",
      handler: () => ({ id: "devis-1", reference: "DV-000042", statut: "archive" }),
    })
    let mutation: ReturnType<typeof useQuoteMutations> | undefined
    const Probe = defineComponent({
      async setup() {
        mutation = useQuoteMutations()
        await mutation.archive.mutateAsync("DV-000042")
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(mutation?.archive.data.value).toEqual({ id: "devis-1", reference: "DV-000042", statut: "archive" })
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true)

    cleanup()
    wrapper.unmount()
  })
})
