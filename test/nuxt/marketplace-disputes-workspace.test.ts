import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it, vi } from "vitest"
import MarketplaceDisputesWorkspace from "@/components/operations/MarketplaceDisputesWorkspace.vue"

const downloadBlob = vi.hoisted(() => vi.fn())
vi.mock("@/utils/download-file", () => ({ downloadBlob }))

const RETURN_ID = "44444444-4444-4444-8444-444444444444"
const DEMAND_ID = "55555555-5555-4555-8555-555555555555"

const piece = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  nomCapture: `${id}.pdf`,
  typeMime: "application/pdf",
  tailleOctets: 2048,
  empreinteSha256: "a".repeat(64),
  creeLe: "2026-10-13T08:00:00.000Z",
  statutAnalyse: "saine",
  purgeeLe: null,
  ...extra,
})

const listItem = {
  id: RETURN_ID,
  statut: "recu",
  quantite: 1,
  motifClient: "Écran fissuré à la réception.",
  montantRemboursableFcfa: 149_000,
  commissionCorrigeeFcfa: 0,
  creeLe: "2026-10-13T08:00:00.000Z",
  demande: {
    id: DEMAND_ID,
    reference: "DC-E2E-1",
    objet: "Écran fissuré",
    categorie: "produit_endommage",
    statut: "escaladee",
    client: { courriel: "cliente@exemple.cm", profil: { nom: "Awa" } },
    boutique: { id: "b1", nom: "Maison Kati" },
    commande: { id: "c1", reference: "CM-E2E" },
    expedition: null,
  },
}

const detail = {
  ...listItem,
  fraisRetourFcfa: 0,
  montantRembourseFcfa: 0,
  referenceRetour: "COLIS-9",
  referenceRemboursement: null,
  remboursementPsp: null,
  eligibleJusqua: "2026-10-20T08:00:00.000Z",
  ligne: {
    id: "l1",
    produitNomCapture: "Téléphone",
    referenceVendeurCapture: "TEL-1",
    prixUnitaireFcfa: 149_000,
    totalNetFcfa: 149_000,
    quantite: 1,
  },
  demande: {
    ...listItem.demande,
    evenements: [],
    messages: [
      {
        id: "m1",
        auteurType: "client",
        contenu: "Voici les photos.",
        interne: false,
        creeLe: "2026-10-13T08:00:00.000Z",
        pieces: [
          piece("saine"),
          piece("analyse", { statutAnalyse: "en_quarantaine" }),
          piece("menace", { statutAnalyse: "infectee" }),
          piece("effacee", { purgeeLe: "2026-10-14T08:00:00.000Z" }),
        ],
      },
    ],
  },
  capacites: { decider: false, recevoir: false, rembourser: true, rapprocherRemboursement: false, arbitrer: false },
}

function signIn(roles: string[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    type: "equipe",
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  })
}

function registerApi(returnDetail = detail) {
  const exportCalls = vi.fn()
  const cleanups = [
    registerEndpoint("/api/v1/marketplace/demandes-client/retours", {
      method: "GET",
      handler: () => ({ total: 1, page: 1, taille: 40, pages: 1, elements: [listItem] }),
    }),
    registerEndpoint(`/api/v1/marketplace/demandes-client/retours/${RETURN_ID}`, {
      method: "GET",
      handler: () => returnDetail,
    }),
    registerEndpoint(`/api/v1/marketplace/demandes-client/${DEMAND_ID}/export`, {
      method: "GET",
      handler: () => {
        exportCalls()
        return new Blob(["PK"], { type: "application/zip" })
      },
    }),
  ]
  return { exportCalls, cleanup: () => cleanups.forEach(cleanup => cleanup()) }
}

describe("marketplace disputes workspace — evidence and export", () => {
  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    downloadBlob.mockReset()
  })

  it("keeps only readable evidence downloadable and says why the others are not", async () => {
    signIn(["direction"])
    const { cleanup } = registerApi()
    const wrapper = await mountSuspended(MarketplaceDisputesWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='disputes-evidence-saine']").exists()).toBe(true))

    expect(wrapper.get("[data-testid='disputes-evidence-saine']").attributes("disabled")).toBeUndefined()
    for (const blocked of ["analyse", "menace", "effacee"]) {
      expect(wrapper.get(`[data-testid='disputes-evidence-${blocked}']`).attributes("disabled")).toBeDefined()
    }
    expect(wrapper.get("[data-testid='disputes-evidence-menace']").text()).toMatch(/menace|threat/i)

    wrapper.unmount()
    cleanup()
  })

  it("lets direction export the whole case file as a zip", async () => {
    signIn(["direction"])
    const { exportCalls, cleanup } = registerApi()
    const wrapper = await mountSuspended(MarketplaceDisputesWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='disputes-export-case']").exists()).toBe(true))

    await wrapper.get("[data-testid='disputes-export-case']").trigger("click")
    await vi.waitFor(() => expect(exportCalls).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "dossier-DC-E2E-1.zip"))

    wrapper.unmount()
    cleanup()
  })

  it("does not offer the export to the counter", async () => {
    signIn(["comptoir"])
    const { cleanup } = registerApi()
    const wrapper = await mountSuspended(MarketplaceDisputesWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='disputes-evidence-saine']").exists()).toBe(true))

    expect(wrapper.find("[data-testid='disputes-export-case']").exists()).toBe(false)

    wrapper.unmount()
    cleanup()
  })

  it("keeps a resolved case readable while disabling further customer replies", async () => {
    signIn(["direction"])
    const { cleanup } = registerApi({ ...detail, demande: { ...detail.demande, statut: "resolue" } })
    const wrapper = await mountSuspended(MarketplaceDisputesWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='disputes-evidence-saine']").exists()).toBe(true))
    expect(wrapper.text()).toContain("Voici les photos.")
    expect(wrapper.get("textarea").attributes("disabled")).toBeDefined()
    wrapper.unmount()
    cleanup()
  })
})
