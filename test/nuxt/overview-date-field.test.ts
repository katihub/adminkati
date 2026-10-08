import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import ProductsOverviewDateField from "@/components/products/OverviewDateField.vue"

const TRIGGER = "[data-testid='date-trigger']"
const CLEAR = "[data-testid='date-clear']"

function mountField(props: { modelValue: string; disabled?: boolean }) {
  return mountSuspended(ProductsOverviewDateField, {
    props,
    attrs: { "data-testid": "date-trigger" },
    attachTo: document.body,
  })
}

describe("products overview date field", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("reads the stored day back on the trigger", async () => {
    const wrapper = await mountField({ modelValue: "2026-09-30" })

    expect(wrapper.get(TRIGGER).text()).toBe("September 30, 2026")

    wrapper.unmount()
  })

  it("invites a pick while no day is set", async () => {
    const wrapper = await mountField({ modelValue: "" })

    expect(wrapper.get(TRIGGER).text()).toBe("Pick a date")
    expect(wrapper.find(CLEAR).exists()).toBe(false)

    wrapper.unmount()
  })

  it("emits the picked day in the form's own format and closes the calendar", async () => {
    const wrapper = await mountField({ modelValue: "2026-09-30" })

    await wrapper.get(TRIGGER).trigger("click")
    expect(wrapper.get(TRIGGER).attributes("aria-expanded")).toBe("true")
    const day = document.body.querySelector<HTMLElement>("[data-slot='calendar-cell-trigger'][data-value='2026-09-15']")
    expect(day).not.toBeNull()
    day!.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-09-15"]])
    expect(wrapper.get(TRIGGER).attributes("aria-expanded")).toBe("false")

    wrapper.unmount()
  })

  it("empties the field when the day is cleared", async () => {
    const wrapper = await mountField({ modelValue: "2026-09-30" })

    await wrapper.get(CLEAR).trigger("click")

    expect(wrapper.emitted("update:modelValue")).toEqual([[""]])

    wrapper.unmount()
  })

  it("stays inert when disabled", async () => {
    const wrapper = await mountField({ modelValue: "2026-09-30", disabled: true })

    expect(wrapper.get(TRIGGER).attributes("disabled")).toBeDefined()
    expect(wrapper.find(CLEAR).exists()).toBe(false)

    await wrapper.get(TRIGGER).trigger("click")
    expect(document.body.querySelector("[data-slot='calendar']")).toBeNull()

    wrapper.unmount()
  })
})
