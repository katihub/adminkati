import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import SellerOnboardingWorkspace from "@/components/operations/SellerOnboardingWorkspace.vue"

const downloadBlob = vi.hoisted(() => vi.fn())
vi.mock("@/utils/download-file", () => ({ downloadBlob }))

const seller = {
  id: "seller-1",
  type: "entreprise",
  nomLegal: "Marché Central",
  niu: "M012345678",
  rccm: "RC/DLA/2026/B/42",
  statutVerification: "soumis",
  statut: "inactif",
  commissionBps: 800,
  motifStatut: null,
  creeLe: "2026-10-10T08:00:00.000Z",
  boutiques: [{ id: "shop-1", nom: "Marché Central", slug: "marche-central", statut: "inactive" }],
}
const documents = [
  {
    id: "doc-file",
    type: "rccm",
    statut: "soumis",
    expireLe: null,
    motifDecision: null,
    decideLe: null,
    creeLe: "2026-10-15T08:00:00.000Z",
    nomFichier: "RCCM Marché Central.pdf",
    typeMime: "application/pdf",
    tailleOctets: 120_000,
    statutAnalyse: "saine",
  },
  {
    id: "doc-legacy",
    type: "identite",
    statut: "soumis",
    expireLe: null,
    motifDecision: null,
    decideLe: null,
    creeLe: "2026-10-12T08:00:00.000Z",
    nomFichier: null,
    typeMime: null,
    tailleOctets: null,
    statutAnalyse: "non_analysee",
  },
]

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  downloadBlob.mockReset()
  useNuxtApp().$queryClient.clear()
})

describe("seller onboarding documents", () => {
  it("opens an uploaded document's file and says when a document has none", async () => {
    let requested = ""
    cleanups = [
      registerEndpoint("/api/v1/vendeurs", {
        method: "GET",
        handler: () => ({ total: 1, page: 1, taille: 25, pages: 1, elements: [seller] }),
      }),
      registerEndpoint("/api/v1/vendeurs/seller-1", {
        method: "GET",
        handler: () => ({ ...seller, documents, boutiques: [{ ...seller.boutiques[0], membres: [] }] }),
      }),
      registerEndpoint("/api/v1/vendeurs/seller-1/documents/doc-file/fichier", {
        method: "GET",
        handler: event => {
          requested = event.path
          return new Blob(["%PDF-1.4"], { type: "application/pdf" })
        },
      }),
    ]
    const wrapper = await mountSuspended(SellerOnboardingWorkspace)
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.text()).toContain("RCCM Marché Central.pdf"))
    expect(wrapper.text()).toContain("Document imported by storage key, no uploaded file.")
    expect(wrapper.find("[data-testid='seller-document-open-doc-legacy']").exists()).toBe(false)

    await wrapper.get("[data-testid='seller-document-open-doc-file']").trigger("click")
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "RCCM Marché Central.pdf"))
    expect(requested).toContain("/documents/doc-file/fichier")
    wrapper.unmount()
  })
})
