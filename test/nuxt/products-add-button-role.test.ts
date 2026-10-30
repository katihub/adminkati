import type { ProductListResponse } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import ProductsPage from "@/pages/legacy-products.vue"
import { useProductListStore } from "@/stores/product-list"

function seedPage() {
  const page: ProductListResponse = { produits: [], total: 0, page: 1, taille: 0, pages: 1 }
  const client = useNuxtApp().$queryClient
  client.setQueryData(["v1", "produits", useProductListStore().filters], { pages: [page], pageParams: [1] })
  client.setQueryData(["v1", "taxonomie"], { rayons: [], categories: [], marques: [] })
}

function seedSession(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles,
  })
}

async function mountPage() {
  const wrapper = await mountSuspended(ProductsPage, { route: "/products" })
  await flushPromises()
  return wrapper
}

describe("products page add button", () => {
  beforeEach(() => useProductListStore().$reset())
  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    useProductListStore().$reset()
  })

  it("is offered to the direction role", async () => {
    seedSession(["direction"])
    seedPage()
    const wrapper = await mountPage()

    expect(wrapper.find("[data-testid='products-add-button']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("is not offered to the comptoir role, which the backend refuses to create products", async () => {
    seedSession(["comptoir"])
    seedPage()
    const wrapper = await mountPage()

    expect(wrapper.find("[data-testid='products-add-button']").exists()).toBe(false)

    wrapper.unmount()
  })
})
