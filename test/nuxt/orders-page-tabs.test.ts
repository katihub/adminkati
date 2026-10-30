import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import OrdersPage from "@/pages/orders.vue"

describe("orders page tabs", () => {
  it("marks orders as the active tab by default", async () => {
    const wrapper = await mountSuspended(OrdersPage, { attachTo: document.body })

    expect(wrapper.get("[data-testid='orders-tab-orders']").attributes("aria-current")).toBe("true")

    wrapper.unmount()
  })

  it("switches the active tab to quotes when that tab is chosen", async () => {
    const wrapper = await mountSuspended(OrdersPage, { attachTo: document.body })

    await wrapper.get("[data-testid='orders-tab-quotes']").trigger("click")
    await flushPromises()

    await vi.waitFor(() =>
      expect(wrapper.get("[data-testid='orders-tab-quotes']").attributes("aria-current")).toBe("true"),
    )
    expect(wrapper.get("[data-testid='orders-tab-orders']").attributes("aria-current")).toBeUndefined()

    wrapper.unmount()
  })
})
