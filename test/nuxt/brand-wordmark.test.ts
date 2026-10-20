import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import BrandWordmark from "@/components/BrandWordmark.vue"

describe("admin wordmark", () => {
  it("presents KatiMarket without the former logo lockup", async () => {
    const wrapper = await mountSuspended(BrandWordmark)

    expect(wrapper.text()).toContain("KATIMARKET")
    expect(wrapper.find("img").exists()).toBe(false)
    wrapper.unmount()
  })
})
