import type { Filter } from "@/components/vuzeno/filters"
import { CalendarDate } from "@internationalized/date"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import OrdersFilterBar from "@/components/orders/FilterBar.vue"

const NEUTRAL_FILTERS: Filter[] = [
  { field: "q", operator: "contains", value: null },
  { field: "statut", operator: "eq", value: null },
  { field: "tri", operator: "eq", value: "recent" },
  { field: "creeLe", operator: "btw", value: null },
]

interface OrdersFilterBarProps {
  filters: Filter[]
  hasActiveFilters: boolean
}

function mount(overrides: Partial<OrdersFilterBarProps> = {}) {
  return mountSuspended(OrdersFilterBar, {
    props: {
      filters: NEUTRAL_FILTERS,
      hasActiveFilters: false,
      ...overrides,
    },
    attachTo: document.body,
  })
}

describe("orders filter bar", () => {
  let wrapper: Awaited<ReturnType<typeof mount>>

  afterEach(() => {
    wrapper?.unmount()
  })

  it("renders the selected status option's label once the status filter is active", async () => {
    const filters: Filter[] = NEUTRAL_FILTERS.map(filter =>
      filter.field === "statut" ? { ...filter, value: "confirmee" } : filter,
    )
    wrapper = await mount({ filters })
    await flushPromises()

    expect(wrapper.text()).toContain("Confirmed")
  })

  it("renders the created-at range chip inline, not tucked behind a menu", async () => {
    wrapper = await mount()
    await flushPromises()

    expect(wrapper.find("[aria-label='Add filter']").exists()).toBe(false)
    expect(wrapper.text()).toContain("Created")
  })

  it("shows both selected days on the range chip, not a raw object", async () => {
    const filters: Filter[] = NEUTRAL_FILTERS.map(filter =>
      filter.field === "creeLe"
        ? { ...filter, value: { start: new CalendarDate(2026, 1, 5), end: new CalendarDate(2026, 1, 10) } }
        : filter,
    )
    wrapper = await mount({ filters })
    await flushPromises()

    expect(wrapper.text()).not.toContain("[object")
    expect(wrapper.text()).toContain("05-01-2026 - 10-01-2026")
  })
})
