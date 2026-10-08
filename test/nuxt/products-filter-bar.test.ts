import type { Filter } from "@/components/vuzeno/filters"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ProductsFilterBar from "@/components/products/FilterBar.vue"

function seedTaxonomie() {
  useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], {
    rayons: [{ id: "high-tech", nom: "High-Tech" }],
    categories: [{ id: 12, nom: "Casques" }],
    marques: [{ nom: "Acme" }],
  })
}

const NEUTRAL_FILTERS: Filter[] = [
  { field: "q", operator: "contains", value: null },
  { field: "categorie", operator: "eq", value: null },
  { field: "tri", operator: "eq", value: "recent" },
]

interface ProductsFilterBarProps {
  filters: Filter[]
  hasActiveFilters: boolean
}

function mount(overrides: Partial<ProductsFilterBarProps> = {}) {
  return mountSuspended(ProductsFilterBar, {
    props: {
      filters: NEUTRAL_FILTERS,
      hasActiveFilters: false,
      ...overrides,
    },
    attachTo: document.body,
  })
}

describe("products filter bar", () => {
  let wrapper: Awaited<ReturnType<typeof mount>>

  afterEach(() => {
    wrapper?.unmount()
    useNuxtApp().$queryClient.clear()
  })

  it("offers only filters that are not already rendered inline", async () => {
    wrapper = await mount()

    await wrapper.get("[aria-label='Add filter']").trigger("click")
    await flushPromises()

    const menuLabels = [...document.body.querySelectorAll("[role='menuitem']")].map(item => item.textContent?.trim())

    expect(menuLabels).not.toContain("Search")
    expect(menuLabels).not.toContain("Category")
    expect(menuLabels).not.toContain("Sort")
    expect(menuLabels).toContain("Department")
    expect(menuLabels).toContain("Brand")
  })

  it("renders the real brand list, showing the selected option's label", async () => {
    seedTaxonomie()
    const filters: Filter[] = [...NEUTRAL_FILTERS, { field: "marque", operator: "eq", value: "Acme" }]
    wrapper = await mount({ filters })
    await flushPromises()

    expect(wrapper.text()).toContain("Acme")
  })

  /** The backend answers a longer `q` with a 400, which the list shows as "no products". */
  it("caps the search input at the backend's 120-character limit", async () => {
    wrapper = await mount()

    expect(wrapper.get("[data-testid='products-filter-bar'] input").attributes("maxlength")).toBe("120")
  })

  /**
   * Category names in this catalogue are inconsistent about accents ("Securité Electronique",
   * "Caméras de Surveillance"); typing without them must still find the option.
   */
  it("finds a category option when the typed search omits its accents", async () => {
    useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], {
      rayons: [],
      categories: [
        { id: 62, nom: "Securité Electronique/Biometrie" },
        { id: 70, nom: "Caméras de Surveillance" },
        { id: 113, nom: "Laptop HP" },
      ],
      marques: [],
    })
    wrapper = await mount()
    await flushPromises()

    const categoryChip = wrapper.findAll("[data-slot='filters-item']").find(chip => chip.text().includes("Category"))
    const valueTrigger = categoryChip!
      .findAll("[data-slot='menu-trigger']")
      .find(trigger => trigger.text() === "Choose")
    await valueTrigger!.trigger("click")
    await flushPromises()

    const openMenu = document.body.querySelector("[role='menu'][data-state='open']")
    const search = openMenu!.querySelector<HTMLInputElement>("[data-slot='menu-filter-input']")
    search!.value = "securite"
    search!.dispatchEvent(new Event("input", { bubbles: true }))
    await flushPromises()

    const options = [...openMenu!.querySelectorAll("[role='menuitem']")].map(item => item.textContent?.trim())
    expect(options).toEqual(["Securité Electronique/Biometrie"])
  })

  it("hides its own clear button until a filter is actually active", async () => {
    wrapper = await mount({ hasActiveFilters: false })

    expect(wrapper.find("[data-testid='products-filter-clear']").exists()).toBe(false)
  })

  /**
   * Not `Filters.Clear` — clicking it must ask the page to reset the fields to their
   *  neutral state, not empty the array and make the chips disappear.
   */
  it("emits clear, rather than mutating the filters itself, when its clear button is clicked", async () => {
    wrapper = await mount({ hasActiveFilters: true })

    await wrapper.get("[data-testid='products-filter-clear']").trigger("click")

    expect(wrapper.emitted("clear")).toHaveLength(1)
    expect(wrapper.emitted("update:filters")).toBeUndefined()
  })
})
