import { mountSuspended } from "@nuxt/test-utils/runtime"
import { getQuery } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ProductsPage from "@/pages/legacy-products.vue"
import { useProductListStore } from "@/stores/product-list"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { clearEndpoints, existsInBody, inBody, settle, stubEndpoint } from "./delivery-fixture"
import { seedStockSession, STOCK_PRODUCTS_PATH, stockPage } from "./stock-import-fixture"

const mounted: Array<{ unmount: () => void }> = []
const EXPORT_PATH = `${STOCK_PRODUCTS_PATH}/inventaire/export`
let originalCreate: typeof URL.createObjectURL
let originalRevoke: typeof URL.revokeObjectURL
const exportQueries: Record<string, unknown>[] = []
let listTotal = 0
describe("products bulk stock import entry point", () => {
  beforeEach(() => {
    useProductListStore().$reset()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false } })
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.taxonomy.all, { rayons: [], categories: [], marques: [] })
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.products.list(useProductListStore().filters), {
      pages: [stockPage([])],
      pageParams: [1],
    })
    exportQueries.length = 0
    listTotal = 0
    stubEndpoint(STOCK_PRODUCTS_PATH, "GET", () => stockPage([], { total: listTotal }))
    stubEndpoint(EXPORT_PATH, "GET", event => {
      exportQueries.push(getQuery(event))
      return new Blob(["product,quantity"], { type: "text/csv" })
    })
    originalCreate = URL.createObjectURL
    originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => "blob:mock-url")
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })
  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    useProductListStore().$reset()
  })
  it("lets direction open stock import from the products header", async () => {
    seedStockSession()
    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    mounted.push(wrapper)
    await settle()
    expect(wrapper.get("[data-testid='products-import-button']").text()).toBe("Adjust stock")
  })
  it("does not give comptoir a stock import entry point", async () => {
    seedStockSession("comptoir")
    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    mounted.push(wrapper)
    await settle()
    expect(wrapper.find("[data-testid='products-import-button']").exists()).toBe(false)
  })
  it("does not give comptoir a stock export entry point", async () => {
    seedStockSession("comptoir")
    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    mounted.push(wrapper)
    await settle()
    expect(wrapper.find("[data-testid='products-export-button']").exists()).toBe(false)
  })
  it("exports the list's current filters, without paging", async () => {
    seedStockSession()
    listTotal = 5
    const store = useProductListStore()
    store.setSearchTerm("câble")
    store.setState("actifs")
    store.setStock("en-stock")
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.products.list(store.filters), {
      pages: [stockPage([], { total: listTotal })],
      pageParams: [1],
    })
    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    mounted.push(wrapper)
    await settle()

    await wrapper.get("[data-testid='products-export-button']").trigger("click")
    await settle()
    expect(existsInBody("stock-export-dialog")).toBe(true)
    inBody("stock-export-confirm").element.click()
    await vi.waitFor(() => expect(exportQueries).toHaveLength(1))

    expect(exportQueries[0]).toMatchObject({
      q: "câble",
      stock: "en-stock",
      etat: "actifs",
      mode: "count",
      format: "xlsx",
    })
    expect(exportQueries[0]).not.toHaveProperty("page")
    expect(exportQueries[0]).not.toHaveProperty("taille")
  })
  it("shows how many products the current list matches", async () => {
    seedStockSession()
    listTotal = 3
    const store = useProductListStore()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.products.list(store.filters), {
      pages: [stockPage([], { total: 3 })],
      pageParams: [1],
    })
    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
    mounted.push(wrapper)
    await settle()

    await wrapper.get("[data-testid='products-export-button']").trigger("click")
    await settle()
    expect(inBody("stock-export-count").text()).toContain("3 products")
  })
})
