import type {
  CommandeAnnuaireItem,
  CommandeAnnuairePage,
  CommandeLigneEquipe,
  CommandeListItem,
} from "@/types/api/commandes"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h, ref } from "vue"
import { useOrderMutations } from "@/composables/useOrderMutations"
import { useOrder, useOrders } from "@/composables/useOrders"
import { apiQueryKeys } from "@/utils/api-query-keys"

const financierLine: CommandeLigneEquipe = {
  id: "ligne-1",
  rang: 1,
  produitId: 42,
  slug: "riz-parfume-25kg",
  nomCapture: "Riz parfumé 25kg",
  quantite: 2,
  quantiteRemise: 0,
  statutLigne: "commandee",
  motifEcart: null,
  prixCapture: 62_500,
  prixFerme: null,
}

// A `direction`/`comptoir` caller's view of `projeterCommandeEquipe` — financier-only fields present.
const order: CommandeListItem = {
  id: "commande-1",
  reference: "NT-000042",
  statut: "soumise",
  modeRemise: "retrait",
  modePaiementSouhaite: "especes_comptoir",
  comptoir: "Akwa",
  confirmeParClient: false,
  motifCloture: null,
  livreur: null,
  creeLe: "2026-01-05T10:00:00.000Z",
  closeLe: null,
  ligneCount: 1,
  lignes: [financierLine],
  totalEstimeTtc: 125_000,
  totalFermeTtc: null,
  totalFacturableTtc: null,
  resteAPayer: 125_000,
  statutPaiement: "en_attente",
  clientNom: "Awa Ngono",
  clientTelephone: "677000000",
}

// A second, distinct order used only to tell pages apart when walking pagination.
const secondOrder: CommandeListItem = {
  ...order,
  id: "commande-2",
  reference: "NT-000043",
}

function makePage(
  overrides: Partial<CommandeAnnuairePage> & { elements: CommandeAnnuaireItem[] },
): CommandeAnnuairePage {
  return {
    total: overrides.elements.length,
    page: 1,
    taille: overrides.elements.length,
    pages: 1,
    ...overrides,
  }
}

describe("orders API integration", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("walks getNextPageParam forward, requesting the next page and flattening every page's elements", async () => {
    const pageOne = makePage({ page: 1, pages: 2, taille: 1, total: 2, elements: [order] })
    const pageTwo = makePage({ page: 2, pages: 2, taille: 1, total: 2, elements: [secondOrder] })
    const requestedPages: unknown[] = []
    const cleanup = registerEndpoint("/api/v1/commandes/equipe/annuaire", {
      method: "GET",
      handler: event => {
        const query = getQuery(event)
        requestedPages.push(query.page)
        return query.page === "2" ? pageTwo : pageOne
      },
    })
    let query: ReturnType<typeof useOrders> | undefined
    const Probe = defineComponent({
      setup() {
        query = useOrders({})
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(query?.hasNextPage.value).toBe(true)
    expect(query?.data.value?.pages.flatMap(page => page.elements)).toEqual([order])

    await query?.fetchNextPage()
    await flushPromises()

    expect(requestedPages).toEqual(["1", "2"])
    expect(query?.hasNextPage.value).toBe(false)
    expect(query?.data.value?.pages.flatMap(page => page.elements)).toEqual([order, secondOrder])

    cleanup()
    wrapper.unmount()
  })

  it("does not request order detail until a reference is selected", async () => {
    let calls = 0
    const cleanup = registerEndpoint("/api/v1/commandes/NT-000042", {
      method: "GET",
      handler: () => {
        calls += 1
        return order
      },
    })
    const selectedReference = ref<string | null>(null)
    const Probe = defineComponent({
      setup() {
        useOrder(selectedReference)
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()
    expect(calls).toBe(0)

    selectedReference.value = "NT-000042"
    await flushPromises()

    expect(calls).toBe(1)
    cleanup()
    wrapper.unmount()
  })

  it("advances an order with the backend transition payload", async () => {
    const queryClient = useNuxtApp().$queryClient
    const listKey = apiQueryKeys.orders.list()
    const detailKey = apiQueryKeys.orders.detail("NT-000042")
    queryClient.setQueryData(listKey, [order])
    queryClient.setQueryData(detailKey, order)
    let observedBody: unknown
    const cleanup = registerEndpoint("/api/v1/commandes/NT-000042/avancer", {
      method: "POST",
      handler: async event => {
        observedBody = await readBody(event)
        return { ...order, statut: "confirmee" }
      },
    })
    let mutation: ReturnType<typeof useOrderMutations> | undefined
    const Probe = defineComponent({
      async setup() {
        mutation = useOrderMutations()
        await mutation.advance.mutateAsync({
          reference: "NT-000042",
          input: { vers: "confirmee", motif: "Validation comptoir" },
        })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observedBody).toEqual({ vers: "confirmee", motif: "Validation comptoir" })
    expect(mutation?.advance.data.value).toEqual({ ...order, statut: "confirmee" })
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true)

    cleanup()
    wrapper.unmount()
  })
})
