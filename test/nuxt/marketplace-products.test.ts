import type { AdminMarketplaceProduct } from "@/types/api/catalogue-products"
import type { MarketplaceCategory } from "@/types/api/marketplace-categories"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import ProductForm from "@/components/catalogue/ProductForm/ProductForm.vue"
import ProductList from "@/components/catalogue/ProductList/ProductList.vue"

const productId = "abb85652-fba0-49fb-984e-dde2dbe65876"
const product = {
  id: productId,
  nom: "Ordinateur catalogue sans offre",
  slug: "ordinateur-catalogue",
  marque: "HP",
  categorie: "Informatique",
  statut: "actif",
  image: null,
  offres: 0,
  modifieLe: "2026-10-30T12:00:00.000Z",
}
const pagination = { page: 2, taille: 20, total: 61, pages: 4 }
const wrappers: Array<{ unmount: () => void }> = []
const categoryId = "eee85652-fba0-49fb-984e-dde2dbe65876"
const categories: MarketplaceCategory[] = [
  {
    id: categoryId,
    nom: "Informatique",
    slug: "informatique",
    parentId: null,
    garantieMinimaleMois: 12,
    uniteGarantie: "mois",
    ordre: 0,
    active: true,
    produits: 1,
    garantie: { mois: 12, unite: "mois", heritee: false, libelle: "1 an" },
    attributsVariante: [],
    installationActive: false,
    installationPrixFcfa: null,
    sousCategories: [],
  },
]
const detail: AdminMarketplaceProduct = {
  ...product,
  offres: [],
  categorieId: categoryId,
  description: "Description initiale",
  descriptionCourte: "Une description courte existante",
  ficheTechnique: "Fiche technique existante",
  ficheTechniquePdfUrl: null,
  metaTitre: null,
  metaDescription: null,
  images: [],
}

describe("marketplace common product editing", () => {
  afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

  it("requires an audit reason of at least five characters before editing a product", async () => {
    const wrapper = await mountSuspended(ProductForm, {
      props: { product: detail, categories, saving: false, error: null },
    })
    wrappers.push(wrapper)
    await wrapper.get("[data-testid='catalogue-product-name']").setValue("Nom corrigé")
    await wrapper.get("[data-testid='catalogue-product-reason']").setValue("court".slice(0, 4))
    const save = wrapper.get("[data-testid='catalogue-product-save']")
    expect(save.attributes("disabled")).toBeDefined()
    await save.trigger("click")
    expect(wrapper.emitted("save")).toBeUndefined()
    await wrapper.get("[data-testid='catalogue-product-reason']").setValue("Correction du nom")
    expect(wrapper.get("[data-testid='catalogue-product-save']").attributes("disabled")).toBeUndefined()
  })

  it("saves the common fields with their original version and reason but no seller price or stock", async () => {
    const wrapper = await mountSuspended(ProductForm, {
      props: { product: detail, categories, saving: false, error: null },
    })
    wrappers.push(wrapper)
    await wrapper.get("[data-testid='catalogue-product-name']").setValue("Nom corrigé")
    for (const field of ["brand", "description", "short", "technical"]) {
      await wrapper.get(`[data-testid='catalogue-product-${field}']`).setValue("")
    }
    await wrapper.get("[data-testid='catalogue-product-reason']").setValue("Correction du catalogue")
    await wrapper.get("[data-testid='catalogue-product-save']").trigger("click")
    expect(wrapper.emitted("save")).toEqual([
      [
        {
          nom: "Nom corrigé",
          marque: null,
          description: null,
          descriptionCourte: null,
          ficheTechnique: null,
          categorieId: categoryId,
          modifieLe: product.modifieLe,
          motif: "Correction du catalogue",
        },
      ],
    ])
    expect(wrapper.find("[data-testid='catalogue-product-slug']").exists()).toBe(false)
    const fields = wrapper
      .findAll("input,select,textarea")
      .map(
        field =>
          `${field.attributes("name") ?? ""} ${field.attributes("id") ?? ""} ${field.attributes("data-testid") ?? ""}`,
      )
      .join(" ")
    expect(fields).not.toMatch(/prix|price|stock/i)
  })

  it("does not save while a previous correction is still pending", async () => {
    const wrapper = await mountSuspended(ProductForm, {
      props: { product: detail, categories, saving: true, error: null },
    })
    wrappers.push(wrapper)
    const save = wrapper.get("[data-testid='catalogue-product-save']")
    expect(save.attributes("disabled")).toBeDefined()
    await save.trigger("click")
    expect(wrapper.emitted("save")).toBeUndefined()
  })

  it("validates required creation fields and emits a new slug without claiming an existing version", async () => {
    const wrapper = await mountSuspended(ProductForm, {
      props: { product: null, categories, saving: false, error: null },
    })
    wrappers.push(wrapper)
    expect(wrapper.get("[data-testid='catalogue-product-save']").attributes("disabled")).toBeDefined()
    await wrapper.get("[data-testid='catalogue-product-name']").setValue("Produit créé")
    await wrapper.get("[data-testid='catalogue-product-category']").setValue(categoryId)
    await wrapper.get("[data-testid='catalogue-product-slug']").setValue("produit-cree")
    await wrapper.get("[data-testid='catalogue-product-short']").setValue("trop court".slice(0, 9))
    expect(wrapper.get("[data-testid='catalogue-product-save']").attributes("disabled")).toBeDefined()
    await wrapper.get("[data-testid='catalogue-product-short']").setValue("Description courte complète")
    await wrapper.get("[data-testid='catalogue-product-save']").trigger("click")
    expect(wrapper.emitted("save")).toEqual([
      [
        {
          nom: "Produit créé",
          marque: null,
          description: null,
          descriptionCourte: "Description courte complète",
          ficheTechnique: null,
          categorieId: categoryId,
          modifieLe: "",
          motif: "",
          slug: "produit-cree",
        },
      ],
    ])
  })
})

