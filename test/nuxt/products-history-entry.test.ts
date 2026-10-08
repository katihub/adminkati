import type { ProductHistoryEntry } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { createError } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ProductsHistoryEntry from "@/components/products/HistoryEntry.vue"
import { clearEndpoints, DELIVERY_PATH, deliveryOptions, settle, stubEndpoint } from "./delivery-fixture"

const DIFF = "[data-testid='products-history-panel-diff']"

function makeEntry(champs: ProductHistoryEntry["champs"]): ProductHistoryEntry {
  return {
    id: "h1",
    type: "modification",
    decidee_le: "2026-09-29T10:00:00.000Z",
    decidee_par: null,
    champs,
  } as unknown as ProductHistoryEntry
}

const mounted: Array<{ unmount: () => void }> = []

beforeEach(() =>
  useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } }),
)

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  clearEndpoints()
  useNuxtApp().$queryClient.clear()
})

async function mountEntry(champs: ProductHistoryEntry["champs"]) {
  const wrapper = await mountSuspended(ProductsHistoryEntry, { props: { entry: makeEntry(champs) } })
  mounted.push(wrapper)
  return wrapper
}

describe("products history entry: field labels", () => {
  it("names the delivery-time field in words instead of its column key", async () => {
    const wrapper = await mountEntry({ delai_livraison_id: { avant: null, apres: 3 } })

    const line = wrapper.get(DIFF)
    expect(line.text()).toContain("Delivery time")
    expect(line.text()).not.toContain("delai_livraison_id")
  })

  it("falls back to the raw key for a field it has no label for", async () => {
    const wrapper = await mountEntry({ champ_inconnu: { avant: "a", apres: "b" } })

    expect(wrapper.get(DIFF).text()).toContain("champ_inconnu")
  })
})

describe("products history entry: valid diff items", () => {
  it("renders image values through Nuxt Image without rewriting their URLs", async () => {
    const wrapper = await mountEntry({
      image: {
        avant: "https://cdn.example.com/products/old.webp",
        apres: "https://cdn.example.com/products/new.webp",
      },
    })

    const images = wrapper.findAll(`${DIFF} img`)
    expect(images).toHaveLength(2)
    expect(images.map(image => image.attributes("src"))).toEqual([
      "https://cdn.example.com/products/old.webp",
      "https://cdn.example.com/products/new.webp",
    ])
    expect(images.every(image => image.attributes("data-nuxt-img") !== undefined)).toBe(true)
  })

  it("summarizes a change with its type, status, and timestamp", async () => {
    const wrapper = await mountEntry({ nom: { avant: "Old name", apres: "New name" } })

    expect(wrapper.get("[data-testid='products-history-panel-type']").text()).toBe("Product updated")
    expect(wrapper.get("[data-testid='products-history-panel-status']").text()).toBe("Modified")
    expect(wrapper.get("[data-testid='products-history-panel-date']").attributes("datetime")).toBe(
      "2026-09-29T10:00:00.000Z",
    )
    expect(wrapper.get(DIFF).text()).toContain("Old name")
    expect(wrapper.get(DIFF).text()).toContain("New name")
  })

  it("hides the whole entry when no field value changed", async () => {
    const wrapper = await mountEntry({
      nom: { avant: "Same", apres: "Same" },
    })

    expect(wrapper.find("[data-testid='products-history-panel-entry']").exists()).toBe(false)
  })

  it("shows cleared and changed fields but not unchanged ones in the same entry", async () => {
    const wrapper = await mountEntry({
      fiche_technique: { avant: "Long text", apres: null },
      nom: { avant: "Old name", apres: "New name" },
      prix: { avant: "Same", apres: "Same" },
    })

    expect(wrapper.find("[data-testid='products-history-panel-entry']").exists()).toBe(true)
    const lines = wrapper.findAll(DIFF).map(line => line.text())
    expect(lines).toHaveLength(2)
    expect(lines.some(line => line.includes("Long text") && line.includes("N/A"))).toBe(true)
    expect(lines.some(line => line.includes("New name"))).toBe(true)
  })
})

describe("products history entry: delivery option", () => {
  const change = { delai_livraison_id: { avant: null, apres: 2 } }

  it("shows the delivery interval the id stands for instead of the raw id", async () => {
    stubEndpoint(DELIVERY_PATH, "GET", () => deliveryOptions())
    const wrapper = await mountEntry(change)
    await settle()

    await vi.waitFor(() => expect(wrapper.get(DIFF).text()).toMatch(/working/i))
    expect(wrapper.get(DIFF).text()).toContain("5")
  })

  it("falls back to the raw id when the delivery options fail to load", async () => {
    stubEndpoint(DELIVERY_PATH, "GET", () => {
      throw createError({ statusCode: 500, statusMessage: "Server Error" })
    })
    const wrapper = await mountEntry(change)
    await settle()

    const text = wrapper.get(DIFF).text()
    expect(text).not.toMatch(/working/i)
    expect(text).toMatch(/2\s*$/)
  })

  it("falls back to the raw id when the id is not among the options", async () => {
    stubEndpoint(DELIVERY_PATH, "GET", () => deliveryOptions())
    const wrapper = await mountEntry({ delai_livraison_id: { avant: null, apres: 999 } })
    await settle()

    expect(wrapper.get(DIFF).text()).toMatch(/999\s*$/)
  })
})

describe("products history entry: main category", () => {
  const TAXONOMY_PATH = "/api/v1/catalogue/administration/taxonomie"
  const change = { categorie_principale_id: { avant: 1, apres: 2 } }
  const category = (id: number, nom: string) => ({
    id,
    nom,
    slug: nom.toLowerCase(),
    parent_id: null,
    niveau: 1,
    rayon: "informatique",
    compte_total: 1,
    masquee: false,
  })

  it("shows the category names instead of their ids", async () => {
    stubEndpoint(TAXONOMY_PATH, "GET", () => ({
      rayons: [],
      categories: [category(1, "Casques"), category(2, "Chargeurs")],
      marques: [],
    }))
    const wrapper = await mountEntry(change)
    await settle()

    await vi.waitFor(() => expect(wrapper.get(DIFF).text()).toContain("Chargeurs"))
    expect(wrapper.get(DIFF).text()).toContain("Casques")
  })

  it("falls back to the raw ids when the taxonomy fails to load", async () => {
    stubEndpoint(TAXONOMY_PATH, "GET", () => {
      throw createError({ statusCode: 500, statusMessage: "Server Error" })
    })
    const wrapper = await mountEntry(change)
    await settle()

    const text = wrapper.get(DIFF).text()
    expect(text).toContain("1")
    expect(text).toContain("2")
    expect(text).not.toContain("Casques")
  })

  it("falls back to the raw id for a category the taxonomy does not list", async () => {
    stubEndpoint(TAXONOMY_PATH, "GET", () => ({
      rayons: [],
      categories: [category(1, "Casques")],
      marques: [],
    }))
    const wrapper = await mountEntry(change)
    await settle()

    await vi.waitFor(() => expect(wrapper.get(DIFF).text()).toContain("Casques"))
    expect(wrapper.get(DIFF).text()).toMatch(/2\s*$/)
  })
})
