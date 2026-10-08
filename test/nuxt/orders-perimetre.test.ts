import type { CommandeDetail } from "@/types/api/commandes"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import OrdersDetailPanel from "@/components/orders/DetailPanel.vue"
import { makeComptoirPoints, seedSession } from "./comptoirs-fixture"

const COMPTOIRS = [
  { cle: "Akwa", libelle: "Akwa" },
  { cle: "Centre-ville", libelle: "Centre-ville" },
]

function makeOrder(overrides: Partial<CommandeDetail> = {}): CommandeDetail {
  return {
    id: "commande-1",
    reference: "NT-000042",
    statut: "prete_au_retrait",
    modeRemise: "retrait",
    modePaiementSouhaite: "especes_comptoir",
    comptoir: "Akwa",
    creeLe: "2026-01-05T10:00:00.000Z",
    closeLe: null,
    confirmeParClient: false,
    motifCloture: null,
    livreur: null,
    ligneCount: 1,
    lignes: [],
    totalEstimeTtc: 125_000,
    totalFermeTtc: null,
    totalFacturableTtc: null,
    resteAPayer: 125_000,
    statutPaiement: "en_attente",
    clientNom: "Awa Ngono",
    clientTelephone: "677000000",
    recuLe: null,
    momentPaiement: "maintenant",
    adresseFigee: null,
    telephoneLivraison: null,
    livreurAffecteLe: null,
    ...overrides,
  }
}

function mount(order: CommandeDetail) {
  return mountSuspended(OrdersDetailPanel, { props: { order }, attachTo: document.body })
}

describe("orders outside a member's perimeter", () => {
  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  /**
   * LE POINT DE L'ÉCRAN : le backend refuse cet encaissement par un 403, mais
   * après le clic — l'opérateur a déjà compté l'argent devant le client. Le
   * bouton part avant, la commande reste lisible.
   */
  it("hides the cash-in control when the order belongs to another counter", async () => {
    seedSession({ roles: ["comptoir"], comptoirs: ["Centre-ville"], points: makeComptoirPoints(COMPTOIRS) })

    const wrapper = await mount(makeOrder({ comptoir: "Akwa" }))
    await flushPromises()

    expect(wrapper.find("[data-testid='orders-payment-dialog-trigger']").exists()).toBe(false)
    // La commande n'est pas cachée pour autant : seule l'action s'en va.
    expect(wrapper.find("[data-testid='orders-detail-content']").exists()).toBe(true)
    expect(wrapper.get("[data-testid='orders-detail-comptoir']").text()).toBe("Akwa")
    expect(wrapper.get("[data-testid='orders-detail-out-of-perimetre']").text()).toBe(
      "This order belongs to another counter: cashing it in is that counter’s job.",
    )

    wrapper.unmount()
  })

  it("keeps the cash-in control on a counter the member is attached to", async () => {
    seedSession({ roles: ["comptoir"], comptoirs: ["Akwa"], points: makeComptoirPoints(COMPTOIRS) })

    const wrapper = await mount(makeOrder({ comptoir: "Akwa" }))
    await flushPromises()

    expect(wrapper.find("[data-testid='orders-payment-dialog-trigger']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='orders-detail-out-of-perimetre']").exists()).toBe(false)

    wrapper.unmount()
  })

  /** Une commande sans comptoir part à domicile : elle reste ouverte à tous. */
  it("keeps the cash-in control on a home delivery, which belongs to no counter", async () => {
    seedSession({ roles: ["comptoir"], comptoirs: ["Centre-ville"], points: makeComptoirPoints(COMPTOIRS) })

    const wrapper = await mount(makeOrder({ comptoir: null, modeRemise: "domicile" }))
    await flushPromises()

    expect(wrapper.find("[data-testid='orders-payment-dialog-trigger']").exists()).toBe(true)

    wrapper.unmount()
  })

  /** Liste vide = toute la boutique, y compris pour celui qui encaisse. */
  it("keeps the cash-in control for a member with no counter at all", async () => {
    seedSession({ roles: ["comptoir"], comptoirs: [], points: makeComptoirPoints(COMPTOIRS) })

    const wrapper = await mount(makeOrder({ comptoir: "Akwa" }))
    await flushPromises()

    expect(wrapper.find("[data-testid='orders-payment-dialog-trigger']").exists()).toBe(true)

    wrapper.unmount()
  })

  /**
   * La direction sort du périmètre de l'argent même rattachée à des comptoirs
   * (`perimetre.ts`) : lui retirer le bouton cacherait une action que le backend
   * accepte, et la boutique n'encaisserait plus rien un jour de remplacement.
   */
  it("keeps the cash-in control for direction, attached counters or not", async () => {
    seedSession({ roles: ["direction"], comptoirs: ["Centre-ville"], points: makeComptoirPoints(COMPTOIRS) })

    const wrapper = await mount(makeOrder({ comptoir: "Akwa" }))
    await flushPromises()

    expect(wrapper.find("[data-testid='orders-payment-dialog-trigger']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='orders-detail-out-of-perimetre']").exists()).toBe(false)

    wrapper.unmount()
  })
})
