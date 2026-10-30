import type { ProductDetail, ProductListItem, ProductListResponse } from "@/types/api/produits"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError, getQuery } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ProductsSummaryKpis from "@/components/products/SummaryKpis.vue"
import ProductsPage from "@/pages/legacy-products.vue"
import { useProductListStore } from "@/stores/product-list"

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

function makeProductDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
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
    inventaire: {
      produit_id: 1,
      quantite_stock: 10,
      statut_stock: "en_stock",
      modifie_le: null,
      disponibilite_forcee: null,
    },
    fiche_technique: null,
    marque: null,
    categorie_principale_id: null,
    retire_le: null,
    rayon: null,
    nom_source: null,
    ajoute_le: null,
    url_source: null,
    caracteristiques: [],
    description: null,
    categorie_nom: null,
    images: [],
    categories: [],
    historique: [],
    fiche_pdf: null,
    fiche_pdf_nom: null,
    fiche_pdf_octets: null,
    ...overrides,
  }
}

function seedProduits(page: ProductListResponse) {
  useNuxtApp().$queryClient.setQueryData(["v1", "produits", useProductListStore().filters], {
    pages: [page],
    pageParams: [1],
  })
}

function seedProduit(id: number, detail: ProductDetail) {
  useNuxtApp().$queryClient.setQueryData(["v1", "produits", id], detail)
}

function seedTaxonomie() {
  useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], { rayons: [], categories: [], marques: [] })
}

function seedSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles: ["direction"],
  })
}

/**
 * `ProductsDetailForm` is the same component in both modes (R5) — the only DOM difference
 * is the create-only slug field, so that's what tells add mode and edit mode apart here.
 */
function detailPanelState(wrapper: {
  get: (selector: string) => { find: (selector: string) => { exists: () => boolean } }
}) {
  const panel = wrapper.get("[data-testid='products-detail-panel']")
  return {
    empty: panel.find("[data-testid='products-detail-empty']").exists(),
    loading: panel.find("[data-testid='products-detail-loading']").exists(),
    form: panel.find("[data-testid='products-detail-form']").exists(),
    addMode: panel.find("[data-testid='products-detail-form-slug']").exists(),
  }
}

function formNomValue(wrapper: { get: (selector: string) => { element: HTMLInputElement } }) {
  return wrapper.get("[data-testid='products-detail-overview-title']").element.value
}

