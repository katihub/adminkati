import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useOrderWorkspaceStore } from "../../app/stores/order-workspace"

describe("order workspace filters", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("trims whitespace from the search term before it lands in filters.q", () => {
    const store = useOrderWorkspaceStore()
    store.setSearchTerm("  awa  ")

    expect(store.filters).toStrictEqual({ q: "awa", tri: "recent", taille: 50 })
  })

  it("omits the q key entirely when the search term is empty or whitespace-only", () => {
    const store = useOrderWorkspaceStore()

    store.setSearchTerm("")
    expect(store.filters).not.toHaveProperty("q")

    store.setSearchTerm("   ")
    expect(store.filters).not.toHaveProperty("q")
  })

  it("adds the statut filter when set and removes it again when cleared", () => {
    const store = useOrderWorkspaceStore()

    store.setStatus("confirmee")
    expect(store.filters).toStrictEqual({ statut: "confirmee", tri: "recent", taille: 50 })

    store.setStatus(undefined)
    expect(store.filters).toStrictEqual({ tri: "recent", taille: 50 })
  })

  it("returns every filter to its default on reset", () => {
    const store = useOrderWorkspaceStore()
    store.setSearchTerm("awa")
    store.setStatus("confirmee")
    store.setSort("montant-decroissant")
    store.setDateRange({ start: "2026-01-05", end: "2026-01-10" })

    store.$reset()

    expect(store.filters).toStrictEqual({ tri: "recent", taille: 50 })
    expect(store.dateRange).toBeUndefined()
  })

  it("holds a date range beside the API filters, never inside them", () => {
    const store = useOrderWorkspaceStore()
    store.setDateRange({ start: "2026-01-05", end: "2026-01-10" })

    expect(store.dateRange).toEqual({ start: "2026-01-05", end: "2026-01-10" })
    expect(store.filters).toStrictEqual({ tri: "recent", taille: 50 })
    expect(store.filters).not.toHaveProperty("creeLe")
    expect(store.filters).not.toHaveProperty("start")
    expect(store.filters).not.toHaveProperty("end")

    store.setDateRange(undefined)
    expect(store.dateRange).toBeUndefined()
  })
})
