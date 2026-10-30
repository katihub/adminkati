import type { KatiExpressBoard, KatiExpressCourier, KatiExpressSuggestions } from "@/composables/useKatiExpress"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import KatiExpressWorkspace from "@/components/operations/KatiExpressWorkspace.vue"

const SHIPMENT = "11111111-1111-4111-8111-111111111111"
const board: KatiExpressBoard = {
  file: "a_attribuer",
  compteurs: { a_attribuer: 1, en_cours: 3, terminees: 12 },
  villes: [{ ville: "Douala", actives: 4 }],
  elements: [
    {
      id: SHIPMENT,
      reference: "CM-ABC123-E1",
      statut: "planifiee",
      ville: "Douala",
      quartier: "Akwa",
      adresseFigee: { quartier: "Akwa", repere: "Face pharmacie du Centre" },
      telephoneClientCapture: "690000000",
      montantACollecterFcfa: 150000,
      fraisLivraisonFcfa: 1500,
      fraisPrepayes: false,
      livraisonPrevueDebut: null,
      livraisonPrevueFin: null,
      priseEnChargeLe: null,
      departLivraisonLe: null,
      livreeLe: null,
      creeLe: "2026-10-30T09:00:00.000Z",
      agentCourant: null,
      sousCommande: {
        reference: "SC-1",
        statut: "prete",
        preteLe: "2026-10-30T10:00:00.000Z",
        boutique: { nom: "NowTech", ville: "Douala", adresseRetrait: "Rue Castelnau, Akwa" },
        commande: { reference: "CM-ABC123" },
        _count: { lignes: 2 },
      },
    },
  ],
}
const couriers: KatiExpressCourier[] = [
  {
    id: "a1",
    nom: "Awa",
    telephone: "677000000",
    verifie: true,
    plafondEspecesFcfa: 500000,
    missionsEnCours: 1,
    aEncaisserFcfa: 20000,
    especesNonRemisesFcfa: 0,
    villes: ["Douala"],
  },
]
const suggestions: KatiExpressSuggestions = {
  expedition: {
    id: SHIPMENT,
    reference: "CM-ABC123-E1",
    statut: "planifiee",
    ville: "Douala",
    quartier: "Akwa",
    montantACollecterFcfa: 150000,
  },
  recommandee: "a1",
  suggestions: [
    {
      agentId: "a1",
      nom: "Awa",
      telephone: "677000000",
      score: 130,
      eligible: true,
      blocage: null,
      raisons: ["Déjà 1 livraison dans ce quartier", "1 mission en cours"],
      missionsEnCours: 1,
      memeQuartier: 1,
      memeVille: 1,
      expositionApresFcfa: 170000,
      plafondFcfa: 500000,
    },
    {
      agentId: "a2",
      nom: "Bello",
      telephone: "699000000",
      score: 90,
      eligible: false,
      blocage: "Plafond d’espèces dépassé",
      raisons: ["Aucune mission en cours"],
      missionsEnCours: 0,
      memeQuartier: 0,
      memeVille: 0,
      expositionApresFcfa: 650000,
      plafondFcfa: 500000,
    },
  ],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

describe("Kati Express dispatch workspace", () => {
  it("shows the queue, suggests couriers, and assigns only when the team validates", async () => {
    const assigned: unknown[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/kati-express/expeditions", { method: "GET", handler: () => board }),
      registerEndpoint("/api/v1/marketplace/kati-express/livreurs", { method: "GET", handler: () => couriers }),
      registerEndpoint(`/api/v1/marketplace/kati-express/expeditions/${SHIPMENT}/suggestions`, {
        method: "GET",
        handler: () => suggestions,
      }),
      registerEndpoint(`/api/v1/marketplace/expeditions/${SHIPMENT}/affectation`, {
        method: "POST",
        handler: async event => {
          assigned.push(await readBody(event))
          return { id: SHIPMENT, statut: "affectee" }
        },
      }),
    ]
    const wrapper = await mountSuspended(KatiExpressWorkspace, { attachTo: document.body })
    await flushPromises()

    await vi.waitFor(() =>
      expect(wrapper.find(`[data-testid='kati-express-shipment-${SHIPMENT}']`).exists()).toBe(true),
    )
    expect(wrapper.text()).toContain("To assign (1)")
    expect(wrapper.get("[data-testid='kati-express-couriers']").text()).toContain("Awa")
    expect(assigned).toEqual([])

    await wrapper.get(`[data-testid='kati-express-shipment-${SHIPMENT}']`).trigger("click")
    await vi.waitFor(() => expect(wrapper.find("[data-testid='kati-express-suggestion-a1']").exists()).toBe(true))
    expect(wrapper.get("[data-testid='kati-express-detail']").text()).toContain("Face pharmacie du Centre")
    // A blocked courier is shown with the reason, but cannot be chosen.
    expect(wrapper.get("[data-testid='kati-express-suggestion-a2']").text()).toContain("Plafond d’espèces dépassé")
    expect(wrapper.find("[data-testid='kati-express-assign-a2']").exists()).toBe(false)

    await wrapper.get("[data-testid='kati-express-assign-a1']").trigger("click")
    await vi.waitFor(() => expect(assigned).toEqual([{ agentId: "a1" }]))
  })
})
