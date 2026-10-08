import type { Filter } from "@/components/vuzeno/filters"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import ContentBannerFilterBar from "@/components/content/BannerFilterBar.vue"

interface BannerFilterBarProps {
  filters: Filter[]
  canWrite: boolean
  resultCount: number
  hasActiveFilters: boolean
}

const BASE_PROPS: BannerFilterBarProps = {
  filters: [],
  canWrite: false,
  resultCount: 0,
  hasActiveFilters: false,
}

function mount(overrides: Partial<BannerFilterBarProps> = {}) {
  return mountSuspended(ContentBannerFilterBar, {
    props: { ...BASE_PROPS, ...overrides },
  })
}

describe("content banner filter bar", () => {
  let wrapper: Awaited<ReturnType<typeof mount>>

  afterEach(() => wrapper?.unmount())

  it("hides the add-banner button for a read-only viewer", async () => {
    wrapper = await mount({ canWrite: false })

    expect(wrapper.find("[data-testid='banner-filter-add-button']").exists()).toBe(false)
  })

  it("shows the add-banner button for a viewer who can write, and emits add on click", async () => {
    wrapper = await mount({ canWrite: true })

    const button = wrapper.get("[data-testid='banner-filter-add-button']")
    await button.trigger("click")

    expect(wrapper.emitted("add")).toHaveLength(1)
  })

  it("renders a chip for an active status filter", async () => {
    const filters: Filter[] = [{ field: "status", operator: "eq", value: "active" }]
    wrapper = await mount({ filters })

    expect(wrapper.text()).toContain("Status")
    expect(wrapper.find("[aria-label='Remove filter']").exists()).toBe(true)
  })

  it("removing the status chip emits update:filters with it gone", async () => {
    const filters: Filter[] = [{ field: "status", operator: "eq", value: "active" }]
    wrapper = await mount({ filters })

    await wrapper.get("[aria-label='Remove filter']").trigger("click")

    expect(wrapper.emitted("update:filters")?.at(-1)).toEqual([[]])
  })

  it("renders a chip for a search filter", async () => {
    const filters: Filter[] = [{ field: "q", operator: "contains", value: "promo" }]
    wrapper = await mount({ filters })

    expect(wrapper.text()).toContain("Search")
    expect(wrapper.find("[aria-label='Remove filter']").exists()).toBe(false)
  })

  it("hides its own clear button until a filter is actually active", async () => {
    wrapper = await mount({ hasActiveFilters: false })

    expect(wrapper.find("[data-testid='banner-filter-clear']").exists()).toBe(false)
  })

  /**
   * Not `Filters.Clear` — clicking it must ask the page to reset the chips to their
   *  neutral state, not empty the array and make them disappear.
   */
  it("emits clear, rather than emptying the filters itself, when its clear button is clicked", async () => {
    const filters: Filter[] = [{ field: "status", operator: "eq", value: "active" }]
    wrapper = await mount({ filters, hasActiveFilters: true })

    await wrapper.get("[data-testid='banner-filter-clear']").trigger("click")

    expect(wrapper.emitted("clear")).toHaveLength(1)
    expect(wrapper.emitted("update:filters")).toBeUndefined()
  })
})