describe("products workspace page", () => {
  beforeEach(() => useProductListStore().$reset())
  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    useProductListStore().$reset()
  })

  it("renders the resolved product's detail once its data is cached for an explicit id", async () => {
    seedSession()
    seedProduits(makeResponse({ produits: [makeProduct({ id: 10 }), makeProduct({ id: 11 })] }))
    seedProduit(42, makeProductDetail({ id: 42, nom: "Casque filaire" }))
    seedTaxonomie()

    const wrapper = await mountSuspended(ProductsPage, { route: "/products?id=42" })
    await flushPromises()

    expect(detailPanelState(wrapper)).toEqual({ empty: false, loading: false, form: true, addMode: false })
    expect(formNomValue(wrapper)).toBe("Casque filaire")

    wrapper.unmount()
  })

  it("keeps the page header title static even when a product with its own name is selected", async () => {
    seedSession()
    seedProduits(makeResponse({ produits: [makeProduct({ id: 10 }), makeProduct({ id: 11 })] }))
    seedProduit(42, makeProductDetail({ id: 42, nom: "Casque filaire" }))
    seedTaxonomie()

    const wrapper = await mountSuspended(ProductsPage, { route: "/products?id=42" })
    await flushPromises()

    expect(wrapper.get("[data-testid='admin-page-header-title']").text()).toBe("Products")

    wrapper.unmount()
  })

  it("renders add mode instead of a product when the new query param is present", async () => {
    seedSession()
    seedProduits(makeResponse({ produits: [makeProduct(), makeProduct()] }))
    seedTaxonomie()

    const wrapper = await mountSuspended(ProductsPage, { route: "/products?new=1" })
    await flushPromises()

    expect(detailPanelState(wrapper)).toEqual({ empty: false, loading: false, form: true, addMode: true })
    expect(formNomValue(wrapper)).toBe("")

    wrapper.unmount()
  })

  it("prefers an explicit id over the new query param when both are present", async () => {
    seedSession()
    seedProduits(makeResponse({ produits: [makeProduct(), makeProduct()] }))
    seedProduit(7, makeProductDetail({ id: 7, nom: "Souris sans fil" }))
    seedTaxonomie()

    const wrapper = await mountSuspended(ProductsPage, { route: "/products?id=7&new=1" })
    await flushPromises()

    expect(detailPanelState(wrapper)).toEqual({ empty: false, loading: false, form: true, addMode: false })
    expect(formNomValue(wrapper)).toBe("Souris sans fil")

    wrapper.unmount()
  })

  it("auto-selects the first product when no id or new param is present", async () => {
    seedSession()
    const first = makeProduct({ id: 501, nom: "Casque Bluetooth" })
    const second = makeProduct({ id: 502, nom: "Chargeur USB-C" })
    seedProduits(makeResponse({ produits: [first, second] }))
    seedProduit(501, makeProductDetail({ id: 501, nom: "Casque Bluetooth" }))
    seedTaxonomie()

    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    await flushPromises()

    expect(detailPanelState(wrapper)).toEqual({ empty: false, loading: false, form: true, addMode: false })
    expect(formNomValue(wrapper)).toBe("Casque Bluetooth")

    const rows = wrapper.findAll("[data-testid='products-list-item']")
    const selectedRow = rows.find(row => row.get("[data-testid='products-list-item-name']").text() === first.nom)
    const otherRow = rows.find(row => row.get("[data-testid='products-list-item-name']").text() === second.nom)

    expect(selectedRow?.attributes("aria-pressed")).toBe("true")
    expect(otherRow?.attributes("aria-pressed")).toBe("false")

    wrapper.unmount()
  })

  it("shows the catalogue request error and lets the operator retry it", async () => {
    seedSession()
    seedTaxonomie()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false } })
    const product = makeProduct({ id: 590, nom: "Routeur Wi-Fi" })
    seedProduit(product.id, makeProductDetail({ id: product.id, nom: product.nom }))
    let backendAvailable = false
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "GET",
      handler: () => {
        if (!backendAvailable) throw createError({ statusCode: 500 })
        return makeResponse({ produits: [product] })
      },
    })

    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    await flushPromises()

    expect(wrapper.find("[data-testid='products-detail-empty']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(true)

    backendAvailable = true
    await wrapper.get("[data-testid='api-error-card'] button").trigger("click")
    await vi.waitFor(() => expect(wrapper.get("[data-testid='products-list-item-name']").text()).toBe(product.nom))

    cleanup()
    wrapper.unmount()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: 1 } })
  })

  it("synchronizes the inline filter bar's search input with the list query", async () => {
    seedSession()
    seedProduits(makeResponse({ produits: [makeProduct({ id: 601 })] }))
    seedTaxonomie()

    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    await flushPromises()

    const searchInput = wrapper.get("[data-testid='products-filter-bar']").get("input")
    await searchInput.setValue("router")

    expect(useProductListStore().filters.q).toBe("router")

    wrapper.unmount()
  })

  it("filters the page's product list when a quick stock filter is selected", async () => {
    seedSession()
    seedTaxonomie()
    const inStock = makeProduct({ id: 611, nom: "In-stock product", statut_stock: "en_stock" })
    const restocking = makeProduct({ id: 612, nom: "Restocking product", statut_stock: "reapprovisionnement" })
    seedProduits(makeResponse({ produits: [inStock, restocking] }))
    seedProduit(inStock.id, makeProductDetail({ id: inStock.id, nom: inStock.nom }))

    let requestedQuery: Record<string, unknown> | undefined
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "GET",
      handler: event => {
        requestedQuery = getQuery(event)
        return makeResponse({ produits: [inStock] })
      },
    })

    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    await flushPromises()

    const inStockPill = wrapper.findAll("button").find(button => button.text().startsWith("In stock"))
    await inStockPill!.trigger("click")
    await flushPromises()

    expect(useProductListStore().filters.stock).toBe("en-stock")
    expect(useProductListStore().filters.etat).toBe("actifs")
    expect(requestedQuery).toMatchObject({ stock: "en-stock", etat: "actifs" })
    await vi.waitFor(() =>
      expect(wrapper.findAll("[data-testid='products-list-item-name']").map(node => node.text())).toEqual([
        inStock.nom,
      ]),
    )

    cleanup()
    wrapper.unmount()
  })

  it("disables the add-product action while already in add mode", async () => {
    seedSession()
    seedProduits(makeResponse({ produits: [makeProduct()] }))
    seedTaxonomie()

    const wrapper = await mountSuspended(ProductsPage, { route: "/products?new=1" })
    await flushPromises()

    expect(wrapper.get("[data-testid='products-add-button']").attributes("disabled")).toBeDefined()

    wrapper.unmount()
  })

  it("keeps the add-product action enabled outside add mode", async () => {
    seedSession()
    seedProduits(makeResponse({ produits: [makeProduct()] }))
    seedTaxonomie()

    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    await flushPromises()

    expect(wrapper.get("[data-testid='products-add-button']").attributes("disabled")).toBeUndefined()

    wrapper.unmount()
  })

  it("summarises a product awaiting restock as Restocking, and a withdrawn one as Withdrawn", async () => {
    const restocking = makeProductDetail({ id: 71, statut_stock: "reapprovisionnement", quantite_stock: 0 })
    const withdrawn = makeProductDetail({
      id: 72,
      statut_stock: "reapprovisionnement",
      quantite_stock: 0,
      retire_le: "2026-09-01T00:00:00.000Z",
    })

    const first = await mountSuspended(ProductsSummaryKpis, { props: { product: restocking } })
    const second = await mountSuspended(ProductsSummaryKpis, { props: { product: withdrawn } })

    expect(first.get("[data-testid='products-summary-kpis']").text()).toContain("Restocking")
    expect(first.get("[data-testid='products-summary-kpis']").text()).not.toContain("Out of stock")
    expect(second.get("[data-testid='products-summary-kpis']").text()).toContain("Withdrawn")
    expect(second.get("[data-testid='products-summary-kpis']").text()).not.toContain("Restocking")

    first.unmount()
    second.unmount()
  })
})
