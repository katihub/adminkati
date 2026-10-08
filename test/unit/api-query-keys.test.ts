import { describe, expect, it } from "vitest"
import { apiQueryKeys } from "../../app/utils/api-query-keys"

describe("admin API query keys", () => {
  it("keeps filtered product lists distinct while sharing one invalidation prefix", () => {
    const recent = apiQueryKeys.products.list({ etat: "actifs", tri: "recent" })
    const retired = apiQueryKeys.products.list({ etat: "retires", tri: "recent" })

    expect(recent).not.toEqual(retired)
    expect(recent.slice(0, apiQueryKeys.products.all.length)).toEqual(apiQueryKeys.products.all)
    expect(retired.slice(0, apiQueryKeys.products.all.length)).toEqual(apiQueryKeys.products.all)
  })

  it("places product details below the same resource prefix as its lists", () => {
    const detail = apiQueryKeys.products.detail(42)

    expect(detail.slice(0, apiQueryKeys.products.all.length)).toEqual(apiQueryKeys.products.all)
    expect(detail).not.toEqual(apiQueryKeys.products.detail(43))
  })

  it("keeps catalogue and caisse views under invalidatable resource prefixes", () => {
    expect(apiQueryKeys.catalogue.proposals({ page: 2 }).slice(0, apiQueryKeys.catalogue.all.length)).toEqual(
      apiQueryKeys.catalogue.all,
    )
    expect(apiQueryKeys.caisse.detail("caisse-42").slice(0, apiQueryKeys.caisse.all.length)).toEqual(
      apiQueryKeys.caisse.all,
    )
  })

  it("keeps one customer's order history distinct from another's while sharing the orders invalidation prefix", () => {
    const first = apiQueryKeys.orders.list({ clientId: "customer-1", tri: "recent", taille: 50 })
    const second = apiQueryKeys.orders.list({ clientId: "customer-2", tri: "recent", taille: 50 })

    expect(first).not.toEqual(second)
    expect(first.slice(0, apiQueryKeys.orders.all.length)).toEqual(apiQueryKeys.orders.all)
    expect(second.slice(0, apiQueryKeys.orders.all.length)).toEqual(apiQueryKeys.orders.all)
  })

  it("keys one product's inventory below the products prefix, distinct per product", () => {
    const inventory = apiQueryKeys.products.inventory(42)

    expect(inventory).toEqual(["v1", "produits", "inventaire", 42])
    expect(inventory).not.toEqual(apiQueryKeys.products.inventory(43))
    expect(inventory.slice(0, apiQueryKeys.products.all.length)).toEqual(apiQueryKeys.products.all)
  })
})
