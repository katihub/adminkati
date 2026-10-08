import type { CommandeAnnuairePage, CommandeListItem } from "@/types/api/commandes"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import OrdersListPanel from "@/components/orders/ListPanel.vue"

const firstOrder: CommandeListItem = {
  id: "commande-1",
  reference: "NT-000001",
  statut: "soumise",
  modeRemise: "retrait",
  modePaiementSouhaite: "especes_comptoir",
  comptoir: "Akwa",
  creeLe: "2026-01-05T10:00:00.000Z",
  closeLe: null,
  confirmeParClient: false,
  motifCloture: null,
  livreur: null,
  ligneCount: 2,
  lignes: [],
  totalEstimeTtc: 25_000,
  clientNom: "Awa Ngono",
}

const secondOrder: CommandeListItem = {
  ...firstOrder,
  id: "commande-2",
  reference: "NT-000002",
  statut: "confirmee",
}

function page(elements: CommandeListItem[], overrides: Partial<CommandeAnnuairePage> = {}): CommandeAnnuairePage {
  return {
    total: elements.length,
    page: 1,
    taille: elements.length,
    pages: 1,
    elements,
    ...overrides,
  }
}

describe("orders list panel", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("renders the annuaire rows and emits the selected reference", async () => {
    const filters = { tri: "recent" as const, taille: 50 }
    useNuxtApp().$queryClient.setQueryData(["v1", "commandes", "equipe", "annuaire", filters], {
      pages: [page([firstOrder, secondOrder])],
      pageParams: [1],
    })

    const wrapper = await mountSuspended(OrdersListPanel, { props: { filters } })
    await flushPromises()

    expect(wrapper.findAll("[data-testid='orders-list-item']")).toHaveLength(2)
    expect(wrapper.findAll("[data-testid='orders-list-item-reference']").map(node => node.text())).toEqual([
      firstOrder.reference,
      secondOrder.reference,
    ])

    await wrapper.get("[data-testid='orders-list-item'][data-order-reference='NT-000002']").trigger("click")
    expect(wrapper.emitted("select")).toEqual([[secondOrder.reference]])

    wrapper.unmount()
  })

  it("requests the next annuaire page when the viewport reaches the bottom", async () => {
    const filters = { tri: "recent" as const, taille: 50 }
    const cleanup = registerEndpoint("/api/v1/commandes/equipe/annuaire", {
      method: "GET",
      handler: event =>
        getQuery(event).page === "2" ? page([secondOrder], { page: 2, pages: 2 }) : page([firstOrder], { pages: 2 }),
    })
    useNuxtApp().$queryClient.setQueryData(["v1", "commandes", "equipe", "annuaire", filters], {
      pages: [page([firstOrder], { pages: 2 })],
      pageParams: [1],
    })

    const wrapper = await mountSuspended(OrdersListPanel, { props: { filters } })
    await flushPromises()
    const viewport = wrapper.get("[data-slot='scroll-area-viewport']")
    Object.defineProperty(viewport.element, "scrollHeight", { value: 1_000, configurable: true })
    Object.defineProperty(viewport.element, "clientHeight", { value: 400, configurable: true })
    Object.defineProperty(viewport.element, "scrollTop", { value: 900, configurable: true })

    await viewport.trigger("scroll")
    await flushPromises()

    expect(wrapper.findAll("[data-testid='orders-list-item-reference']").map(node => node.text())).toContain(
      secondOrder.reference,
    )

    cleanup()
    wrapper.unmount()
  })

  it("hides orders whose created day sits outside the chosen range", async () => {
    const januaryFifth = { ...firstOrder }
    const januaryTwentieth = { ...secondOrder, creeLe: "2026-01-20T10:00:00.000Z" }
    const filters = { tri: "recent" as const, taille: 50 }
    useNuxtApp().$queryClient.setQueryData(["v1", "commandes", "equipe", "annuaire", filters], {
      pages: [page([januaryFifth, januaryTwentieth])],
      pageParams: [1],
    })

    const wrapper = await mountSuspended(OrdersListPanel, {
      props: { filters, dateRange: { start: "2026-01-05", end: "2026-01-10" } },
    })
    await flushPromises()

    expect(wrapper.findAll("[data-testid='orders-list-item-reference']").map(node => node.text())).toEqual([
      januaryFifth.reference,
    ])

    wrapper.unmount()
  })
})
