import type { Filter } from "@/components/vuzeno/filters"
import type { Rayon } from "@/types/api/taxonomie"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import TaxonomyCategoryToolbar from "@/components/taxonomy/CategoryToolbar.vue"

const DEPARTMENTS: Rayon[] = [{ id: "network", slug: "network", nom: "Network", nom_court: "Net", compte_total: 2 }]

interface CategoryToolbarProps {
  filters: Filter[]
  departments: Rayon[]
  canWrite: boolean
  hasActiveFilters: boolean
}

function mount(overrides: Partial<CategoryToolbarProps> = {}) {
  return mountSuspended(TaxonomyCategoryToolbar, {
    props: {
      filters: [],
      departments: DEPARTMENTS,
      canWrite: false,
      hasActiveFilters: false,
      ...overrides,
    },
    attachTo: document.body,
  })
}

describe("category toolbar", () => {
  let wrapper: Awaited<ReturnType<typeof mount>>

  afterEach(() => wrapper?.unmount())

  it("hides the add-category button for a read-only viewer", async () => {
    wrapper = await mount({ canWrite: false })

    expect(wrapper.find("[data-testid='category-toolbar-add']").exists()).toBe(false)
  })

  it("emits expand, collapse, and add", async () => {
    wrapper = await mount({ canWrite: true })

    await wrapper.get("[data-testid='category-toolbar-expand']").trigger("click")
    await wrapper.get("[data-testid='category-toolbar-collapse']").trigger("click")
    await wrapper.get("[data-testid='category-toolbar-add']").trigger("click")

    expect(wrapper.emitted("expand")).toHaveLength(1)
    expect(wrapper.emitted("collapse")).toHaveLength(1)
    expect(wrapper.emitted("add")).toHaveLength(1)
  })

  it("joins expand and collapse into one group of icon-only buttons, each named for assistive tech", async () => {
    wrapper = await mount()
    const expand = wrapper.get("[data-testid='category-toolbar-expand']")
    const collapse = wrapper.get("[data-testid='category-toolbar-collapse']")

    expect(expand.element.parentElement).toBe(collapse.element.parentElement)
    expect(expand.element.parentElement?.getAttribute("data-slot")).toBe("button-group")

    expect(expand.text()).toBe("")
    expect(collapse.text()).toBe("")
    expect(expand.attributes("aria-label")).toBe("Expand all")
    expect(collapse.attributes("aria-label")).toBe("Collapse all")
  })

  it("names an icon-only button in a tooltip when it is focused", async () => {
    wrapper = await mount()

    expect(document.body.textContent).not.toContain("Collapse all")

    await wrapper.get("[data-testid='category-toolbar-collapse']").trigger("focus")
    await flushPromises()

    expect(document.body.textContent).toContain("Collapse all")
  })

  it("renders a chip for an active department filter, backed by the real department list", async () => {
    const filters: Filter[] = [{ field: "department", operator: "eq", value: "network" }]
    wrapper = await mount({ filters })

    expect(wrapper.text()).toContain("Department")
    expect(wrapper.find("[aria-label='Remove filter']").exists()).toBe(true)
  })

  it("keeps search permanently inline", async () => {
    const filters: Filter[] = [{ field: "q", operator: "contains", value: null }]
    wrapper = await mount({ filters })

    expect(wrapper.find("[aria-label='Remove filter']").exists()).toBe(false)
  })

  it("renders a chip for an active visibility filter", async () => {
    const filters: Filter[] = [{ field: "visibility", operator: "eq", value: "hidden" }]
    wrapper = await mount({ filters })

    expect(wrapper.text()).toContain("Visibility")
    expect(wrapper.find("[aria-label='Remove filter']").exists()).toBe(true)
  })

  it("hides the add-filter control when every field is rendered inline", async () => {
    const filters: Filter[] = [
      { field: "q", operator: "contains", value: null },
      { field: "department", operator: "eq", value: null },
      { field: "visibility", operator: "eq", value: null },
    ]
    wrapper = await mount({ filters })

    expect(wrapper.find("[aria-label='Add filter']").exists()).toBe(false)
  })

  it("removing a chip emits update:filters without it", async () => {
    const filters: Filter[] = [
      { field: "department", operator: "eq", value: "network" },
      { field: "visibility", operator: "eq", value: "hidden" },
    ]
    wrapper = await mount({ filters })

    await wrapper.findAll("[aria-label='Remove filter']")[0]!.trigger("click")

    expect(wrapper.emitted("update:filters")?.at(-1)).toEqual([[filters[1]]])
  })

  it("adding the search field from the menu creates an editable chip", async () => {
    wrapper = await mount()

    await wrapper.get("[aria-label='Add filter']").trigger("click")
    await flushPromises()

    document.body.querySelector<HTMLElement>("[data-value='q']")?.click()
    await flushPromises()

    expect(wrapper.emitted("update:filters")?.at(-1)).toEqual([[{ field: "q", operator: "contains", value: null }]])
  })

  it("hides its own clear button until a filter is actually active", async () => {
    wrapper = await mount({ hasActiveFilters: false })

    expect(wrapper.find("[data-testid='category-toolbar-clear']").exists()).toBe(false)
  })

  /**
   * Not `Filters.Clear` — clicking it must ask the page to reset the chips to their
   *  neutral state, not empty the array and make them disappear.
   */
  it("emits clear, rather than emptying the filters itself, when its clear button is clicked", async () => {
    const filters: Filter[] = [{ field: "department", operator: "eq", value: "network" }]
    wrapper = await mount({ filters, hasActiveFilters: true })

    await wrapper.get("[data-testid='category-toolbar-clear']").trigger("click")

    expect(wrapper.emitted("clear")).toHaveLength(1)
    expect(wrapper.emitted("update:filters")).toBeUndefined()
  })
})
