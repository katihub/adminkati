import type { CaisseListItem } from "@/types/api/caisse"
import type { TeamDirectoryPage } from "@/types/api/equipe"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import OperationsPage from "@/pages/operations.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

function makeCaisse(overrides: Partial<CaisseListItem> = {}): CaisseListItem {
  return {
    id: "caisse-1",
    porteurId: "membre-1",
    journee: "2026-09-08T00:00:00.000Z",
    statut: "ouverte",
    montantAttendu: 10_000,
    montantCompte: null,
    ecart: null,
    compteePar: null,
    compteeLe: null,
    valideePar: null,
    valideeLe: null,
    note: null,
    creeLe: "2026-09-08T08:00:00.000Z",
    ecarts: [],
    _count: { encaissements: 1 },
    ...overrides,
  }
}

const ROSTER: TeamDirectoryPage = {
  total: 2,
  page: 1,
  taille: 200,
  pages: 1,
  elements: [
    {
      id: "membre-1",
      courriel: "awa@example.com",
      nom: "Awa Ngo",
      telephone: null,
      roles: ["comptoir"],
      comptoirs: [],
      actif: true,
      creeLe: "2026-01-01T00:00:00.000Z",
      invitLe: null,
      premiereConnexionLe: null,
      desactiveLe: null,
    },
    {
      id: "membre-2",
      courriel: "paul@example.com",
      nom: "Paul Eto",
      telephone: null,
      roles: ["livreur"],
      comptoirs: [],
      actif: true,
      creeLe: "2026-01-01T00:00:00.000Z",
      invitLe: null,
      premiereConnexionLe: null,
      desactiveLe: null,
    },
  ],
}

function seedRoster() {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.list({ taille: 200 }), { pages: [ROSTER], pageParams: [1] })
}

function seedCaisses(caisses: CaisseListItem[]) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.caisse.list(), caisses)
}

function seedCaisseDetail(caisse: CaisseListItem) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.caisse.detail(caisse.id), { ...caisse, encaissements: [] })
}

function seedSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Awa Admin",
    courriel: "admin@example.com",
    roles: ["direction"],
  })
}

/**
 * The unprefixed default-locale path — `defineI18nRoute` maps English (default, unprefixed
 * under prefix_except_default) to /operations. Cash Registers is the default Operations tab, so
 * its workspace query stays clean until an operator selects a different tab.
 */
const ROUTE = "/operations"

describe("caisse workspace", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows an empty-state prompt when nothing is selected yet", async () => {
    seedSession()
    seedRoster()
    seedCaisses([])

    const wrapper = await mountSuspended(OperationsPage, { route: ROUTE })
    await flushPromises()

    expect(wrapper.find("[data-testid='caisse-detail-empty']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("auto-selects the first caisse in the list when nothing is explicitly selected", async () => {
    seedSession()
    seedRoster()
    const first = makeCaisse({ id: "caisse-1", porteurId: "membre-1" })
    const second = makeCaisse({ id: "caisse-2", porteurId: "membre-2" })
    seedCaisses([first, second])
    seedCaisseDetail(first)
    seedCaisseDetail(second)

    const wrapper = await mountSuspended(OperationsPage, { route: ROUTE })
    await flushPromises()

    expect(wrapper.get("[data-caisse-id='caisse-1']").attributes("aria-pressed")).toBe("true")
    expect(wrapper.find("[data-testid='caisse-detail-empty']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("restores selection from a deep-linked ?caisse= id", async () => {
    seedSession()
    seedRoster()
    const first = makeCaisse({ id: "caisse-1", porteurId: "membre-1" })
    const second = makeCaisse({ id: "caisse-2", porteurId: "membre-2" })
    seedCaisses([first, second])
    seedCaisseDetail(first)
    seedCaisseDetail(second)

    const wrapper = await mountSuspended(OperationsPage, { route: `${ROUTE}?caisse=caisse-2` })
    await flushPromises()

    expect(wrapper.get("[data-caisse-id='caisse-2']").attributes("aria-pressed")).toBe("true")
    expect(wrapper.get("[data-caisse-id='caisse-1']").attributes("aria-pressed")).toBe("false")

    wrapper.unmount()
  })

  it("writes the selected caisse id to the URL when a list row is clicked", async () => {
    seedSession()
    seedRoster()
    const first = makeCaisse({ id: "caisse-1", porteurId: "membre-1" })
    const second = makeCaisse({ id: "caisse-2", porteurId: "membre-2" })
    seedCaisses([first, second])
    seedCaisseDetail(first)
    seedCaisseDetail(second)

    const wrapper = await mountSuspended(OperationsPage, { route: ROUTE })
    await flushPromises()

    await wrapper.get("[data-caisse-id='caisse-2']").trigger("click")
    await vi.waitFor(() => expect(useRoute().query.caisse).toBe("caisse-2"))

    expect(wrapper.get("[data-caisse-id='caisse-2']").attributes("aria-pressed")).toBe("true")

    wrapper.unmount()
  })
})
