import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import RefusedLinesWorkspace from "@/components/operations/RefusedLinesWorkspace.vue"
import VerifiedOffersWorkspace from "@/components/operations/VerifiedOffersWorkspace.vue"

type Command = { method: string; path: string; body?: unknown; query?: unknown }

const OFFERS = [
  {
    id: "o1",
    titre: "Galaxy A15 128 Go",
    prixFcfa: 149000,
    libelleVariante: "128 Go",
    referenceVendeur: "A15-128",
    quantiteMinimale: 1,
    verifieParKatiLe: "2026-10-16T10:00:00.000Z",
    noteVerification: "Batterie testée",
    produit: { nom: "Samsung Galaxy A15", slug: "galaxy-a15" },
    boutique: { id: "b1", nom: "TechMall", slug: "techmall" },
  },
  {
    id: "o2",
    titre: "Câble USB-C",
    prixFcfa: 2000,
    libelleVariante: null,
    referenceVendeur: "USB-C",
    quantiteMinimale: 10,
    verifieParKatiLe: null,
    noteVerification: null,
    produit: { nom: "Câble USB-C", slug: "cable-usb-c" },
    boutique: { id: "b2", nom: "Akwa Market", slug: "akwa-market" },
  },
]

const REFUSED = [
  {
    id: "r1",
    commandeId: "c1",
    quantite: 2,
    montantFcfa: 100000,
    remboursementDuFcfa: 9100,
    motif: "Écran épuisé chez notre fournisseur",
    rembourseLe: null,
    creeLe: "2026-10-16T10:00:00.000Z",
    ligne: {
      produitNomCapture: "Écran 24 pouces",
      offreTitreCapture: "Écran 24 pouces",
      quantite: 2,
      sousCommande: {
        reference: "CM-ABC123-1",
        boutique: { nom: "TechMall" },
        commande: { reference: "CM-ABC123", telephoneLivraison: "699000003" },
      },
    },
    remboursementPsp: null,
  },
  {
    id: "r2",
    commandeId: "c2",
    quantite: 1,
    montantFcfa: 5000,
    remboursementDuFcfa: 1000,
    motif: "Rupture",
    rembourseLe: null,
    creeLe: "2026-10-16T11:00:00.000Z",
    ligne: {
      produitNomCapture: "Câble",
      offreTitreCapture: "Câble",
      quantite: 1,
      sousCommande: {
        reference: "CM-DEF456-1",
        boutique: { nom: "Akwa Market" },
        commande: { reference: "CM-DEF456", telephoneLivraison: null },
      },
    },
    remboursementPsp: {
      id: "p2",
      statut: "soumis",
      montantFcfa: 1000,
      telephone: "699000004",
      raisonEchec: null,
      initieLe: "2026-10-16T11:05:00.000Z",
      confirmeLe: null,
    },
  },
]

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

const record = (commands: Command[], method: string, path: string) => async (event: Parameters<typeof readBody>[0]) => {
  commands.push({ method, path, body: await readBody(event) })
  return { ok: true }
}
const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)

