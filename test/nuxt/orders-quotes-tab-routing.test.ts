import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import OrdersPage from "@/pages/orders.vue"

describe("orders and quotes tab routing", () => {
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
