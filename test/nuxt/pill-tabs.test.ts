import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import PillTabs from "@/components/PillTabs.vue"

const items = [
  { value: "a", label: "A", icon: "ph:tag", testid: "pill-a" },
  { value: "b", label: "B", testid: "pill-b" },
]

describe("pillTabs", () => {
  it("marks the item matching modelValue as current", async () => {
    const wrapper = await mountSuspended(PillTabs, { props: { items, modelValue: "a" } })

    expect(wrapper.get("[data-testid='pill-a']").attributes("aria-current")).toBe("true")
    expect(wrapper.get("[data-testid='pill-b']").attributes("aria-current")).toBeUndefined()
  })

  it("emits update:modelValue with the clicked item's value", async () => {
    const wrapper = await mountSuspended(PillTabs, { props: { items, modelValue: "a" } })

    await wrapper.get("[data-testid='pill-b']").trigger("click")

    expect(wrapper.emitted("update:modelValue")).toEqual([["b"]])
  })
})
