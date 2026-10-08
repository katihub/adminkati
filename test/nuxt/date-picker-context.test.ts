import type { Filter } from "@/components/vuzeno/filters"
import { CalendarDate } from "@internationalized/date"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import OrdersFilterBar from "@/components/orders/FilterBar.vue"

const FILTERS: Filter[] = [
  { field: "q", operator: "contains", value: null },
  { field: "statut", operator: "eq", value: null },
  { field: "tri", operator: "eq", value: "recent" },
  {
    field: "creeLe",
    operator: "btw",
    value: { start: new CalendarDate(2026, 9, 1), end: new CalendarDate(2026, 9, 8) },
  },
]

describe("date picker context", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not pass class or data-slot onto Ark's fragment DatePicker.Context", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const wrapper = await mountSuspended(OrdersFilterBar, {
      props: {
        filters: FILTERS,
        hasActiveFilters: true,
      },
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.get("[aria-label='Open calendar']").trigger("click")
    await flushPromises()

    const fragmentWarnings = warn.mock.calls
      .map(args => args.map(String).join(" "))
      .filter(
        message => message.includes("DatePickerContext") && message.includes("could not be automatically inherited"),
      )

    expect(fragmentWarnings).toEqual([])

    wrapper.unmount()
  })

  it("does not render the date-range popup until the trigger opens it", async () => {
    const wrapper = await mountSuspended(OrdersFilterBar, {
      props: {
        filters: FILTERS,
        hasActiveFilters: true,
      },
      attachTo: document.body,
    })

    expect(wrapper.find("[data-part='positioner']").exists()).toBe(false)

    await wrapper.get("[aria-label='Open calendar']").trigger("click")
    await flushPromises()

    expect(wrapper.find("[data-part='positioner']").exists()).toBe(true)
    wrapper.unmount()
  })
})
