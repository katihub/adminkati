import type { CaisseListItem } from "@/types/api/caisse"
import type { TeamDirectoryPage } from "@/types/api/equipe"
import type { CaisseFilterCriteria } from "@/utils/filter-caisses"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import CaisseListPanel from "@/components/caisse/ListPanel.vue"
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

const DEFAULT_CRITERIA: CaisseFilterCriteria = { searchTerm: "", statusFilter: "attention", selectedPorteurId: null }

function seedRoster() {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.list({ taille: 200 }), { pages: [ROSTER], pageParams: [1] })
}

function seedCaisses(caisses: CaisseListItem[]) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.caisse.list(), caisses)
}

describe("caisse list panel", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("renders resolved porteur names for the needs-attention default, and emits the selected id", async () => {
    seedRoster()
    seedCaisses([
      makeCaisse({ id: "c1", porteurId: "membre-1", statut: "ouverte" }),
      makeCaisse({ id: "c2", porteurId: "membre-2", statut: "validee" }),
    ])

    const wrapper = await mountSuspended(CaisseListPanel, { props: { criteria: DEFAULT_CRITERIA } })
    await flushPromises()

    expect(wrapper.findAll("[data-testid='caisse-list-item-porteur']").map(node => node.text())).toEqual(["Awa Ngo"])

    await wrapper.get("[data-testid='caisse-list-item']").trigger("click")
    expect(wrapper.emitted("select")).toEqual([["c1"]])

    wrapper.unmount()
  })

  it("filters by the given criteria, across every status", async () => {
    seedRoster()
    seedCaisses([
      makeCaisse({ id: "c1", porteurId: "membre-1", statut: "validee" }),
      makeCaisse({ id: "c2", porteurId: "membre-2", statut: "litige" }),
    ])

    const wrapper = await mountSuspended(CaisseListPanel, {
      props: { criteria: { searchTerm: "paul", statusFilter: undefined, selectedPorteurId: null } },
    })
    await flushPromises()

    expect(wrapper.findAll("[data-testid='caisse-list-item-porteur']").map(node => node.text())).toEqual(["Paul Eto"])

    wrapper.unmount()
  })

  it("filters to one porteur when the criteria's selectedPorteurId is set", async () => {
    seedRoster()
    seedCaisses([makeCaisse({ id: "c1", porteurId: "membre-1" }), makeCaisse({ id: "c2", porteurId: "membre-2" })])

    const wrapper = await mountSuspended(CaisseListPanel, {
      props: { criteria: { searchTerm: "", statusFilter: undefined, selectedPorteurId: "membre-2" } },
    })
    await flushPromises()

    expect(wrapper.findAll("[data-testid='caisse-list-item-porteur']").map(node => node.text())).toEqual(["Paul Eto"])

    wrapper.unmount()
  })

  it("shows an empty notice when nothing matches", async () => {
    seedRoster()
    seedCaisses([])

    const wrapper = await mountSuspended(CaisseListPanel, { props: { criteria: DEFAULT_CRITERIA } })
    await flushPromises()

    expect(wrapper.find("[data-testid='caisse-list-empty']").exists()).toBe(true)

    wrapper.unmount()
  })
})
