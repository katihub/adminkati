import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import QuotesDetailSkeleton from "@/components/quotes/DetailSkeleton.vue"

describe("QuotesDetailSkeleton", () => {
  it("renders a structured skeleton UI with accessible status and aria attributes", async () => {
    const wrapper = await mountSuspended(QuotesDetailSkeleton, {
      props: {
        label: "Chargement du devis...",
      },
    })

    const root = wrapper.get("[data-testid='quotes-detail-loading']")
    expect(root.attributes("role")).toBe("status")
    expect(root.attributes("aria-busy")).toBe("true")
    expect(root.text()).toContain("Chargement du devis...")

    const skeletons = wrapper.findAll("[data-slot='skeleton']")
    expect(skeletons.length).toBeGreaterThan(10)

    expect(wrapper.classes().join(" ")).not.toContain("border")
    for (const card of wrapper.findAll(".bg-card")) {
      expect(card.classes().join(" ")).not.toContain("border")
    }

    wrapper.unmount()
  })
})
