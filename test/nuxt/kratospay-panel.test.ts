import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { getQuery, readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import GatewayRefund from "@/components/operations/installment/GatewayRefund.vue"
import PaymentGatewayWorkspace from "@/components/operations/PaymentGatewayWorkspace.vue"
import MobileMoneyRequest from "@/components/orders/MobileMoneyRequest.vue"

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
})

describe("payment gateway (direction)", () => {
  it("shows the configuration, the waiting attempts, and checks one with Kratospay", async () => {
    const queries: Array<Record<string, unknown>> = []
    const checked: string[] = []
    cleanups = [
      registerEndpoint("/api/v1/paiements/kratospay/certification", {
        method: "GET",
        handler: () => ({
          pret: false,
          base: "https://api.kratospay.com",
          environnement: "production",
          notificationsSignees: true,
          consultationStatut: false,
          erreurs: ["consultation du statut non configurée"],
        }),
      }),
      registerEndpoint("/api/v1/paiements/kratospay/transactions", {
        method: "GET",
        handler: event => {
          queries.push(getQuery(event))
          return {
            compteurs: { attente: 1, echec: 0, reussis: 4 },
            elements: [
              {
                transId: "KM1",
                statut: "PENDING",
                montant: 45000,
                operateur: "orange",
                telephone: "690112233",
                demandeLe: "2026-10-28T10:00:00.000Z",
                objet: { type: "commande", reference: "CM-1" },
              },
            ],
          }
        },
      }),
      registerEndpoint("/api/v1/paiements/kratospay/transactions/KM1/consultation", {
        method: "POST",
        handler: () => {
          checked.push("KM1")
          return { encaisse: true, statut: "SUCCESS" }
        },
      }),
    ]
    const wrapper = await mountSuspended(PaymentGatewayWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='gateway-attempt-KM1']").exists()).toBe(true))
    expect(queries[0]).toMatchObject({ etat: "attente" })
    expect(wrapper.get("[data-testid='gateway-ready']").text()).toBe("Incomplete configuration")
    expect(wrapper.text()).toContain("consultation du statut non configurée")
    expect(wrapper.get("[data-testid='gateway-attempt-KM1']").text()).toContain("Order CM-1")

    await wrapper.get("[data-testid='gateway-check-KM1']").trigger("click")
    await vi.waitFor(() => expect(checked).toEqual(["KM1"]))

    await wrapper.get("[data-testid='gateway-state-echec']").trigger("click")
    await vi.waitFor(() => expect(queries.at(-1)).toMatchObject({ etat: "echec" }))
  })
})

describe("installment refund through Kratospay", () => {
  const plan = (remboursementPasserelle: unknown) =>
    ({
      reference: "PE-ABC123",
      statut: "annule_defaillance",
      rembourse: false,
      montantVerseFcfa: 30000,
      remboursementPasserelle,
    }) as never

  it("sends the refund, then offers to check it once submitted", async () => {
    const calls: string[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/echelonnement/admin/plans/PE-ABC123/remboursement/passerelle", {
        method: "POST",
        handler: () => {
          calls.push("passerelle")
          return {}
        },
      }),
    ]
    const nouveau = await mountSuspended(GatewayRefund, { props: { plan: plan(null) } })
    await nouveau.get("[data-testid='installment-plan-gateway-refund-PE-ABC123']").trigger("click")
    await vi.waitFor(() => expect(calls).toEqual(["passerelle"]))

    const soumis = await mountSuspended(GatewayRefund, {
      props: { plan: plan({ statut: "soumis", telephone: "690112233", montantFcfa: 30000, raisonEchec: null }) },
    })
    expect(soumis.get("[data-testid='installment-plan-gateway-PE-ABC123']").text()).toContain("690112233")
    expect(soumis.find("[data-testid='installment-plan-gateway-refund-PE-ABC123']").exists()).toBe(false)
    expect(soumis.find("[data-testid='installment-plan-gateway-check-PE-ABC123']").exists()).toBe(true)
  })
})

describe("mobile money request on an order", () => {
  it("sends the prompt for the order with the delivery number and the chosen operator", async () => {
    const bodies: unknown[] = []
    cleanups = [
      registerEndpoint("/api/v1/paiements/direct", {
        method: "POST",
        handler: async event => {
          bodies.push(await readBody(event))
          return { transId: "KM2", montant: 20000, telephone: "677000000", statut: "en_attente", instruction: "" }
        },
      }),
    ]
    const wrapper = await mountSuspended(MobileMoneyRequest, {
      props: { order: { reference: "CM-NT1", telephoneLivraison: "677000000" } as never },
    })
    expect((wrapper.get("[data-testid='orders-detail-mobile-money-phone']").element as HTMLInputElement).value).toBe(
      "677000000",
    )
    await wrapper.get("select").setValue("mtn")
    await wrapper.get("form").trigger("submit")
    await vi.waitFor(() => expect(bodies).toEqual([{ reference: "CM-NT1", telephone: "677000000", operateur: "mtn" }]))
  })
})
