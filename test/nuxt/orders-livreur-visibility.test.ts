import type { CommandeDetail } from "@/types/api/commandes"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import CustomerInfo from "@/components/orders/CustomerInfo.vue"
import DetailPanel from "@/components/orders/DetailPanel.vue"

function makeOrder(overrides: Partial<CommandeDetail> = {}): CommandeDetail {
  return {
    id: "commande-1",
    reference: "CM-4YUCMF",
    statut: "confirmee",
    modeRemise: "domicile",
    modePaiementSouhaite: "especes_livraison",
    momentPaiement: "a_la_livraison",
    comptoir: null,
    creeLe: "2026-09-12T13:07:33.327Z",
    closeLe: null,
    recuLe: null,
    ligneCount: 0,
    lignes: [],
    confirmeParClient: false,
    motifCloture: null,
    clientNom: "Awa Ngono",
    clientTelephone: "677000000",
    adresseFigee: { mode: "domicile", ville: "Douala", quartier: "Bonapriso", repere: "Portail bleu" },
    telephoneLivraison: "+237 690 12 34 56",
    livreur: { id: "livreur-1", nom: "Essai livreur", telephone: "+237 655 00 11 22" },
    livreurAffecteLe: "2026-09-12T13:07:33.622Z",
    ...overrides,
  }
}

function signIn(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Dev",
    courriel: "dev@nowtech.local",
    roles,
  })
}

afterEach(() => {
  useNuxtApp().$queryClient.clear()
})

describe("courier and door on an order detail", () => {
  it("names the courier, its number, and when it was assigned", async () => {
    const wrapper = await mountSuspended(CustomerInfo, { props: { order: makeOrder() } })

    expect(wrapper.get("[data-testid='orders-detail-courier']").text()).toContain("Essai livreur")
    expect(wrapper.get("[data-testid='orders-detail-courier-phone']").attributes("href")).toBe("tel:+237655001122")
    expect(wrapper.get("[data-testid='orders-detail-courier-assigned-at']").text()).not.toBe("")
  })

  it("shows the frozen address and the number to call at the door", async () => {
    const wrapper = await mountSuspended(CustomerInfo, { props: { order: makeOrder() } })

    const address = wrapper.get("[data-testid='orders-detail-delivery-address']").text()
    expect(address).toContain("Bonapriso")
    expect(address).toContain("Portail bleu")
    expect(wrapper.get("[data-testid='orders-detail-delivery-phone']").attributes("href")).toBe("tel:+237690123456")
  })

  it("says a home delivery has no courier rather than hiding the row", async () => {
    const wrapper = await mountSuspended(CustomerInfo, {
      props: { order: makeOrder({ livreur: null, livreurAffecteLe: null }) },
    })

    expect(wrapper.find("[data-testid='orders-detail-courier-unassigned']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='orders-detail-courier-assigned-at']").exists()).toBe(false)
  })

  it("leaves the delivery block out of a counter pickup", async () => {
    const wrapper = await mountSuspended(CustomerInfo, {
      props: {
        order: makeOrder({
          modeRemise: "retrait",
          adresseFigee: null,
          telephoneLivraison: null,
          livreur: null,
          livreurAffecteLe: null,
        }),
      },
    })

    expect(wrapper.find("[data-testid='orders-detail-delivery-title']").exists()).toBe(false)
  })
})

describe("courier assignment gate", () => {
  it("opens the assignment to the counter on an eligible home delivery", async () => {
    signIn(["comptoir"])
    const wrapper = await mountSuspended(DetailPanel, { props: { order: makeOrder({ statut: "en_preparation" }) } })

    expect(wrapper.find("[data-testid='orders-detail-livreur-trigger']").exists()).toBe(true)
  })

  it("refuses it on a status the backend would answer 409 to", async () => {
    signIn(["direction"])
    const wrapper = await mountSuspended(DetailPanel, { props: { order: makeOrder({ statut: "close" }) } })

    expect(wrapper.find("[data-testid='orders-detail-livreur-trigger']").exists()).toBe(false)
  })

  it("refuses it on a pickup, which has no round to hand over", async () => {
    signIn(["direction"])
    const wrapper = await mountSuspended(DetailPanel, { props: { order: makeOrder({ modeRemise: "retrait" }) } })

    expect(wrapper.find("[data-testid='orders-detail-livreur-trigger']").exists()).toBe(false)
  })

  it("keeps it away from preparation, which never names a courier", async () => {
    signIn(["preparation"])
    const wrapper = await mountSuspended(DetailPanel, { props: { order: makeOrder() } })

    expect(wrapper.find("[data-testid='orders-detail-livreur-trigger']").exists()).toBe(false)
  })
})
