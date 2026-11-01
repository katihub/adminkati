import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import SellerCommission from "@/components/operations/SellerCommission/SellerCommission.vue"

const SELLER = "22222222-2222-4222-8222-222222222222"
let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
})

function type(selector: string, value: string) {
  const field = document.body.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
  field.value = value
  field.dispatchEvent(new Event("input"))
}

describe("seller commission rate", () => {
  it("lets the direction change the rate with a reason, sent in basis points", async () => {
    const bodies: unknown[] = []
    cleanups.push(
      registerEndpoint(`/api/v1/vendeurs/${SELLER}/commission`, {
        method: "POST",
        handler: async event => {
          bodies.push(await readBody(event))
          return { id: SELLER, commissionBps: 750 }
        },
      }),
    )
    const wrapper = await mountSuspended(SellerCommission, {
      attachTo: document.body,
      props: { sellerId: SELLER, commissionBps: 1000, canEdit: true },
    })
    expect(wrapper.get("[data-testid='seller-commission-rate']").text()).toBe("10 %")

    await wrapper.get("[data-testid='seller-commission-edit']").trigger("click")
    await flushPromises()
    type("[data-testid='seller-commission-input']", "7,5")
    type("[data-testid='seller-commission-reason']", "Partenariat de lancement")
    await flushPromises()
    document.body.querySelector<HTMLButtonElement>("[data-testid='seller-commission-confirm']")!.click()

    await vi.waitFor(() => expect(bodies).toEqual([{ commissionBps: 750, motif: "Partenariat de lancement" }]))
  })

  it("keeps the save button off for an unchanged rate or a short reason", async () => {
    const wrapper = await mountSuspended(SellerCommission, {
      attachTo: document.body,
      props: { sellerId: SELLER, commissionBps: 1000, canEdit: true },
    })
    await wrapper.get("[data-testid='seller-commission-edit']").trigger("click")
    await flushPromises()
    const confirm = () => document.body.querySelector<HTMLButtonElement>("[data-testid='seller-commission-confirm']")!
    type("[data-testid='seller-commission-reason']", "Remise accordée")
    await flushPromises()
    expect(confirm().disabled).toBe(true)
    type("[data-testid='seller-commission-input']", "120")
    await flushPromises()
    expect(confirm().disabled).toBe(true)
  })

  it("shows the rate without an edit button outside the direction", async () => {
    const wrapper = await mountSuspended(SellerCommission, {
      props: { sellerId: SELLER, commissionBps: 1250, canEdit: false },
    })
    expect(wrapper.get("[data-testid='seller-commission-rate']").text()).toBe("12,5 %")
    expect(wrapper.find("[data-testid='seller-commission-edit']").exists()).toBe(false)
  })
})
