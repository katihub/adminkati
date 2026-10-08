import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import TaxonomyRecalculateCountersAction from "@/components/taxonomy/RecalculateCountersAction.vue"

const TRIGGER = "[data-testid='taxonomy-recalculate-trigger']"

function mountAction(props: { pending?: boolean; error?: string } = {}) {
  return mountSuspended(TaxonomyRecalculateCountersAction, {
    props: { pending: false, error: "", ...props },
  })
}

describe("taxonomy recalculate counters action", () => {
  it("asks the page to open the confirmation when clicked", async () => {
    const wrapper = await mountAction()

    await wrapper.get(TRIGGER).trigger("click")

    expect(wrapper.emitted("trigger")).toHaveLength(1)
  })

  it("cannot be clicked again while a recalculation is running", async () => {
    const wrapper = await mountAction({ pending: true })

    expect(wrapper.get(TRIGGER).attributes("disabled")).toBeDefined()
    expect(wrapper.get(TRIGGER).attributes("aria-busy")).toBe("true")

    await wrapper.get(TRIGGER).trigger("click")
    expect(wrapper.emitted("trigger")).toBeUndefined()
  })

  it("says why a recalculation failed", async () => {
    const wrapper = await mountAction({ error: "Too many requests" })

    expect(wrapper.get("[data-testid='taxonomy-recalculate-error']").text()).toBe("Too many requests")
  })
})
