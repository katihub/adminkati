import type { ProductCategory, ProductDetail, ProductImage, Taxonomie } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ProductsDetailForm from "@/components/products/DetailForm.vue"
import {
  clearEndpoints,
  DEFAULT_OPTION,
  DELIVERY_PATH,
  deliveryOptions,
  inBody,
  settle,
  stubEndpoint,
  WORKING_DAYS_OPTION,
} from "./delivery-fixture"
import { stubInventory } from "./inventory-fixture"

let idCounter = 0

const PRINCIPAL_CATEGORY: ProductCategory = { id: 1, nom: "Casques", slug: "casques", rayon: "informatique" }
const SECONDARY_CATEGORY: ProductCategory = { id: 2, nom: "Chargeurs", slug: "chargeurs", rayon: "informatique" }

const TAXONOMIE_FIXTURE: Taxonomie = {
  rayons: [{ id: "r1", slug: "informatique", nom: "Informatique", nom_court: "Info", compte_total: 20 }],
  categories: [
    {
      id: PRINCIPAL_CATEGORY.id,
      nom: PRINCIPAL_CATEGORY.nom,
      slug: PRINCIPAL_CATEGORY.slug,
      parent_id: null,
      niveau: 1,
      rayon: "informatique",
      compte_total: 10,
      masquee: false,
    },
    {
      id: SECONDARY_CATEGORY.id,
      nom: SECONDARY_CATEGORY.nom,
      slug: SECONDARY_CATEGORY.slug,
      parent_id: null,
      niveau: 1,
      rayon: "informatique",
      compte_total: 6,
      masquee: false,
    },
  ],
  marques: [{ nom: "Anker", slug: "anker", nombre_produits: 12, logo_url: null }],
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

function makePopulatedProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  const images: ProductImage[] = [
    { rang: 1, url: "https://example.com/img1.jpg", chemin_local: null, octets: null, alt: "Vue de face" },
    { rang: 2, url: "https://example.com/img2.jpg", chemin_local: null, octets: null, alt: "Vue de côté" },
  ]
  return makeProductDetail({
    nom: "Casque Bluetooth Pro",
    prix: 49_900,
    prix_reference: 59_900,
    remise_pct: 15,
    statut_stock: "rupture",
    quantite_stock: 0,
    inventaire: {
      produit_id: 1,
      quantite_stock: 0,
      statut_stock: "rupture",
      modifie_le: null,
      disponibilite_forcee: null,
    },
    marque: "Anker",
    categorie_principale_id: PRINCIPAL_CATEGORY.id,
    url_source: "https://example.com/source",
    caracteristiques: ["Bluetooth 5.0", "Autonomie 30h"],
    description: "Casque sans fil avec reduction de bruit active.",
    fiche_technique: "Fiche detaillee du casque.\nAutonomie 30h, Bluetooth 5.0.",
    images,
    categories: [PRINCIPAL_CATEGORY, SECONDARY_CATEGORY],
    ...overrides,
  })
}

function seedTaxonomie() {
  useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], TAXONOMIE_FIXTURE)
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

function mount(product: ProductDetail | null) {
  if (product) stubInventory(product.id)
  return mountSuspended(ProductsDetailForm, { props: { product } })
}

