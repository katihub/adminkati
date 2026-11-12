import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import SellerOnboardingWorkspace from "@/components/operations/SellerOnboardingWorkspace.vue"

/**
 * Sorting and following seller applications (12 November 2026): tabs with their counts, a card that
 * says whether the file holds documents and was completed, required documents, replaced versions,
 * the history, and moving to the next file after a decision.
 */
const base = {
  type: "entreprise",
  niu: null,
  rccm: null,
  statut: "inactif",
  commissionBps: 500,
  motifStatut: null,
  creeLe: "2026-11-02T08:00:00.000Z",
}
const completed = {
  ...base,
  id: "seller-1",
  nomLegal: "Helogan SARL",
  statutVerification: "soumis",
  boutiques: [{ id: "shop-1", nom: "Helogan", slug: "helogan", statut: "inactive" }],
  derniereSoumissionLe: "2026-11-11T08:00:00.000Z",
  resoumis: true,
  nombrePieces: 3,
  piecesAVerifier: 1,
}
const empty = {
  ...base,
  id: "seller-2",
  nomLegal: "Nexaura",
  statutVerification: "soumis",
  boutiques: [{ id: "shop-2", nom: "Nexaura", slug: "nexaura", statut: "inactive" }],
  derniereSoumissionLe: null,
  resoumis: false,
  nombrePieces: 0,
  piecesAVerifier: 0,
}
const documents = [
  {
    id: "id-new",
    type: "identite",
    statut: "soumis",
    expireLe: null,
    motifDecision: null,
    decideLe: null,
    creeLe: "2026-11-11T08:00:00.000Z",
    nomFichier: "cni.pdf",
    typeMime: "application/pdf",
    tailleOctets: 1000,
    statutAnalyse: "saine",
  },
  {
    id: "id-old",
    type: "identite",
    statut: "refuse",
    expireLe: null,
    motifDecision: "Illisible",
    decideLe: "2026-11-09T08:00:00.000Z",
    creeLe: "2026-11-02T08:00:00.000Z",
    nomFichier: "cni-floue.pdf",
    typeMime: "application/pdf",
    tailleOctets: 1000,
    statutAnalyse: "saine",
  },
]
const detail = {
  ...completed,
  documents,
  boutiques: [{ ...completed.boutiques[0], membres: [] }],
  exigences: [
    {
      type: "identite",
      libelle: "Pièce d’identité",
      aide: "",
      obligatoire: true,
      multiple: false,
      etat: "en_attente",
      motif: null,
      nombre: 2,
    },
    {
      type: "rib",
      libelle: "Compte de reversement (RIB)",
      aide: "",
      obligatoire: true,
      multiple: false,
      etat: "manquant",
      motif: null,
      nombre: 0,
    },
  ],
  piecesManquantes: 1,
  historique: [
    {
      action: "vendeur.document.soumis",
      le: "2026-11-11T08:00:00.000Z",
      acteur: "vendeur",
      par: null,
      typePiece: "identite",
      motif: null,
    },
    {
      action: "vendeur.document.refuse",
      le: "2026-11-09T08:00:00.000Z",
      acteur: "equipe",
      par: "Arnauld",
      typePiece: "identite",
      motif: "Illisible",
    },
  ],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
})

function endpoints(queries: Array<Record<string, unknown>>) {
  cleanups = [
    registerEndpoint("/api/v1/vendeurs", {
      method: "GET",
      handler: event => {
        queries.push(getQuery(event))
        return {
          total: 2,
          page: 1,
          taille: 50,
          pages: 1,
          elements: [completed, empty],
          compteurs: { a_traiter: 2, attente_vendeur: 7, sans_piece: 40, valides: 31, refuses: 4, retires: 1 },
        }
      },
    }),
    registerEndpoint("/api/v1/vendeurs/seller-1", { method: "GET", handler: () => detail }),
    registerEndpoint("/api/v1/vendeurs/seller-2", {
      method: "GET",
      handler: () => ({
        ...empty,
        documents: [],
        boutiques: [{ ...empty.boutiques[0], membres: [] }],
        exigences: [],
        historique: [],
      }),
    }),
  ]
}

describe("seller onboarding tabs", () => {
  it("opens the to-review tab with the counts, and cards that show documents and completion", async () => {
    const queries: Array<Record<string, unknown>> = []
    endpoints(queries)
    const wrapper = await mountSuspended(SellerOnboardingWorkspace, { route: "/operations?tab=seller-onboarding" })
    await flushPromises()

    expect(queries[0]).toEqual(expect.objectContaining({ onglet: "a_traiter" }))
    const tabs = wrapper.get('[data-testid="seller-application-tabs"]')
    expect(tabs.get('[data-testid="seller-application-tab-a_traiter"]').attributes("aria-current")).toBe("page")
    expect(tabs.text()).toContain("40")

    const first = wrapper.get('[data-testid="seller-application-seller-1"]')
    expect(first.find('[data-testid="seller-application-completed"]').exists()).toBe(true)
    expect(first.get('[data-testid="seller-application-documents"]').text()).toMatch(/3/)
    const second = wrapper.get('[data-testid="seller-application-seller-2"]')
    expect(second.find('[data-testid="seller-application-completed"]').exists()).toBe(false)
    expect(second.get('[data-testid="seller-application-documents"]').classes()).toContain("text-destructive")
    wrapper.unmount()
  })

  it("shows the required documents, the new document over its replaced version, and the history", async () => {
    endpoints([])
    // Without a selected file, the first one of the list opens: seller-1.
    const wrapper = await mountSuspended(SellerOnboardingWorkspace)
    await vi.waitFor(() => expect(wrapper.find('[data-testid="seller-file-checklist"]').exists()).toBe(true))

    expect(wrapper.get('[data-testid="seller-file-checklist-count"]').text()).toContain("0/2")
    expect(wrapper.find('[data-testid="seller-document-new-id-new"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="seller-document-id-new"]').text()).toContain("Pièce d’identité")
    // The refused version is folded under the one in force.
    const previous = wrapper.get('[data-testid="seller-document-previous-identite"]')
    expect(previous.find('[data-testid="seller-document-id-old"]').exists()).toBe(true)
    const history = wrapper.get('[data-testid="seller-file-history"]')
    expect(history.text()).toContain("Arnauld")
    expect(history.text()).toContain("Illisible")

    expect(wrapper.get('[data-testid="seller-file-previous"]').attributes("disabled")).toBeDefined()
    expect(wrapper.get('[data-testid="seller-file-next"]').attributes("disabled")).toBeUndefined()
    wrapper.unmount()
  })

  it("opens the next file after a decision on the current one", async () => {
    endpoints([])
    const decisions: string[] = []
    cleanups.push(
      registerEndpoint("/api/v1/vendeurs/seller-1/decision-dossier", {
        method: "POST",
        handler: () => {
          decisions.push("seller-1")
          return { id: "seller-1", statutVerification: "modification_demandee" }
        },
      }),
    )
    const wrapper = await mountSuspended(SellerOnboardingWorkspace)
    await vi.waitFor(() => expect(wrapper.find("#seller-decision-reason").exists()).toBe(true))

    await wrapper.get("#seller-decision-reason").setValue("RIB manquant")
    const requestChanges = wrapper.findAll("button").find(button => /Request changes|Demander/.test(button.text()))
    await requestChanges!.trigger("click")

    await vi.waitFor(() => expect(decisions).toEqual(["seller-1"]))
    await vi.waitFor(() => expect(useRouter().currentRoute.value.query.candidature).toBe("seller-2"))
    wrapper.unmount()
  })
})
