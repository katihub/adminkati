import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import MarketplacePilotWorkspace from "@/components/operations/MarketplacePilotWorkspace.vue"

const PILOT = {
  id: "11111111-1111-4111-8111-111111111111",
  nom: "Pilote Douala Akwa",
  statut: "en_cours",
  commenceLe: "2026-10-01T08:00:00.000Z",
  termineLe: null,
  plafondCommandesJournalier: 50,
  perimetre: { boutiqueIds: ["b1", "b2"] },
  politiqueGoNoGo: {
    joursObservationMinimum: 14,
    commandesLivreesMinimum: 100,
    tauxLivraisonMinimumBps: 9_000,
    tauxAnnulationMaximumBps: 500,
    tauxLitigeMaximumBps: 300,
    tempsRapprochementMaximumMinutes: 180,
    backlogSupportMaximum: 10,
  },
  ville: { nom: "Douala", slug: "douala" },
  evaluations: [
    {
      id: "e1",
      decision: "prolonger",
      bloquants: [],
      observations: ["volume insuffisant : 12/100 livraisons"],
      creeLe: "2026-10-12T08:00:00.000Z",
    },
  ],
}

const MEASURES = {
  periode: { debut: PILOT.commenceLe, fin: "2026-10-13T08:00:00.000Z" },
  mesures: {
    joursObserves: 12,
    commandesLivrees: 12,
    tauxLivraisonBps: 9_500,
    tauxAnnulationBps: 0,
    tauxLitigeBps: 800,
    tempsRapprochementP95Minutes: 95,
    backlogSupport: 1,
    ecartsFinanciersInexpliques: 0,
    incidentsCritiquesOuverts: 0,
    retoursTestes: true,
    remboursementsTestes: false,
    responsabilitesLogistiquesAuditables: true,
  },
}

const BASE = "/api/v1/marketplace/deploiement/pilotes"

function registerApi(overrides: { pilots?: unknown[] } = {}) {
  const calls = { transition: vi.fn(), evaluation: vi.fn(), creation: vi.fn() }
  const cleanups = [
    registerEndpoint(BASE, { method: "GET", handler: () => overrides.pilots ?? [PILOT] }),
    registerEndpoint(`${BASE}/references`, {
      method: "GET",
      handler: () => ({
        villes: [{ id: "v1", nom: "Douala", statut: "pilote" }],
        boutiques: [
          { id: "b1", nom: "NowTech", villesLivraison: ["Douala"], vendeur: "NowTech SARL" },
          { id: "b2", nom: "TechMall", villesLivraison: ["Douala"], vendeur: "TechMall SARL" },
        ],
      }),
    }),
    registerEndpoint(`${BASE}/${PILOT.id}/mesures`, { method: "GET", handler: () => MEASURES }),
    registerEndpoint(`${BASE}/${PILOT.id}/suspendre`, {
      method: "POST",
      handler: () => {
        calls.transition("suspendre")
        return { ...PILOT, statut: "suspendu" }
      },
    }),
    registerEndpoint(`${BASE}/${PILOT.id}/evaluations`, {
      method: "POST",
      handler: async event => {
        calls.evaluation(await readBody(event))
        return PILOT.evaluations[0]
      },
    }),
    registerEndpoint(BASE, {
      method: "POST",
      handler: async event => {
        calls.creation(await readBody(event))
        return { ...PILOT, id: "22222222-2222-4222-8222-222222222222" }
      },
    }),
  ]
  return { calls, cleanup: () => cleanups.forEach(cleanup => cleanup()) }
}

describe("marketplace pilot workspace", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows each measure against its threshold and flags the ones that fail", async () => {
    const { cleanup } = registerApi()
    const wrapper = await mountSuspended(MarketplacePilotWorkspace)
    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid='marketplace-pilot-indicator-disputeRate']").exists()).toBe(true),
    )

    const dispute = wrapper.get("[data-testid='marketplace-pilot-indicator-disputeRate']")
    expect(dispute.text()).toContain("8 %")
    expect(dispute.classes()).toContain("border-amber-300")
    expect(wrapper.get("[data-testid='marketplace-pilot-indicator-deliveryRate']").classes()).not.toContain(
      "border-amber-300",
    )
    expect(wrapper.get("[data-testid='marketplace-pilot-last-evaluation']").text()).toContain("volume insuffisant")

    wrapper.unmount()
    cleanup()
  })

  it("asks for confirmation before suspending, then calls the transition once", async () => {
    const { calls, cleanup } = registerApi()
    const wrapper = await mountSuspended(MarketplacePilotWorkspace, { attachTo: document.body })
    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid='marketplace-pilot-action-suspendre']").exists()).toBe(true),
    )

    await wrapper.get("[data-testid='marketplace-pilot-action-suspendre']").trigger("click")
    await flushPromises()
    expect(calls.transition).not.toHaveBeenCalled()
    const confirm = document.querySelector<HTMLElement>("[data-testid='marketplace-pilot-confirm-action']")
    expect(confirm).not.toBeNull()
    confirm!.click()
    await vi.waitFor(() => expect(calls.transition).toHaveBeenCalledTimes(1))

    wrapper.unmount()
    cleanup()
  })

  it("sends a fresh idempotency key with each evaluation request", async () => {
    const { calls, cleanup } = registerApi()
    const wrapper = await mountSuspended(MarketplacePilotWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='marketplace-pilot-evaluate']").exists()).toBe(true))

    await wrapper.get("[data-testid='marketplace-pilot-evaluate']").trigger("click")
    await vi.waitFor(() => expect(calls.evaluation).toHaveBeenCalledTimes(1))
    expect(calls.evaluation.mock.calls[0]?.[0]).toEqual({
      cleIdempotence: expect.stringMatching(new RegExp(`^admin:${PILOT.id}:`)),
    })

    wrapper.unmount()
    cleanup()
  })

  it("creates a pilot with the selected shops and thresholds converted to basis points", async () => {
    const { calls, cleanup } = registerApi({ pilots: [] })
    const wrapper = await mountSuspended(MarketplacePilotWorkspace)
    await vi.waitFor(() => expect(wrapper.findAll("input[type='checkbox']").length).toBe(2))

    await wrapper.get("[data-testid='marketplace-pilot-create-form'] input").setValue("Pilote Akwa")
    await wrapper.get("[data-testid='marketplace-pilot-create-form'] select").setValue("v1")
    await wrapper.findAll("input[type='checkbox']")[0]!.setValue(true)
    await wrapper.get("[data-testid='marketplace-pilot-create-form'] form").trigger("submit")

    await vi.waitFor(() => expect(calls.creation).toHaveBeenCalledTimes(1))
    expect(calls.creation.mock.calls[0]?.[0]).toMatchObject({
      villeId: "v1",
      nom: "Pilote Akwa",
      boutiqueIds: ["b1"],
      politique: { tauxLivraisonMinimumBps: 9_000, tauxAnnulationMaximumBps: 500, tauxLitigeMaximumBps: 300 },
    })

    wrapper.unmount()
    cleanup()
  })
})