describe("verified offers workspace", () => {
  it("lists published offers with their badge, sets it with a note and removes it", async () => {
    const commands: Command[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/moderation/offres-publiees", {
        method: "GET",
        handler: event => {
          commands.push({ method: "GET", path: "/", query: getQuery(event) })
          return OFFERS
        },
      }),
      registerEndpoint("/api/v1/marketplace/moderation/offres-publiees/o1/verification", {
        method: "POST",
        handler: record(commands, "POST", "o1"),
      }),
      registerEndpoint("/api/v1/marketplace/moderation/offres-publiees/o2/verification", {
        method: "POST",
        handler: record(commands, "POST", "o2"),
      }),
    ]
    const wrapper = await mountSuspended(VerifiedOffersWorkspace, { attachTo: document.body })
    await flushPromises()

    expect(commands[0]).toEqual({ method: "GET", path: "/", query: { filtre: "toutes" } })
    const verified = wrapper.get("[data-testid='published-offer-o1']")
    expect(verified.find("[data-testid='offer-verified-badge']").exists()).toBe(true)
    expect(verified.text()).toContain("Batterie testée")
    const plain = wrapper.get("[data-testid='published-offer-o2']")
    expect(plain.find("[data-testid='offer-verified-badge']").exists()).toBe(false)
    expect(plain.text()).toContain("minimum 10")

    await wrapper.get("[data-testid='verified-offers-filter']").setValue("non_verifiees")
    await flushPromises()
    expect(wrapper.find("[data-testid='published-offer-o1']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='published-offer-o2']").exists()).toBe(true)
    await wrapper.get("[data-testid='verified-offers-filter']").setValue("toutes")
    await wrapper.get("[data-testid='verified-offers-shop-filter']").setValue("b1")
    await flushPromises()
    expect(wrapper.find("[data-testid='published-offer-o1']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='published-offer-o2']").exists()).toBe(false)
    await wrapper.get("[data-testid='verified-offers-shop-filter']").setValue("")
    await wrapper.get("[data-testid='verified-offers-sort']").setValue("priceAsc")
    await flushPromises()
    expect(wrapper.findAll("[data-testid^='published-offer-']").map(item => item.attributes("data-testid"))).toEqual([
      "published-offer-o2",
      "published-offer-o1",
    ])

    await plain
      .findAll("button")
      .find(button => button.text() === "Set the badge")!
      .trigger("click")
    await vi.waitFor(() => expect(byTestId("offer-verify-note")).not.toBeNull())
    const note = byTestId("offer-verify-note") as HTMLTextAreaElement
    note.value = "Reçu et testé le 16 octobre"
    note.dispatchEvent(new Event("input"))
    await flushPromises()
    byTestId("offer-verify-submit")!.click()
    await vi.waitFor(() => expect(commands.filter(command => command.method === "POST")).toHaveLength(1))

    const remove = () => wrapper.get("[data-testid='published-offer-o1'] [data-testid='offer-unverify']")
    await vi.waitFor(() => expect(remove().attributes("disabled")).toBeUndefined())
    await remove().trigger("click")
    await vi.waitFor(() => expect(commands.filter(command => command.method === "POST")).toHaveLength(2))

    expect(commands.filter(command => command.method === "POST")).toEqual([
      { method: "POST", path: "o2", body: { verifiee: true, note: "Reçu et testé le 16 octobre" } },
      { method: "POST", path: "o1", body: { verifiee: false } },
    ])
    wrapper.unmount()
  })
})

describe("refused lines workspace", () => {
  it("shows what is owed, refunds to a typed number and reconciles a submitted payout", async () => {
    const commands: Command[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/refus-lignes", {
        method: "GET",
        handler: event => {
          commands.push({ method: "GET", path: "/", query: getQuery(event) })
          return REFUSED
        },
      }),
      registerEndpoint("/api/v1/marketplace/refus-lignes/r1/remboursement", {
        method: "POST",
        handler: record(commands, "POST", "r1/remboursement"),
      }),
      registerEndpoint("/api/v1/marketplace/refus-lignes/r2/rapprochement", {
        method: "POST",
        handler: record(commands, "POST", "r2/rapprochement"),
      }),
    ]
    const wrapper = await mountSuspended(RefusedLinesWorkspace, { attachTo: document.body })
    await flushPromises()

    expect(commands[0]).toEqual({ method: "GET", path: "/", query: { filtre: "a_rembourser" } })
    const first = wrapper.get("[data-testid='refused-line-r1']")
    expect(first.text()).toContain("CM-ABC123")
    expect(first.text()).toContain("Écran épuisé chez notre fournisseur")
    expect(first.get("[data-testid='refused-line-owed']").text()).toMatch(/9,100/)
    // A payout already sent to Fapshi is reconciled, not sent twice.
    const second = wrapper.get("[data-testid='refused-line-r2']")
    expect(second.find("[data-testid='refused-line-refund']").exists()).toBe(false)
    expect(second.text()).toContain("Sent to Fapshi")

    await first.get("[data-testid='refused-line-refund']").trigger("click")
    await vi.waitFor(() => expect(byTestId("refused-line-phone")).not.toBeNull())
    const phone = byTestId("refused-line-phone") as HTMLInputElement
    phone.value = "12345"
    phone.dispatchEvent(new Event("input"))
    await flushPromises()
    expect(byTestId("refused-line-refund-form")!.textContent).toContain("Cameroonian number expected")
    phone.value = "6 99 00 00 05"
    phone.dispatchEvent(new Event("input"))
    await flushPromises()
    byTestId("refused-line-refund-submit")!.click()
    await vi.waitFor(() => expect(commands.filter(command => command.method === "POST")).toHaveLength(1))

    const reconcile = () => wrapper.get("[data-testid='refused-line-r2'] [data-testid='refused-line-reconcile']")
    await vi.waitFor(() => expect(reconcile().attributes("disabled")).toBeUndefined())
    await reconcile().trigger("click")
    await vi.waitFor(() => expect(commands.filter(command => command.method === "POST")).toHaveLength(2))

    expect(commands.filter(command => command.method === "POST")).toEqual([
      { method: "POST", path: "r1/remboursement", body: { telephone: "699000005" } },
      { method: "POST", path: "r2/rapprochement", body: undefined },
    ])
    wrapper.unmount()
  })
})
