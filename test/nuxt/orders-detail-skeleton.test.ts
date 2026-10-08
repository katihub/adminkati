import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import OrdersDetailSkeleton from "@/components/orders/DetailSkeleton.vue"

describe("OrdersDetailSkeleton", () => {
  it("renders a structured skeleton UI with accessible status and aria attributes", async () => {
    const wrapper = await mountSuspended(OrdersDetailSkeleton, {
      props: {
        label: "Chargement de la commande...",
      },
    })

    const root = wrapper.get("[data-testid='orders-detail-loading']")
    expect(root.attributes("role")).toBe("status")
    expect(root.attributes("aria-busy")).toBe("true")
    expect(root.text()).toContain("Chargement de la commande...")

    const skeletons = wrapper.findAll("[data-slot='skeleton']")
    expect(skeletons.length).toBeGreaterThan(15)

    expect(wrapper.classes().join(" ")).not.toContain("border")
    for (const card of wrapper.findAll(".bg-card")) {
      expect(card.classes().join(" ")).not.toContain("border")
    }

    wrapper.unmount()
  })
})
