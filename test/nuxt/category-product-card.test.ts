import type { ProductListItem } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import CategoryProductCard from "@/components/taxonomy/CategoryProductCard.vue"

const LONG_NAME =
  "Routeur AFRILINK 4G LTE MIFI DP300 Bon prix en vente au Cameroun avec batterie longue durée et partage de connexion pour vingt appareils"

function product(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: 60257,
    slug: "routeur-afrilink",
    nom: "Routeur AFRILINK",
    prix: 22_900,
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
    ...overrides,
  }
}

async function mountCard(overrides: Partial<ProductListItem> = {}) {
  return mountSuspended(CategoryProductCard, { props: { product: product(overrides) }, attachTo: document.body })
}

describe("category product card", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("still tells the whole product name when a long one is clamped", async () => {
    const wrapper = await mountCard({ nom: LONG_NAME })

    expect(wrapper.get("h3").attributes("title")).toBe(LONG_NAME)

    wrapper.unmount()
  })

  it("says whether the product is in stock, out of stock, restocking or withdrawn", async () => {
    const inStock = await mountCard({ statut_stock: "en_stock" })
    expect(inStock.get("[data-testid='category-product-stock']").text()).toBe("In stock")
    inStock.unmount()

    const out = await mountCard({ statut_stock: "rupture", quantite_stock: 0 })
    expect(out.get("[data-testid='category-product-stock']").text()).toBe("Out of stock")
    out.unmount()

    const restocking = await mountCard({ statut_stock: "reapprovisionnement", quantite_stock: 0 })
    expect(restocking.get("[data-testid='category-product-stock']").text()).toBe("Restocking")
    restocking.unmount()

    const withdrawn = await mountCard({ retire_le: "2026-09-01T00:00:00.000Z" })
    expect(withdrawn.get("[data-testid='category-product-stock']").text()).toBe("Withdrawn")
    withdrawn.unmount()
  })

  it("says Withdrawn for a withdrawn product even when it is awaiting restock", async () => {
    const wrapper = await mountCard({
      statut_stock: "reapprovisionnement",
      quantite_stock: 0,
      retire_le: "2026-09-01T00:00:00.000Z",
    })

    expect(wrapper.get("[data-testid='category-product-stock']").text()).toBe("Withdrawn")

    wrapper.unmount()
  })

  it("opens the product in the products workspace", async () => {
    const wrapper = await mountCard()

    expect(wrapper.get("a").attributes("href")).toContain("id=60257")

    wrapper.unmount()
  })
})
