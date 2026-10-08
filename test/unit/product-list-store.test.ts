import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useProductListStore } from "../../app/stores/product-list"

describe("product list UI state", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("omits empty controls and resets pagination when a filter changes", () => {
    const store = useProductListStore()
    store.setPage(4)
    store.setSearchTerm("  phone  ")
    store.setStock("en-stock")

    expect(store.filters).toEqual({ q: "phone", etat: "tous", stock: "en-stock", tri: "recent", page: 1, taille: 50 })
  })

  it("replaces the visible filters while retaining the default list pagination", () => {
    const store = useProductListStore()
    store.setPage(3)

    store.replaceFilters({ q: "router", rayon: "reseaux-telecom", etat: "tous", tri: "prix-croissant" })

    expect(store.filters).toEqual({
      q: "router",
      rayon: "reseaux-telecom",
      etat: "tous",
      tri: "prix-croissant",
      page: 1,
      taille: 50,
    })
  })

  it("returns all controls to their defaults on full reset", () => {
    const store = useProductListStore()
    store.setSearchTerm("phone")
    store.setRayon("electronique")
    store.setCategory(7)
    store.setBrand("NowTech")
    store.setState("retires")
    store.setSort("prix-croissant")
    store.setPageSize(25)
    store.setPage(3)

    store.$reset()

    expect(store.filters).toEqual({ etat: "tous", tri: "recent", page: 1, taille: 50 })
  })
})
