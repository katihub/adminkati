import type { TaxonomieCategorie, TaxonomieRayon } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ProductsOverviewCategories from "@/components/products/OverviewCategories.vue"
import ProductsOverviewDepartments from "@/components/products/OverviewDepartments.vue"

const departments = [
  { id: "d1", slug: "computers", nom: "Computers" },
  { id: "d2", slug: "networking", nom: "Networking" },
  { id: "d3", slug: "printing", nom: "Printing" },
  { id: "d4", slug: "security", nom: "Security" },
  { id: "d5", slug: "power", nom: "Power" },
  { id: "d6", slug: "cameras", nom: "Cameras" },
] as unknown as TaxonomieRayon[]

const categories = [
  {
    id: 1,
    nom: "Thermal printers",
    slug: "thermal",
    parent_id: null,
    niveau: 1,
    rayon: null,
    compte_total: 1,
    masquee: false,
  },
  {
    id: 2,
    nom: "Chargers",
    slug: "chargers",
    parent_id: null,
    niveau: 1,
    rayon: null,
    compte_total: 1,
    masquee: false,
  },
  {
    id: 3,
    nom: "Accessories",
    slug: "accessories",
    parent_id: null,
    niveau: 1,
    rayon: null,
    compte_total: 1,
    masquee: false,
  },
  { id: 4, nom: "Racks", slug: "racks", parent_id: null, niveau: 1, rayon: null, compte_total: 1, masquee: false },
  { id: 5, nom: "Cables", slug: "cables", parent_id: null, niveau: 1, rayon: null, compte_total: 1, masquee: false },
  {
    id: 6,
    nom: "Switches",
    slug: "switches",
    parent_id: null,
    niveau: 1,
    rayon: null,
    compte_total: 1,
    masquee: false,
  },
] as TaxonomieCategorie[]

const DEPARTMENTS = "[data-testid='products-detail-overview-sizes']"
const CATEGORIES = "[data-testid='products-detail-overview-colors']"
const OPTION = "[role='option']"

const mounted: Array<{ unmount: () => void }> = []

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ""
})

async function mountDepartments(activeValue: string | null, disabled = false) {
  const wrapper = await mountSuspended(ProductsOverviewDepartments, {
    props: { departments, activeValue, disabled },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** `open` is owned by the parent form, so the harness plays that role and feeds the emitted state back. */
async function mountCategories(selectedId: number | null, disabled = false) {
  const wrapper = await mountSuspended(ProductsOverviewCategories, {
    props: {
      categories: categories,
      selectedId,
      open: false,
      disabled,
      "onUpdate:open": (value: boolean) => wrapper.setProps({ open: value }),
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

function optionLabels() {
  return [...document.body.querySelectorAll(OPTION)].map(option => option.textContent?.trim())
}

describe("products overview: single-choice pickers", () => {
  it("shows the chosen department in one pill instead of listing departments", async () => {
    const wrapper = await mountDepartments("d3")
    const triggers = wrapper.get(DEPARTMENTS).findAll("button")

    expect(triggers).toHaveLength(1)
    expect(triggers[0]!.text()).toContain("Printing")
    expect(wrapper.get(DEPARTMENTS).text()).not.toContain("Networking")
  })

  it("shows a placeholder when no department is chosen", async () => {
    const wrapper = await mountDepartments(null)

    expect(wrapper.get(DEPARTMENTS).findAll("button")).toHaveLength(1)
    expect(wrapper.get(DEPARTMENTS).text()).toContain("Choose a department")
  })

  it("lists every department in the dropdown and emits the picked one", async () => {
    const wrapper = await mountDepartments("d3")

    await wrapper.get(DEPARTMENTS).get("button").trigger("click")
    await flushPromises()

    expect(optionLabels()).toEqual(departments.map(department => department.nom))

    const networking = [...document.body.querySelectorAll<HTMLElement>(OPTION)].find(option =>
      option.textContent?.includes("Networking"),
    )!
    networking.click()
    await flushPromises()

    expect(wrapper.emitted("update:activeValue")).toEqual([["d2"]])
  })

  it("shows the chosen category in one pill and emits the picked one from the dropdown", async () => {
    const wrapper = await mountCategories(3)
    const triggers = wrapper.get(CATEGORIES).findAll("button")

    expect(triggers).toHaveLength(1)
    expect(triggers[0]!.text()).toContain("Accessories")

    await triggers[0]!.trigger("click")
    await flushPromises()
    expect(optionLabels()).toEqual(categories.map(category => category.nom))

    const chargers = [...document.body.querySelectorAll<HTMLElement>(OPTION)].find(option =>
      option.textContent?.includes("Chargers"),
    )!
    chargers.click()
    await flushPromises()

    expect(wrapper.emitted("select")).toEqual([[2]])
  })

  it("shows a placeholder when no category is chosen", async () => {
    const wrapper = await mountCategories(null)

    expect(wrapper.get(CATEGORIES).text()).toContain("Choose a category")
  })

  it.each([
    ["departments", () => mountDepartments("d1", true), DEPARTMENTS],
    ["categories", () => mountCategories(1, true), CATEGORIES],
  ])("cannot open the %s dropdown when disabled", async (_name, mountIt, selector) => {
    const wrapper = await mountIt()

    expect(
      wrapper
        .get(selector as string)
        .get("button")
        .attributes("disabled"),
    ).toBeDefined()
  })
})
