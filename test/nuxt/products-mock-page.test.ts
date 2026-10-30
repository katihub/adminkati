import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ProductsPage from "@/pages/legacy-products.vue"

const backendListProduct = {
  id: 9001,
  slug: "backend-product",
  nom: "Backend-only product",
  prix: 1,
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
}

const backendProduct = {
  ...backendListProduct,
  nom_source: null,
  ajoute_le: null,
  url_source: null,
  caracteristiques: [],
  fiche_technique: null,
  inventaire: { produit_id: 9001, quantite_stock: 10, statut_stock: "en_stock", modifie_le: null },
  categorie_nom: null,
  rayon: null,
  images: [],
  categories: [],
  historique: [],
}

function seedSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "mock-user",
    membreId: "mock-member",
    nom: "Mock Admin",
    courriel: "mock@example.com",
    roles: ["direction"],
  })
}

describe("products page API mode", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("renders the catalogue and selected detail from backend responses", async () => {
    seedSession()
    const requests = { list: 0, detail: 0, taxonomy: 0 }
    const listCleanup = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "GET",
      handler: () => {
        requests.list += 1
        return { total: 1, page: 1, taille: 50, pages: 1, produits: [backendListProduct] }
      },
    })
    const detailCleanup = registerEndpoint(`/api/v1/catalogue/administration/produits/${backendListProduct.id}`, {
      method: "GET",
      handler: () => {
        requests.detail += 1
        return backendProduct
      },
    })
    const taxonomyCleanup = registerEndpoint("/api/v1/catalogue/administration/taxonomie", {
      method: "GET",
      handler: () => {
        requests.taxonomy += 1
        return { rayons: [], categories: [], marques: [] }
      },
    })

    const wrapper = await mountSuspended(ProductsPage, { route: `/products?id=${backendListProduct.id}` })

    try {
      await flushPromises()

      expect(requests).toEqual({ list: 1, detail: 1, taxonomy: 1 })
      expect(wrapper.findAll("[data-testid='products-list-item']")).toHaveLength(1)
      expect(wrapper.get("[data-testid='products-list-item-name']").text()).toBe(backendListProduct.nom)
      expect((wrapper.get("[data-testid='products-detail-overview-title']").element as HTMLInputElement).value).toBe(
        backendProduct.nom,
      )
    } finally {
      listCleanup()
      detailCleanup()
      taxonomyCleanup()
      wrapper.unmount()
    }
  })
})