describe("products detail form", () => {
  afterEach(() => {
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
  })

  it("renders the overview inputs empty in add mode", async () => {
    seedTaxonomie()

    const wrapper = await mount(null)
    await flushPromises()

    expect(wrapper.get("[data-testid='products-detail-overview-title']").element).toHaveProperty("value", "")
    expect(wrapper.find("[data-testid='products-detail-overview-source-url-input']").exists()).toBe(false)
    expect(wrapper.get("[data-testid='products-detail-overview-price-input']").element).toHaveProperty("value", "")
    expect(wrapper.get("[data-testid='products-detail-overview-reference-price-input']").element).toHaveProperty(
      "value",
      "",
    )
    expect(wrapper.get("[data-testid='products-detail-overview-discount-input']").element).toHaveProperty("value", "")
    expect(wrapper.get("[data-testid='products-detail-overview-brand-input']").text()).toBe("Choose a brand")
    expect(wrapper.get("[data-testid='products-detail-overview-description-input']").element).toHaveProperty(
      "value",
      "",
    )
    expect(wrapper.get("[data-testid='products-detail-overview-description-counter']").text()).toBe("0/500")

    expect(wrapper.get("[data-testid='products-detail-overview-long-description-input']").element).toHaveProperty(
      "value",
      "",
    )
    expect(wrapper.get("[data-testid='products-detail-overview-long-description-counter']").text()).toBe("0/20000")
    expect(wrapper.get("[data-testid='products-detail-overview-initial-stock-input']").element).toHaveProperty(
      "value",
      "",
    )

    expect(wrapper.findAll("[data-testid='products-image-gallery-thumbnail']")).toHaveLength(0)
    expect(wrapper.get("[data-testid='products-image-gallery-hero']").find("img").exists()).toBe(false)

    const storeCard = wrapper.get("[data-testid='products-detail-overview-store-card']")
    expect(storeCard.find("[data-testid='products-detail-form-slug']").exists()).toBe(true)
    expect(wrapper.get("[data-testid='products-detail-form-slug']").element).toHaveProperty("value", "")

    wrapper.unmount()
  })

  it("offers the taxonomy's known brands as choices for the brand field", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    const wrapper = await mountSuspended(ProductsDetailForm, { props: { product: null }, attachTo: document.body })
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-brand-input']").trigger("click")
    await flushPromises()

    const optionLabels = Array.from(document.body.querySelectorAll("[data-slot='command-item']")).map(element =>
      element.textContent?.trim(),
    )
    // Each option leads with the brand logo, whose fallback renders the initials ("AN") before the name.
    expect(optionLabels.some(label => label?.endsWith("Anker"))).toBe(true)

    wrapper.unmount()
  })

  it("renders the overview inputs populated with the product's values in edit mode", async () => {
    seedTaxonomie()
    const product = makePopulatedProduct()

    const wrapper = await mount(product)
    await flushPromises()

    expect(wrapper.get("[data-testid='products-detail-overview-title']").element).toHaveProperty("value", product.nom)
    expect(wrapper.find("[data-testid='products-detail-overview-source-url-input']").exists()).toBe(false)
    expect(wrapper.get("[data-testid='products-detail-overview-price-input']").element).toHaveProperty(
      "value",
      "49 900",
    )
    expect(wrapper.get("[data-testid='products-detail-overview-reference-price-input']").element).toHaveProperty(
      "value",
      "59 900",
    )
    expect(wrapper.get("[data-testid='products-detail-overview-discount-input']").element).toHaveProperty(
      "value",
      String(product.remise_pct),
    )
    expect(wrapper.get("[data-testid='products-detail-overview-brand-input']").text()).toBe(product.marque)
    expect(wrapper.get("[data-testid='products-detail-overview-description-input']").element).toHaveProperty(
      "value",
      product.description,
    )
    expect(wrapper.get("[data-testid='products-detail-overview-description-counter']").text()).toBe(
      `${product.description!.length}/500`,
    )

    expect(wrapper.find("[data-testid='products-detail-overview-initial-stock-input']").exists()).toBe(false)
    expect(wrapper.get("[data-testid='products-detail-overview-long-description-input']").element).toHaveProperty(
      "value",
      product.fiche_technique,
    )
    expect(wrapper.get("[data-testid='products-detail-overview-long-description-counter']").text()).toBe(
      `${product.fiche_technique!.length}/20000`,
    )

    const secondaryBadges = wrapper.findAll("[data-testid='products-detail-overview-secondary-category']")
    expect(secondaryBadges.some(badge => badge.text().includes(SECONDARY_CATEGORY.nom))).toBe(true)
    expect(secondaryBadges.some(badge => badge.text().includes(PRINCIPAL_CATEGORY.nom))).toBe(false)

    product.caracteristiques.forEach((feature, index) => {
      expect(wrapper.get(`[aria-label='Feature ${index + 1}']`).element).toHaveProperty("value", feature)
    })

    const thumbnails = wrapper.findAll("[data-testid='products-image-gallery-thumbnail']")
    expect(thumbnails).toHaveLength(product.images.length)

    const hero = wrapper.get("[data-testid='products-image-gallery-hero']")
    expect(hero.find("img").attributes("src")).toBe(product.images[0]!.url)

    expect(wrapper.find("[data-testid='products-detail-form-slug']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("hides Cancel and disables Save until an edit is made", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()

    const wrapper = await mount(product)
    await flushPromises()

    expect(wrapper.find("[data-testid='products-detail-form-save']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='products-detail-form-cancel']").exists()).toBe(false)

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Produit modifie")

    expect(wrapper.get("[data-testid='products-detail-form-save']").attributes("disabled")).toBeUndefined()
    const cancelButton = wrapper.get("[data-testid='products-detail-form-cancel']")
    expect(cancelButton.attributes("disabled")).toBeUndefined()

    wrapper.unmount()
  })

  it("does not treat the department selector as a product edit", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-sizes']").find("button").trigger("click")
    await flushPromises()
    const activeOption = [...document.body.querySelectorAll<HTMLElement>("[role='option']")].find(option =>
      option.querySelector("[data-icon], svg, .iconify"),
    )
    activeOption?.click()
    await flushPromises()

    expect(wrapper.find("[data-testid='products-detail-form-save']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='products-detail-form-cancel']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("resets edited values to the loaded product when Cancel is clicked, then hides Cancel again", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Produit modifie")
    await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue("12000")
    await wrapper.get("[data-testid='products-detail-form-cancel']").trigger("click")

    expect(wrapper.get("[data-testid='products-detail-overview-title']").element).toHaveProperty("value", product.nom)
    expect(wrapper.get("[data-testid='products-detail-overview-price-input']").element).toHaveProperty(
      "value",
      "49 900",
    )
    expect(wrapper.find("[data-testid='products-detail-form-save']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='products-detail-form-cancel']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("auto-generates the slug from the product name while typing, in add mode", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    const wrapper = await mount(null)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Casque Bluetooth Pro")
    expect(wrapper.get("[data-testid='products-detail-form-slug']").element).toHaveProperty(
      "value",
      "casque-bluetooth-pro",
    )

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Casque Bluetooth Pro 2")
    expect(wrapper.get("[data-testid='products-detail-form-slug']").element).toHaveProperty(
      "value",
      "casque-bluetooth-pro-2",
    )

    wrapper.unmount()
  })

  it("stops auto-generating the slug once the user edits it directly", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    const wrapper = await mount(null)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Casque Bluetooth Pro")
    await wrapper.get("[data-testid='products-detail-form-slug']").setValue("mon-slug-perso")

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Nom totalement different")
    expect(wrapper.get("[data-testid='products-detail-form-slug']").element).toHaveProperty("value", "mon-slug-perso")

    wrapper.unmount()
  })

  it("keeps add actions hidden for the empty form until a value is entered", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    const wrapper = await mount(null)
    await flushPromises()

    expect(wrapper.find("[data-testid='products-detail-form-save']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='products-detail-form-cancel']").exists()).toBe(false)

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Nouveau produit")

    expect(wrapper.get("[data-testid='products-detail-form-save']").attributes("disabled")).toBeUndefined()
    const cancelButton = wrapper.get("[data-testid='products-detail-form-cancel']")
    expect(cancelButton.attributes("disabled")).toBeUndefined()

    wrapper.unmount()
  })

  it("calls the create mutation when submitting a new product", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    let createCalls = 0
    let updateCalls = 0
    const cleanupCreate = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "POST",
      handler: () => {
        createCalls += 1
        return makeProductDetail({ nom: "Nouveau produit", prix: 1000 })
      },
    })
    const cleanupUpdate = registerEndpoint("/api/v1/catalogue/administration/produits/999999", {
      method: "PATCH",
      handler: () => {
        updateCalls += 1
        return makeProductDetail()
      },
    })

    const wrapper = await mount(null)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Nouveau produit")
    await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue(1000)
    expect(wrapper.find("[data-testid='products-detail-form-save']").exists()).toBe(true)
    await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
    await flushPromises()

    expect(createCalls).toBe(1)
    expect(updateCalls).toBe(0)

    cleanupCreate()
    cleanupUpdate()
    wrapper.unmount()
  })

  it("calls the update mutation and round-trips the full current image array when submitting in edit mode", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()

    let createCalls = 0
    let updateCalls = 0
    let capturedBody: { images?: Array<{ url: string }> } | undefined
    const cleanupCreate = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "POST",
      handler: () => {
        createCalls += 1
        return product
      },
    })
    const cleanupUpdate = registerEndpoint(`/api/v1/catalogue/administration/produits/${product.id}`, {
      method: "PATCH",
      handler: async event => {
        updateCalls += 1
        capturedBody = await readBody(event)
        return product
      },
    })

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Casque Bluetooth Pro modifie")
    await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
    await flushPromises()

    expect(updateCalls).toBe(1)
    expect(createCalls).toBe(0)
    expect(capturedBody?.images).toHaveLength(product.images.length)
    product.images.forEach((image, index) => {
      expect(capturedBody?.images?.[index]?.url).toBe(image.url)
    })

    cleanupCreate()
    cleanupUpdate()
    wrapper.unmount()
  })

  it("trims the description on submit, and sends null when it's cleared", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()

    let capturedBody: { description?: string | null } | undefined
    const cleanupUpdate = registerEndpoint(`/api/v1/catalogue/administration/produits/${product.id}`, {
      method: "PATCH",
      handler: async event => {
        capturedBody = await readBody(event)
        return product
      },
    })

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-description-input']").setValue("  Resume avec espaces.  ")
    await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
    await flushPromises()

    expect(capturedBody?.description).toBe("Resume avec espaces.")

    await wrapper.get("[data-testid='products-detail-overview-description-input']").setValue("")
    await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
    await flushPromises()

    expect(capturedBody?.description).toBeNull()

    cleanupUpdate()
    wrapper.unmount()
  })

  it("updates the description counter as the operator types", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    const wrapper = await mount(null)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-description-input']").setValue("Bonjour")

    expect(wrapper.get("[data-testid='products-detail-overview-description-counter']").text()).toBe("7/500")

    wrapper.unmount()
  })

  it("disables every control and hides Save when the session lacks the direction role", async () => {
    seedTaxonomie()
    seedSession(["comptoir"])
    const product = makePopulatedProduct()

    const wrapper = await mount(product)
    await flushPromises()

    expect(wrapper.find("[data-testid='products-detail-form-save']").exists()).toBe(false)

    const disableableTestIds = [
      "products-detail-overview-title",
      "products-detail-overview-price-input",
      "products-detail-overview-description-input",
      "products-detail-overview-long-description-input",
      "products-image-gallery-add-tile",
      "products-detail-overview-secondary-category-add",
    ]
    disableableTestIds.forEach(testId => {
      expect(wrapper.get(`[data-testid='${testId}']`).attributes("disabled")).toBeDefined()
    })

    wrapper.unmount()
  })

  it("recalculates the DISCOUNT when the reference price changes, and leaves the selling price alone", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    const wrapper = await mount(product)
    await flushPromises()

    const prixAvant = (wrapper.get("[data-testid='products-detail-overview-price-input']").element as HTMLInputElement)
      .value

    await wrapper.get("[data-testid='products-detail-overview-reference-price-input']").setValue("100000")
    await flushPromises()

    /* LE PRIX DE VENTE NE BOUGE PAS, et c'est l'inverse de ce que ce test
       exigeait. Il gardait la remise fixe et recalculait le prix : un
       opérateur qui corrigeait le prix barré changeait sans le vouloir ce que
       le client paie. Le prix de vente est une décision, la remise en est la
       conséquence — et c'est exactement ce que le backend écrira, puisqu'il
       recalcule la remise depuis les deux prix et écrase celle qu'on envoie. */
    expect(wrapper.get("[data-testid='products-detail-overview-price-input']").element).toHaveProperty(
      "value",
      prixAvant,
    )

    // 49 900 vendu sur 100 000 barré : 50 % de remise.
    expect(wrapper.get("[data-testid='products-detail-overview-discount-input']").element).toHaveProperty("value", "50")

    wrapper.unmount()
  })

  /* PRODUCT CREATION NEVER REACHED THE BACKEND. `Number("45 000")` is NaN, so a
     price typed the French way failed validation, and the failure switched to
     an "edit" tab this template no longer renders: an empty panel, no request,
     no error. These pin both halves of the fix. */
  for (const typed of ["45 000", "45\u00A0000", "45\u202F000", "45000 FCFA"]) {
    it(`creates the product when the price is typed as "${typed}"`, async () => {
      seedTaxonomie()
      seedSession(["direction"])
      let body: Record<string, unknown> | null = null
      registerEndpoint("/api/v1/catalogue/administration/produits", {
        method: "POST",
        handler: async event => {
          body = await readBody(event)
          return makeProductDetail({ nom: "Casque de test", prix: 45_000 })
        },
      })
      const wrapper = await mount(null)
      await flushPromises()

      await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Casque de test")
      await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue(typed)
      await wrapper.get("form[data-testid='products-detail-form']").trigger("submit")
      await flushPromises()

      expect(body).not.toBeNull()
      expect(body!.prix).toBe(45_000)
      wrapper.unmount()
    })
  }

  it("says what to fix instead of hiding the form when validation fails", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    let calls = 0
    registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "POST",
      handler: () => {
        calls++
        return makeProductDetail()
      },
    })
    const wrapper = await mount(null)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Casque de test")
    // A decimal comma is a genuinely wrong FCFA amount: it must be reported, not guessed at.
    await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue("45,5")
    await wrapper.get("form[data-testid='products-detail-form']").trigger("submit")
    await flushPromises()

    expect(calls).toBe(0)
    expect(wrapper.text()).toMatch(/Prix|Price/)
    expect(wrapper.text()).toMatch(/pas été enregistré|was not saved/)
    // The overview inputs are still mounted and shown, not swapped for an empty tab.
    expect(wrapper.find("[data-testid='products-detail-overview-price-input']").exists()).toBe(true)
    wrapper.unmount()
  })

  it("recalculates the DISCOUNT when the selling price changes", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue("29950")
    await flushPromises()

    // Half of the 59 900 reference, so the third field has to read 50.
    expect(wrapper.get("[data-testid='products-detail-overview-discount-input']").element).toHaveProperty("value", "50")
    expect(wrapper.get("[data-testid='products-detail-overview-reference-price-input']").element).toHaveProperty(
      "value",
      "59 900",
    )

    wrapper.unmount()
  })

  it("clears the discount when the selling price leaves nothing to compute it from", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    const wrapper = await mount(product)
    await flushPromises()

    /* Emptying the price used to leave the 15 % from the fixture on screen,
       under two fields that no longer describe a promotion. The three fields
       exist to agree with each other; a stale one is the defect this form is
       meant to prevent. */
    await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue("")
    await flushPromises()

    expect(wrapper.get("[data-testid='products-detail-overview-discount-input']").element).toHaveProperty("value", "")

    wrapper.unmount()
  })

  it("recalculates the displayed price when the discount changes", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get("[data-testid='products-detail-overview-discount-input']").setValue("20")
    await flushPromises()

    // prix_reference stays at the product's 59900, so 59900 * (1 - 20/100) = 47920
    expect(wrapper.get("[data-testid='products-detail-overview-price-input']").element).toHaveProperty(
      "value",
      "47 920",
    )

    wrapper.unmount()
  })

  it("shows the purchase cost history only under the History tab", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubInventory(product.id)
    const cleanup = registerEndpoint(`/api/v1/catalogue/administration/produits/${product.id}/couts`, {
      method: "GET",
      handler: () => [],
    })
    const wrapper = await mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
    await flushPromises()

    const costs = wrapper.get("[data-testid='product-cost-history']")
    expect(costs.isVisible()).toBe(false)

    const historyTab = wrapper.findAll("button").find(button => button.text().startsWith("History"))
    await historyTab!.trigger("click")
    expect(costs.isVisible()).toBe(true)

    cleanup()
    wrapper.unmount()
  })

  it("keeps the purchase cost history away from sessions without the direction role", async () => {
    seedTaxonomie()
    seedSession(["comptoir"])
    const wrapper = await mount(makePopulatedProduct())
    await flushPromises()

    expect(wrapper.find("[data-testid='product-cost-history']").exists()).toBe(false)

    wrapper.unmount()
  })

  describe("long description", () => {
    const LONG = "[data-testid='products-detail-overview-long-description-input']"
    const SHORT = "[data-testid='products-detail-overview-description-input']"
    const COUNTER = "[data-testid='products-detail-overview-long-description-counter']"

    function capturePatch(product: ProductDetail) {
      const seen: { bodies: Array<Record<string, unknown>> } = { bodies: [] }
      stubEndpoint(`/api/v1/catalogue/administration/produits/${product.id}`, "PATCH", async event => {
        seen.bodies.push(await readBody(event))
        return product
      })
      return seen
    }

    async function submit(wrapper: Awaited<ReturnType<typeof mount>>) {
      await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
      await settle()
    }

    it("counts the characters typed against the 20000 limit", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const wrapper = await mount(null)
      await flushPromises()

      await wrapper.get(LONG).setValue("Bonjour")

      expect(wrapper.get(COUNTER).text()).toBe("7/20000")
      wrapper.unmount()
    })

    it("trims the long description on save", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const product = makePopulatedProduct()
      const seen = capturePatch(product)
      const wrapper = await mount(product)
      await flushPromises()

      await wrapper.get(LONG).setValue("  Nouvelle fiche.  ")
      await submit(wrapper)

      expect(seen.bodies[0]?.fiche_technique).toBe("Nouvelle fiche.")
      wrapper.unmount()
    })

    it.each(["", "   "])("sends null when the long description is cleared to %j", async blank => {
      seedTaxonomie()
      seedSession(["direction"])
      const product = makePopulatedProduct()
      const seen = capturePatch(product)
      const wrapper = await mount(product)
      await flushPromises()

      await wrapper.get(LONG).setValue(blank)
      await submit(wrapper)

      expect(seen.bodies[0]?.fiche_technique).toBeNull()
      wrapper.unmount()
    })

    it("saves the long description without changing the short one", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const product = makePopulatedProduct()
      const seen = capturePatch(product)
      const wrapper = await mount(product)
      await flushPromises()

      await wrapper.get(LONG).setValue("Fiche revue.")
      await submit(wrapper)

      expect(seen.bodies[0]?.description).toBe(product.description)
      expect(seen.bodies[0]?.fiche_technique).toBe("Fiche revue.")
      wrapper.unmount()
    })

    it("saves the short description without changing the long one", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const product = makePopulatedProduct()
      const seen = capturePatch(product)
      const wrapper = await mount(product)
      await flushPromises()

      await wrapper.get(SHORT).setValue("Resume revu.")
      await submit(wrapper)

      expect(seen.bodies[0]?.description).toBe("Resume revu.")
      expect(seen.bodies[0]?.fiche_technique).toBe(product.fiche_technique)
      wrapper.unmount()
    })

    it("accepts exactly 20000 characters", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const product = makePopulatedProduct()
      const seen = capturePatch(product)
      const wrapper = await mount(product)
      await flushPromises()

      await wrapper.get(LONG).setValue("f".repeat(20_000))
      await submit(wrapper)

      expect(seen.bodies).toHaveLength(1)
      wrapper.unmount()
    })

    it("blocks the save with the invalid summary and sends nothing at 20001 characters", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const product = makePopulatedProduct()
      const seen = capturePatch(product)
      const wrapper = await mount(product)
      await flushPromises()

      await wrapper.get(LONG).setValue("f".repeat(20_001))
      await submit(wrapper)

      expect(seen.bodies).toEqual([])
      expect(wrapper.text()).toMatch(/pas été enregistré|was not saved/)
      wrapper.unmount()
    })
  })

  describe("stock fields", () => {
    const INITIAL = "[data-testid='products-detail-overview-initial-stock-input']"

    function captureCreate() {
      const seen: { bodies: Array<Record<string, unknown>> } = { bodies: [] }
      stubEndpoint("/api/v1/catalogue/administration/produits", "POST", async event => {
        seen.bodies.push(await readBody(event))
        return makeProductDetail({ nom: "Nouveau produit", prix: 1000 })
      })
      return seen
    }

    async function fillAndSubmitNew(wrapper: Awaited<ReturnType<typeof mount>>) {
      await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Nouveau produit")
      await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue("1000")
      await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
      await settle()
    }

    it("creates an uncounted product, in stock, when the operator leaves the quantity empty", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const seen = captureCreate()
      const wrapper = await mount(null)
      await flushPromises()

      await fillAndSubmitNew(wrapper)

      expect(seen.bodies[0]).not.toHaveProperty("quantite_stock_initiale")
      expect(seen.bodies[0]).not.toHaveProperty("disponibilite_forcee")
      wrapper.unmount()
    })

    it("still counts the product at zero when the operator types a zero", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const seen = captureCreate()
      const wrapper = await mount(null)
      await flushPromises()

      await wrapper.get(INITIAL).setValue("0")
      await fillAndSubmitNew(wrapper)

      expect(seen.bodies[0]).toHaveProperty("quantite_stock_initiale", 0)
      wrapper.unmount()
    })

    it("creates the product out of stock without counting it when that status is chosen", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const seen = captureCreate()
      const wrapper = await mount(null)
      await flushPromises()

      await wrapper.get("[data-testid='products-detail-overview-initial-availability']").setValue("rupture")
      await fillAndSubmitNew(wrapper)

      expect(seen.bodies[0]).toHaveProperty("disponibilite_forcee", "rupture")
      expect(seen.bodies[0]).not.toHaveProperty("quantite_stock_initiale")
      wrapper.unmount()
    })

    it("creates a product with the initial stock the operator typed, as an integer", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const seen = captureCreate()
      const wrapper = await mount(null)
      await flushPromises()

      await wrapper.get(INITIAL).setValue("25")
      await fillAndSubmitNew(wrapper)

      expect(seen.bodies[0]).toHaveProperty("quantite_stock_initiale", 25)
      expect(seen.bodies[0]).not.toHaveProperty("en_stock")
      wrapper.unmount()
    })

    it.each(["-3", "2.5"])(
      "sends nothing and shows the not-saved message when the initial stock is %s",
      async typed => {
        seedTaxonomie()
        seedSession(["direction"])
        const seen = captureCreate()
        const wrapper = await mount(null)
        await flushPromises()

        await wrapper.get(INITIAL).setValue(typed)
        await fillAndSubmitNew(wrapper)

        expect(seen.bodies).toEqual([])
        expect(wrapper.text()).toMatch(/pas été enregistré|was not saved/)
        wrapper.unmount()
      },
    )

    it("never sends a stock field when updating a saved product", async () => {
      seedTaxonomie()
      seedSession(["direction"])
      const product = makePopulatedProduct()
      const bodies: Array<Record<string, unknown>> = []
      stubEndpoint(`/api/v1/catalogue/administration/produits/${product.id}`, "PATCH", async event => {
        bodies.push(await readBody(event))
        return product
      })
      const wrapper = await mount(product)
      await flushPromises()

      await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Produit renomme")
      await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
      await settle()

      expect(bodies).toHaveLength(1)
      const keys = Object.keys(bodies[0]!)
      expect(keys).not.toContain("en_stock")
      expect(keys).not.toContain("quantite_stock_initiale")
      expect(keys.filter(key => key.includes("stock"))).toEqual([])
      wrapper.unmount()
    })
  })

  describe("delivery interval", () => {
    const PRODUCT_PATH = "/api/v1/catalogue/administration/produits"

    afterEach(clearEndpoints)

    function serveDeliveryOptions() {
      seedTaxonomie()
      stubEndpoint(DELIVERY_PATH, "GET", () => deliveryOptions())
    }

    async function mountWithPicker(product: ProductDetail | null) {
      if (product) stubInventory(product.id)
      const wrapper = await mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
      await settle()
      return wrapper
    }

    async function pickOption(wrapper: Awaited<ReturnType<typeof mountWithPicker>>, id: number) {
      await wrapper.get("[data-testid='product-delivery-trigger']").trigger("click")
      await settle()
      await inBody(`product-delivery-option-${id}`).trigger("click")
      await settle()
    }

    function capturePatch(product: ProductDetail) {
      const seen: { body?: Record<string, unknown> } = {}
      stubEndpoint(`${PRODUCT_PATH}/${product.id}`, "PATCH", async event => {
        seen.body = await readBody(event)
        return product
      })
      return seen
    }

    it("shows the inherited default option and stays pristine", async () => {
      serveDeliveryOptions()
      seedSession(["direction"])
      const product = makePopulatedProduct({ delai_livraison_id: null, delai_livraison: DEFAULT_OPTION })
      const wrapper = await mountWithPicker(product)

      const trigger = wrapper.get("[data-testid='product-delivery-trigger']")
      expect(trigger.text()).toContain("72")
      expect(wrapper.find("[data-testid='products-detail-form-save']").exists()).toBe(false)
      expect(wrapper.find("[data-testid='products-detail-form-cancel']").exists()).toBe(false)

      wrapper.unmount()
    })

    it("makes the form dirty and sends the option's id when another option is picked", async () => {
      serveDeliveryOptions()
      seedSession(["direction"])
      const product = makePopulatedProduct({ delai_livraison_id: null, delai_livraison: DEFAULT_OPTION })
      const seen = capturePatch(product)
      const wrapper = await mountWithPicker(product)

      await pickOption(wrapper, 2)

      expect(wrapper.get("[data-testid='products-detail-form-save']").attributes("disabled")).toBeUndefined()
      await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
      await vi.waitFor(() => expect(seen.body).toBeDefined())
      expect(seen.body).toHaveProperty("delai_livraison_id", 2)

      wrapper.unmount()
    })

    it("sends null when the default is picked back from an explicit option", async () => {
      serveDeliveryOptions()
      seedSession(["direction"])
      const product = makePopulatedProduct({ delai_livraison_id: 2, delai_livraison: WORKING_DAYS_OPTION })
      const seen = capturePatch(product)
      const wrapper = await mountWithPicker(product)

      await pickOption(wrapper, 1)

      expect(wrapper.get("[data-testid='products-detail-form-save']").attributes("disabled")).toBeUndefined()
      await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
      await vi.waitFor(() => expect(seen.body).toBeDefined())
      expect(seen.body).toHaveProperty("delai_livraison_id", null)

      wrapper.unmount()
    })

    it("creates a product with delai_livraison_id null unless an option was picked", async () => {
      serveDeliveryOptions()
      seedSession(["direction"])
      const bodies: Array<Record<string, unknown>> = []
      stubEndpoint(PRODUCT_PATH, "POST", async event => {
        bodies.push(await readBody(event))
        return makeProductDetail({ nom: "Nouveau produit", prix: 1000 })
      })
      const wrapper = await mountWithPicker(null)

      await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Nouveau produit")
      await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue("1000")
      await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
      await vi.waitFor(() => expect(bodies).toHaveLength(1))
      expect(bodies[0]).toHaveProperty("delai_livraison_id", null)

      await pickOption(wrapper, 2)
      await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
      await vi.waitFor(() => expect(bodies).toHaveLength(2))
      expect(bodies[1]).toHaveProperty("delai_livraison_id", 2)

      wrapper.unmount()
    })

    it("leaves the picker disabled for a session without the direction role", async () => {
      serveDeliveryOptions()
      seedSession(["comptoir"])
      const wrapper = await mountWithPicker(
        makePopulatedProduct({ delai_livraison_id: null, delai_livraison: DEFAULT_OPTION }),
      )

      expect(wrapper.get("[data-testid='product-delivery-trigger']").attributes("disabled")).toBeDefined()

      wrapper.unmount()
    })
  })
})
