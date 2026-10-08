import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { describe, expect, it } from "vitest"
import PaymentDialog from "@/components/orders/PaymentDialog.vue"

describe("orders payment dialog", () => {
  it("only offers collection to a cashier role with a positive balance", async () => {
    const preparationWrapper = await mountSuspended(PaymentDialog, {
      props: { reference: "NT-000042", remaining: 125_000, roles: ["preparation"], status: "prete_au_retrait" },
    })

    expect(preparationWrapper.find("[data-testid='orders-payment-dialog-trigger']").exists()).toBe(false)
    preparationWrapper.unmount()

    const settledWrapper = await mountSuspended(PaymentDialog, {
      props: { reference: "NT-000042", remaining: 0, roles: ["comptoir"], status: "prete_au_retrait" },
    })

    expect(settledWrapper.find("[data-testid='orders-payment-dialog-trigger']").exists()).toBe(false)
    settledWrapper.unmount()
  })

  it("is the primary action only at the money-changes-hands stages, so it never competes with a state's real primary transition", async () => {
    const readyForPickup = await mountSuspended(PaymentDialog, {
      props: { reference: "NT-000042", remaining: 125_000, roles: ["comptoir"], status: "prete_au_retrait" },
    })
    expect(readyForPickup.get("[data-testid='orders-payment-dialog-trigger']").attributes("data-variant")).toBe(
      "default",
    )
    readyForPickup.unmount()

    const preparing = await mountSuspended(PaymentDialog, {
      props: { reference: "NT-000042", remaining: 125_000, roles: ["comptoir"], status: "en_preparation" },
    })
    expect(preparing.get("[data-testid='orders-payment-dialog-trigger']").attributes("data-variant")).toBe("outline")
    preparing.unmount()
  })

  it("submits the amount, default collection values, and optional note", async () => {
    let observedBody: unknown
    const cleanup = registerEndpoint("/api/v1/commandes/NT-000042/encaisser", {
      method: "POST",
      handler: async event => {
        observedBody = await readBody(event)
        return { resteAPayer: 75_000, statutPaiement: "en_attente", caisseId: "caisse-1" }
      },
    })
    const wrapper = await mountSuspended(PaymentDialog, {
      props: {
        reference: "NT-000042",
        remaining: 125_000,
        roles: ["comptoir"],
        status: "prete_au_retrait",
        open: true,
      },
      attachTo: document.body,
    })

    const amount = document.body.querySelector<HTMLInputElement>("[data-testid='orders-payment-dialog-amount']")
    const note = document.body.querySelector<HTMLTextAreaElement>("[data-testid='orders-payment-dialog-note']")
    const confirmButton = document.body.querySelector<HTMLButtonElement>(
      "[data-testid='orders-payment-dialog-confirm']",
    )
    if (!amount || !note || !confirmButton) throw new Error("Payment dialog did not mount")

    amount.value = "50000"
    amount.dispatchEvent(new Event("input", { bubbles: true }))
    note.value = "Cash received"
    note.dispatchEvent(new Event("input", { bubbles: true }))
    await flushPromises()
    confirmButton.click()
    await flushPromises()

    expect(observedBody).toEqual({ montant: 50_000, moyen: "especes", lieu: "comptoir", note: "Cash received" })

    cleanup()
    wrapper.unmount()
  })
})
