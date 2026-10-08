import type { VueWrapper } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import BannerFocusPicker from "@/components/content/BannerFocusPicker.vue"

function mount(modelValue: number) {
  return mountSuspended(BannerFocusPicker, { props: { modelValue } })
}

function pressArrow(wrapper: VueWrapper, key: "ArrowLeft" | "ArrowRight") {
  return wrapper.get("[data-testid='banner-focus-picker-handle']").trigger("keydown", { key })
}

function lastEmittedValue(wrapper: VueWrapper) {
  return wrapper.emitted("update:modelValue")?.at(-1)?.[0]
}

describe("banner focus picker", () => {
  it("increments the focus value by one on ArrowRight", async () => {
    const wrapper = await mount(50)

    await pressArrow(wrapper, "ArrowRight")

    expect(lastEmittedValue(wrapper)).toBe(51)

    wrapper.unmount()
  })

  it("decrements the focus value by one on ArrowLeft", async () => {
    const wrapper = await mount(50)

    await pressArrow(wrapper, "ArrowLeft")

    expect(lastEmittedValue(wrapper)).toBe(49)

    wrapper.unmount()
  })

  it("clamps at 100 rather than exceeding it on ArrowRight", async () => {
    const wrapper = await mount(100)

    await pressArrow(wrapper, "ArrowRight")

    expect(lastEmittedValue(wrapper)).toBe(100)

    wrapper.unmount()
  })

  it("clamps at 0 rather than going negative on ArrowLeft", async () => {
    const wrapper = await mount(0)

    await pressArrow(wrapper, "ArrowLeft")

    expect(lastEmittedValue(wrapper)).toBe(0)

    wrapper.unmount()
  })
})
