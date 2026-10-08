import type { ProductListItem } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { nextTick } from "vue"
import TaxonomyProductsTabContent from "@/components/taxonomy/ProductsTabContent.vue"
import { installFakeIntersectionObserver } from "./fake-intersection-observer"

const SENTINEL = "[data-testid='category-products-sentinel']"
const SKELETON = "[data-testid='category-product-skeleton']"
const CARD = "[data-testid='category-product-card']"
const COUNT = "[data-testid='category-products-count']"
const FAILED_STRIP = "[data-testid='category-products-load-failed']"
const ADD = "[data-testid='category-products-add']"

function product(id: number): ProductListItem {
  return {
    id,
    slug: `p-${id}`,
    nom: `Produit ${id}`,
    prix: 1000,
    prix_reference: null,
    remise_pct: null,
    statut_stock: "en_stock",
    quantite_stock: 10,
    marque: null,
    categorie_principale_id: 1,
    retire_le: null,
    categorie: null,
    rayon: null,
    image: null,
  }
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

interface Props {
  products?: ProductListItem[]
  total?: number | null
  isPending?: boolean
  error?: unknown
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
}

function mountTab(props: Props = {}) {
  return mountSuspended(TaxonomyProductsTabContent, {
    props: {
      products: [product(1), product(2)],
      total: 2,
      isPending: false,
      error: null,
      hasNextPage: true,
      isFetchingNextPage: false,
      emptyTitle: "No products in this category",
      emptyHint: "Products in its subcategories show up here too.",
      kind: "category",
      ...props,
    },
    attachTo: document.body,
  })
}

describe("taxonomy products tab states", () => {
  let observer: ReturnType<typeof installFakeIntersectionObserver>

  beforeEach(() => {
    observer = installFakeIntersectionObserver()
    seedSession(["direction"])
  })
  afterEach(() => {
    observer.restore()
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  describe("first load", () => {
    it("shows placeholders shaped like the cards, and tells assistive tech it is busy", async () => {
      const wrapper = await mountTab({ products: [], total: null, isPending: true })

      expect(wrapper.findAll(SKELETON)).toHaveLength(4)
      expect(wrapper.get("[data-testid='category-products-loading']").attributes("aria-busy")).toBe("true")
      expect(wrapper.find(CARD).exists()).toBe(false)

      wrapper.unmount()
    })
  })

  describe("loading more", () => {
    it("keeps a row of placeholder cards where the next page will land", async () => {
      const wrapper = await mountTab({ isFetchingNextPage: true })

      expect(wrapper.findAll(CARD)).toHaveLength(2)
      expect(wrapper.findAll(SKELETON)).toHaveLength(2)
      expect(wrapper.get("[role='status']").text()).toContain("Loading more products")

      await wrapper.setProps({ isFetchingNextPage: false })
      expect(wrapper.find(SKELETON).exists()).toBe(false)

      wrapper.unmount()
    })

    it("asks for the next page by itself when the end of the list scrolls into view", async () => {
      const wrapper = await mountTab()

      expect(wrapper.emitted("loadMore")).toBeUndefined()
      observer.setVisible(true)
      await nextTick()

      expect(wrapper.emitted("loadMore")).toHaveLength(1)

      wrapper.unmount()
    })

    it("does not ask again while a page is loading, then checks again once it lands", async () => {
      const wrapper = await mountTab({ isFetchingNextPage: true })

      observer.setVisible(true)
      await nextTick()
      expect(wrapper.emitted("loadMore")).toBeUndefined()

      // The page lands and the end of the list is still on screen (tall panel, few rows).
      await wrapper.setProps({ isFetchingNextPage: false })
      await nextTick()

      expect(wrapper.emitted("loadMore")).toHaveLength(1)

      wrapper.unmount()
    })

    it("stops watching once every page has been loaded", async () => {
      const wrapper = await mountTab({ hasNextPage: false })

      expect(wrapper.find(SENTINEL).exists()).toBe(false)
      observer.setVisible(true)
      await nextTick()
      expect(wrapper.emitted("loadMore")).toBeUndefined()

      wrapper.unmount()
    })
  })

  describe("empty", () => {
    it("explains why nothing is listed, with the wording it was given", async () => {
      const wrapper = await mountTab({ products: [], total: 0, hasNextPage: false })

      const empty = wrapper.get("[data-testid='category-products-empty']")
      expect(empty.text()).toContain("No products in this category")
      expect(empty.text()).toContain("Products in its subcategories show up here too.")
      expect(wrapper.find(COUNT).exists()).toBe(false)

      wrapper.unmount()
    })

    it("offers the direction role a way to add a product, opening the add form", async () => {
      const wrapper = await mountTab({ products: [], total: 0, hasNextPage: false })

      const add = wrapper.get(ADD)
      expect(add.text()).toBe("Add a product")
      expect(add.attributes("href")).toBe("/products?new=1")

      wrapper.unmount()
    })

    it("offers nobody else that shortcut", async () => {
      seedSession(["comptoir"])
      const wrapper = await mountTab({ products: [], total: 0, hasNextPage: false })

      expect(wrapper.find(ADD).exists()).toBe(false)
      expect(wrapper.get("[data-testid='category-products-empty']").text()).toContain("No products in this category")

      wrapper.unmount()
    })
  })

  describe("count", () => {
    it("shows progress while pages are still arriving", async () => {
      const wrapper = await mountTab({ total: 61, hasNextPage: true })

      expect(wrapper.get(COUNT).text()).toBe("2 of 61 products")

      wrapper.unmount()
    })

    it("shows the total once everything is loaded", async () => {
      const wrapper = await mountTab({ total: 61, hasNextPage: false })

      expect(wrapper.get(COUNT).text()).toBe("61 products")

      wrapper.unmount()
    })

    it("uses the singular for a single product", async () => {
      const wrapper = await mountTab({ products: [product(1)], total: 1, hasNextPage: false })

      expect(wrapper.get(COUNT).text()).toBe("1 product")

      wrapper.unmount()
    })

    it("stays out of the way until the total is known", async () => {
      const wrapper = await mountTab({ total: null })

      expect(wrapper.find(COUNT).exists()).toBe(false)

      wrapper.unmount()
    })
  })

  describe("failed", () => {
    it("says what went wrong on the first load and lets the operator retry", async () => {
      const wrapper = await mountTab({ products: [], total: null, error: { statusCode: 500 } })

      const card = wrapper.get("[data-testid='api-error-card']")
      expect(card.text()).toContain("The service had a problem")

      await card.get("button").trigger("click")
      expect(wrapper.emitted("retry")).toHaveLength(1)

      wrapper.unmount()
    })

    it("keeps the loaded cards and shows a compact strip when a later page fails", async () => {
      const wrapper = await mountTab({ error: { statusCode: 500 } })

      expect(wrapper.findAll(CARD)).toHaveLength(2)
      expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(false)
      expect(wrapper.get(FAILED_STRIP).text()).toContain("Could not load more products.")

      wrapper.unmount()
    })

    it("does not hammer a failing endpoint, and retries from the strip", async () => {
      const wrapper = await mountTab({ error: { statusCode: 500 } })

      observer.setVisible(true)
      await nextTick()
      expect(wrapper.emitted("loadMore")).toBeUndefined()

      await wrapper.get(`${FAILED_STRIP} button`).trigger("click")
      expect(wrapper.emitted("loadMore")).toHaveLength(1)

      wrapper.unmount()
    })
  })
})
