import type { CommandeAnnuairePage, CommandeListItem } from "@/types/api/commandes"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getRequestURL } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import OrdersFilterBar from "@/components/orders/FilterBar.vue"
import OrdersListPanel from "@/components/orders/ListPanel.vue"
import OrdersPage from "@/pages/orders.vue"
import { useOrderWorkspaceStore } from "@/stores/order-workspace"
import { makeComptoirPoints, seedSession } from "./comptoirs-fixture"

const COMPTOIRS = [
  { cle: "Akwa", libelle: "Akwa" },
  { cle: "Centre-ville", libelle: "Centre-ville" },
]

const pickup: CommandeListItem = {
  id: "commande-1",
  reference: "NT-000001",
  statut: "prete_au_retrait",
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
}

/** Une livraison à domicile n'appartient à aucun comptoir : `comptoir` y est `null`. */
const homeDelivery: CommandeListItem = {
  ...pickup,
  id: "commande-2",
  reference: "NT-000002",
  modeRemise: "domicile",
  comptoir: null,
}

function page(elements: CommandeListItem[]): CommandeAnnuairePage {
  return { total: elements.length, page: 1, taille: 50, pages: 1, elements }
}

function seed(roles: Role[] = ["comptoir"]) {
  seedSession({ roles, points: makeComptoirPoints(COMPTOIRS) })
}

describe("orders counter filter", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("offers the published counters as a repeatable choice", async () => {
    seed()
    const wrapper = await mountSuspended(OrdersFilterBar, {
      props: {
        filters: [{ field: "comptoir", operator: "in", value: ["Akwa"] }],
        comptoirs: COMPTOIRS,
        hasActiveFilters: true,
      },
      attachTo: document.body,
    })
    await flushPromises()

    expect(wrapper.text()).toContain("Akwa")

    wrapper.unmount()
  })

  /**
   * LE FILTRE N'EST PAS UN CHOIX UNIQUE. Le backend lit `comptoir` autant de fois
   * qu'il est répété ; si la requête n'en portait qu'un, cocher deux comptoirs
   * mentirait à l'écran.
   */
  it("repeats the counter in the annuaire request, one key per ticked counter", async () => {
    seed()
    let requested: string[] = []
    const cleanup = registerEndpoint("/api/v1/commandes/equipe/annuaire", {
      method: "GET",
      handler: event => {
        requested = getRequestURL(event).searchParams.getAll("comptoir")
        return page([pickup])
      },
    })

    const filters = { tri: "recent" as const, taille: 50, comptoir: ["Akwa", "Centre-ville"] }
    const wrapper = await mountSuspended(OrdersListPanel, { props: { filters } })
    await flushPromises()
    await flushPromises()

    expect(requested).toEqual(["Akwa", "Centre-ville"])

    cleanup()
    wrapper.unmount()
  })

  it("drops the filter entirely when no counter is ticked, so nothing is hidden", () => {
    const store = useOrderWorkspaceStore()
    store.$reset()

    expect(store.filters.comptoir).toBeUndefined()

    store.setComptoirs(["Akwa"])
    expect(store.filters.comptoir).toEqual(["Akwa"])

    store.setComptoirs([])
    expect(store.filters.comptoir).toBeUndefined()
    store.$reset()
  })

  it("names the counter of each order, and says home delivery rather than leaving a blank", async () => {
    seed()
    const filters = { tri: "recent" as const, taille: 50 }
    useNuxtApp().$queryClient.setQueryData(["v1", "commandes", "equipe", "annuaire", filters], {
      pages: [page([pickup, homeDelivery])],
      pageParams: [1],
    })

    const wrapper = await mountSuspended(OrdersListPanel, { props: { filters } })
    await flushPromises()

    const cells = wrapper.findAll("[data-testid='orders-list-item-comptoir']")
    expect(cells.map(cell => cell.text())).toEqual(["Akwa", "None — home delivery"])

    wrapper.unmount()
  })

  /**
   * DEMANDER LE COMPTOIR D'UN AUTRE VAUT UN 403 SUR TOUTE LA LISTE, pas une
   * liste plus courte : le backend refuse au lieu d'intersecter en silence. Le
   * filtre ne propose donc jamais un comptoir qui ferait tomber l'écran.
   */
  it("offers a restricted member only his own counters", async () => {
    seedSession({ roles: ["comptoir"], comptoirs: ["Centre-ville"], points: makeComptoirPoints(COMPTOIRS) })

    const wrapper = await mountSuspended(OrdersPage, { route: "/orders", attachTo: document.body })
    await flushPromises()

    expect(wrapper.findComponent(OrdersFilterBar).props("comptoirs")).toEqual([
      { cle: "Centre-ville", libelle: "Centre-ville" },
    ])

    wrapper.unmount()
  })

  /**
   * La direction sort du périmètre de lecture même rattachée à un comptoir
   * (`perimetre.ts`) : lui retirer les autres comptoirs du filtre lui cacherait
   * une question que le backend accepte.
   */
  it("offers every counter to direction, attached counters or not", async () => {
    seedSession({ roles: ["direction"], comptoirs: ["Centre-ville"], points: makeComptoirPoints(COMPTOIRS) })

    const wrapper = await mountSuspended(OrdersPage, { route: "/orders", attachTo: document.body })
    await flushPromises()

    expect(wrapper.findComponent(OrdersFilterBar).props("comptoirs")).toHaveLength(2)

    wrapper.unmount()
  })

  /**
   * `GET administration/points-vente` est réservé à `direction` et `comptoir`. Un
   * préparateur n'a donc aucune liste : lui proposer le filtre reviendrait à lui
   * promettre une question à laquelle le panel ne sait pas répondre.
   */
  it("offers no counter filter to a role the backend refuses the counter list to", async () => {
    const wrapper = await mountSuspended(OrdersFilterBar, {
      props: { filters: [], comptoirs: [], hasActiveFilters: false },
      attachTo: document.body,
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain("Counter")

    wrapper.unmount()
  })
})
