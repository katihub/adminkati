import type {
  CustomerAccountDetail,
  CustomerDirectoryItem,
  CustomerDirectoryPage,
  CustomerProfile,
} from "@/types/api/clients"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h, ref } from "vue"
import { useCustomer, useCustomers } from "@/composables/useCustomers"

const directoryCustomer: CustomerDirectoryItem = {
  id: "client-42",
  statut: "actif",
  courriel: "awa@example.com",
  creeLe: "2026-01-04T10:00:00.000Z",
  dernierAccesLe: "2026-09-01T10:00:00.000Z",
  profil: {
    nom: "Awa Test",
    telephone: "+237 695 54 90 58",
    raisonSociale: null,
    comptoirPrefere: "Drouot",
  },
}

const completeProfile: CustomerProfile = {
  clientId: directoryCustomer.id,
  nom: "Awa Test",
  telephone: "+237 695 54 90 58",
  telephoneChiffres: "695549058",
  telephoneSecours: null,
  telephoneSecoursChiffres: null,
  comptoirPrefere: "Drouot",
  raisonSociale: null,
  completLe: "2026-01-04T11:00:00.000Z",
  majLe: "2026-09-01T10:00:00.000Z",
}

const detail: CustomerAccountDetail = {
  client: {
    id: directoryCustomer.id,
    statut: directoryCustomer.statut,
    courriel: directoryCustomer.courriel,
    creeLe: directoryCustomer.creeLe,
    dernierAccesLe: directoryCustomer.dernierAccesLe,
  },
  profil: completeProfile,
  adresses: [],
  complet: true,
}

function makePage(overrides: Partial<CustomerDirectoryPage> = {}): CustomerDirectoryPage {
  return {
    total: 1,
    page: 1,
    taille: 50,
    pages: 1,
    elements: [directoryCustomer],
    ...overrides,
  }
}

describe("customers API integration", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("requests only the next annuaire page and appends its customer elements", async () => {
    const secondCustomer = { ...directoryCustomer, id: "client-43" }
    const requestedPages: unknown[] = []
    const cleanup = registerEndpoint("/api/v1/clients/annuaire", {
      method: "GET",
      handler: event => {
        const query = getQuery(event)
        requestedPages.push(query.page)
        return query.page === "2"
          ? makePage({ page: 2, pages: 2, total: 2, taille: 1, elements: [secondCustomer] })
          : makePage({ pages: 2, total: 2, taille: 1, elements: [directoryCustomer] })
      },
    })
    let query: ReturnType<typeof useCustomers> | undefined
    const Probe = defineComponent({
      setup() {
        query = useCustomers({ taille: 50 })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(query?.hasNextPage.value).toBe(true)
    await query?.fetchNextPage()
    await flushPromises()

    expect(requestedPages).toEqual(["1", "2"])
    expect(query?.hasNextPage.value).toBe(false)
    expect(query?.data.value?.pages.flatMap(page => page.elements)).toEqual([directoryCustomer, secondCustomer])

    cleanup()
    wrapper.unmount()
  })

  it("does not request customer detail until a route selection exists", async () => {
    let calls = 0
    const cleanup = registerEndpoint("/api/v1/clients/client-42", {
      method: "GET",
      handler: () => {
        calls += 1
        return detail
      },
    })
    const selectedId = ref<string | null>(null)
    const Probe = defineComponent({
      setup() {
        useCustomer(selectedId)
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()
    expect(calls).toBe(0)

    selectedId.value = "client-42"
    await flushPromises()

    expect(calls).toBe(1)

    cleanup()
    wrapper.unmount()
  })
})
