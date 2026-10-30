import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import OrdersPage from "@/pages/orders.vue"

describe("orders and quotes tab routing", () => {
  beforeEach(() => {
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Admin",
      courriel: "admin@example.com",
      roles: ["direction"],
    })
  })
  it("persists the Quotes list in the URL and follows navigation back to Orders", async () => {
    const wrapper = await mountSuspended(OrdersPage, { route: "/orders", attachTo: document.body })

    await wrapper.get("[data-testid='orders-tab-quotes']").trigger("click")
    await vi.waitFor(() => expect(useRoute().query.quote).toBe("1"))

    await navigateTo("/orders")
    await flushPromises()
    expect(wrapper.get("[data-testid='orders-tab-orders']").attributes("aria-current")).toBe("true")
    wrapper.unmount()
  })

  it("treats the sidebar quote marker as a list rather than requesting a quote numbered 1", async () => {
    const wrongDetail = vi.fn(() => ({}))
    const cleanList = registerEndpoint("/api/v1/devis/equipe", () => [])
    const cleanDetail = registerEndpoint("/api/v1/devis/1", wrongDetail)
    const wrapper = await mountSuspended(OrdersPage, { route: "/orders?quote=1" })
    await flushPromises()
    expect(wrongDetail).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(wrapper.find("[data-testid='quotes-detail-empty']").exists()).toBe(true))
    wrapper.unmount()
    cleanList()
    cleanDetail()
  })
  it("opens the Quotes tab for a quote deep link and clears it when returning to Orders", async () => {
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Awa Admin",
      courriel: "admin@example.com",
      roles: ["direction"],
    })
    const wrapper = await mountSuspended(OrdersPage, { route: "/orders?quote=DV-000042", attachTo: document.body })
    await flushPromises()

    expect(wrapper.get("[data-testid='orders-tab-quotes']").attributes("aria-current")).toBe("true")

    await wrapper.get("[data-testid='orders-tab-orders']").trigger("click")
    await vi.waitFor(() => expect(useRoute().query.quote).toBeUndefined())
    await flushPromises()

    expect(useRoute().query.quote).toBeUndefined()
    expect(wrapper.get("[data-testid='orders-tab-orders']").attributes("aria-current")).toBe("true")

    wrapper.unmount()
  })
})
