import type { ProduitsFilters } from "@/composables/useProduits"
import type { ProductListItem, ProductListResponse } from "@/types/api/produits"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import ProductsListPanel from "@/components/products/ListPanel.vue"

let idCounter = 0

function makeProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  idCounter += 1
  return {
    id: idCounter,
    slug: `produit-${idCounter}`,
    nom: `Produit ${idCounter}`,
    prix: 10_000,
    prix_reference: null,
    remise_pct: null,
    statut_stock: "en_stock",
    quantite_stock: 10,
    marque: null,
    categorie_principale_id: null,
    retire_le: null,
    categorie: null,
    rayon: null,
    image: null,
    ...overrides,
  }
}

function makeResponse(overrides: Partial<ProductListResponse> & { produits: ProductListItem[] }): ProductListResponse {
  return {
    total: overrides.produits.length,
    page: 1,
    taille: overrides.produits.length,
    pages: 1,
    ...overrides,
  }
}

function seedProduits(filters: ProduitsFilters, page: ProductListResponse) {
  useNuxtApp().$queryClient.setQueryData(["v1", "produits", filters], { pages: [page], pageParams: [1] })
}

describe("products list panel", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("emits the clicked row's product id", async () => {
    const filters: ProduitsFilters = {}
    const products = [
      makeProduct({ id: 201, nom: "Casque Bluetooth" }),
      makeProduct({ id: 202, nom: "Chargeur USB-C" }),
    ]
    seedProduits(filters, makeResponse({ produits: products }))

    const wrapper = await mountSuspended(ProductsListPanel, { props: { filters } })
    await flushPromises()

    const rows = wrapper.findAll("[data-testid='products-list-item']")
    await rows[1]!.trigger("click")

    expect(wrapper.emitted("select")).toEqual([[products[1]!.id]])

    wrapper.unmount()
  })

  it("re-keys the list to page one instead of appending when the filters change", async () => {
    const filtersA: ProduitsFilters = {}
    const filtersB: ProduitsFilters = { q: "routeur" }
    const productsA = [
      makeProduct({ id: 301, nom: "Casque Bluetooth" }),
      makeProduct({ id: 302, nom: "Chargeur USB-C" }),
    ]
    const productsB = [makeProduct({ id: 401, nom: "Routeur Wi-Fi" })]
    seedProduits(filtersA, makeResponse({ produits: productsA }))
    seedProduits(filtersB, makeResponse({ produits: productsB }))

    const wrapper = await mountSuspended(ProductsListPanel, { props: { filters: filtersA } })
    await flushPromises()

    expect(wrapper.findAll("[data-testid='products-list-item-name']").map(node => node.text())).toEqual(
      productsA.map(product => product.nom),
    )

    await wrapper.setProps({ filters: filtersB })
    await flushPromises()

    expect(wrapper.findAll("[data-testid='products-list-item-name']").map(node => node.text())).toEqual(
      productsB.map(product => product.nom),
    )

    wrapper.unmount()
  })

  it("fetches the next page when the list is scrolled near the bottom", async () => {
    const filters: ProduitsFilters = {}
    const productsPage1 = [makeProduct({ id: 501, nom: "Casque Bluetooth" })]
    const productsPage2 = [makeProduct({ id: 502, nom: "Routeur Wi-Fi" })]
    const page1 = makeResponse({ page: 1, pages: 2, produits: productsPage1 })
    const page2 = makeResponse({ page: 2, pages: 2, produits: productsPage2 })
    seedProduits(filters, page1)

    let calls = 0
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "GET",
      handler: () => {
        calls += 1
        return page2
      },
    })

    const wrapper = await mountSuspended(ProductsListPanel, { props: { filters } })
    await flushPromises()

    expect(calls).toBe(0)

    const viewport = wrapper.get("[data-slot='scroll-area-viewport']")
    Object.defineProperty(viewport.element, "scrollHeight", { value: 1000, configurable: true })
    Object.defineProperty(viewport.element, "clientHeight", { value: 400, configurable: true })
    Object.defineProperty(viewport.element, "scrollTop", { value: 900, configurable: true })

    await viewport.trigger("scroll")
    await flushPromises()

    expect(calls).toBe(1)

    const names = wrapper.findAll("[data-testid='products-list-item-name']").map(node => node.text())
    expect(names).toContain(productsPage1[0]!.nom)
    expect(names).toContain(productsPage2[0]!.nom)

    cleanup()
    wrapper.unmount()
  })

  it("shows the same simple no-products notice when the fetch fails as when results are empty", async () => {
    const filters: ProduitsFilters = {}
    // The app's global QueryClient retries a failed query once (`app/plugins/vue-query.ts`),
    // which would otherwise leave this query mid-backoff rather than settled in `error` by
    // the time the assertion runs — this test's own concern, not something worth touching
    // production retry behavior for.
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false } })
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "GET",
      handler: () => {
        throw createError({ statusCode: 500 })
      },
    })

    const wrapper = await mountSuspended(ProductsListPanel, { props: { filters } })
    await flushPromises()

    expect(wrapper.find("[data-testid='products-list-empty']").exists()).toBe(true)

    cleanup()
    wrapper.unmount()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: 1 } })
  })

  /**
   * A withdrawn product's badge reads "Withdrawn" whatever its stock flag, so the stock pills must
   * leave withdrawn products out; otherwise the store's default `etat: "tous"` rides along and the
   * pills overlap. The pill also has to keep the toolbar's own filters.
   */
  it.each([
    [
      "In stock",
      { q: "hp", marque: "HP", etat: "tous", tri: "nom" },
      { q: "hp", marque: "HP", tri: "nom", stock: "en-stock", etat: "actifs" },
    ],
    ["Out of stock", { q: "hp", etat: "tous" }, { q: "hp", stock: "rupture", etat: "actifs" }],
    ["Restocking", { q: "hp", etat: "tous" }, { q: "hp", stock: "reapprovisionnement", etat: "actifs" }],
    ["Withdrawn", { q: "hp", stock: "en-stock", etat: "actifs" }, { q: "hp", etat: "retires" }],
    ["All", { q: "hp", stock: "rupture", etat: "actifs" }, { q: "hp" }],
  ] as const)("scopes the %s pill to its own lifecycle state", async (label, current, expected) => {
    const filters: ProduitsFilters = { ...current }
    seedProduits(filters, makeResponse({ produits: [makeProduct()] }))

    const wrapper = await mountSuspended(ProductsListPanel, { props: { filters } })
    await flushPromises()

    const pill = wrapper.findAll("button").find(button => button.text().startsWith(label))
    await pill!.trigger("click")

    expect(wrapper.emitted("update:filters")?.[0]).toEqual([expected])

    wrapper.unmount()
  })

  it("marks the Restocking pill active, with the total, when the list is filtered to restocking products", async () => {
    const filters: ProduitsFilters = { stock: "reapprovisionnement", etat: "actifs" }
    seedProduits(filters, makeResponse({ produits: [makeProduct(), makeProduct(), makeProduct()] }))

    const wrapper = await mountSuspended(ProductsListPanel, { props: { filters } })
    await flushPromises()

    const pills = wrapper.findAll("button")
    expect(pills.find(button => button.text().startsWith("Restocking"))?.text()).toContain("3")
    expect(pills.find(button => button.text().startsWith("In stock"))?.text()).not.toMatch(/\d/)

    wrapper.unmount()
  })

  it("badges a non-withdrawn product awaiting restock as Restocking", async () => {
    const filters: ProduitsFilters = {}
    seedProduits(
      filters,
      makeResponse({
        produits: [makeProduct({ id: 951, statut_stock: "reapprovisionnement", quantite_stock: 0 })],
      }),
    )

    const wrapper = await mountSuspended(ProductsListPanel, { props: { filters } })
    await flushPromises()

    expect(wrapper.get("[data-testid='products-list-item']").text()).toContain("Restocking")

    wrapper.unmount()
  })

  it("badges a withdrawn product as Withdrawn even when it is awaiting restock", async () => {
    const filters: ProduitsFilters = {}
    seedProduits(
      filters,
      makeResponse({
        produits: [
          makeProduct({
            id: 952,
            statut_stock: "reapprovisionnement",
            quantite_stock: 0,
            retire_le: "2026-09-01T00:00:00.000Z",
          }),
        ],
      }),
    )

    const wrapper = await mountSuspended(ProductsListPanel, { props: { filters } })
    await flushPromises()

    const row = wrapper.get("[data-testid='products-list-item']").text()
    expect(row).toContain("Withdrawn")
    expect(row).not.toContain("Restocking")

    wrapper.unmount()
  })
})
