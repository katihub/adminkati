import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import BrandWordmark from "@/components/BrandWordmark.vue"

describe("BrandWordmark", () => {
  it.each(["sm", "md"] as const)("renders the KatiHub identity in its %s size", async size => {
    const wrapper = await mountSuspended(BrandWordmark, { props: { size } })

    expect(wrapper.text()).toBe("KATIHUB")
    expect(wrapper.text()).not.toMatch(/now\s*tech/i)
    expect(wrapper.get("img").attributes("src")).toContain("/katihub-logo-official.png")

    wrapper.unmount()
  })
})