describe("marketplace product directory", () => {
  afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

  it("displays a genuine catalogue product with no seller offers and opens its own product id", async () => {
    const wrapper = await mountSuspended(ProductList, {
      props: { products: [product], loading: false, error: null, pagination },
    })
    wrappers.push(wrapper)
    const entry = wrapper.get(`[data-testid='marketplace-product-${productId}']`)
    expect(entry.text()).toContain(product.nom)
    expect(entry.text()).toContain(product.marque)
    expect(entry.text()).toContain("0")
    await entry.trigger("click")
    expect(wrapper.emitted("select")).toEqual([[productId]])
  })

  it("exposes a retryable backend failure rather than presenting an empty successful directory", async () => {
    const wrapper = await mountSuspended(ProductList, {
      props: { products: [], loading: false, error: { statusCode: 503, message: "Unavailable" }, pagination },
    })
    wrappers.push(wrapper)
    const error = wrapper.get("[data-testid='api-error-card']")
    expect(wrapper.findComponent({ name: "EmptyStateCard" }).exists()).toBe(false)
    await error.get("button").trigger("click")
    expect(wrapper.emitted("retry")).toHaveLength(1)
  })

  it("moves between server pages using their real page numbers", async () => {
    const wrapper = await mountSuspended(ProductList, {
      props: { products: [product], loading: false, error: null, pagination },
    })
    wrappers.push(wrapper)
    await wrapper.get("[data-testid='marketplace-products-previous']").trigger("click")
    await wrapper.get("[data-testid='marketplace-products-next']").trigger("click")
    expect(wrapper.emitted("page")).toEqual([[1], [3]])
  })

  it("blocks pagination while waiting for the current page instead of queuing competing selections", async () => {
    const wrapper = await mountSuspended(ProductList, {
      props: { products: [product], loading: true, error: null, pagination },
    })
    wrappers.push(wrapper)
    for (const direction of ["previous", "next"]) {
      const button = wrapper.get(`[data-testid='marketplace-products-${direction}']`)
      expect(button.attributes("disabled")).toBeDefined()
      await button.trigger("click")
    }
    expect(wrapper.emitted("page")).toBeUndefined()
  })

  it("prevents navigation outside the first and last server pages", async () => {
    const wrapper = await mountSuspended(ProductList, {
      props: { products: [product], loading: false, error: null, pagination: { ...pagination, page: 1 } },
    })
    wrappers.push(wrapper)
    expect(wrapper.get("[data-testid='marketplace-products-previous']").attributes("disabled")).toBeDefined()
    await wrapper.setProps({ pagination: { ...pagination, page: 4 } })
    expect(wrapper.get("[data-testid='marketplace-products-next']").attributes("disabled")).toBeDefined()
  })
})
