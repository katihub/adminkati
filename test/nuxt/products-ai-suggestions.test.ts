import type { ProductCopySuggestionResponse } from "@/types/ai/product-copy"
import type { ProductCategory, ProductDetail, ProductImage, Taxonomie } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError, readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import ProductsDetailForm from "@/components/products/DetailForm.vue"
import { useAiGenerationStore } from "@/stores/ai-generation"
import { slugify } from "@/utils/slug"
import { clearEndpoints, settle, stubEndpoint } from "./delivery-fixture"
import { stubInventory } from "./inventory-fixture"

const AI_PATH = "/api/ai/products/suggestions"
const PRODUCT_PATH = "/api/v1/catalogue/administration/produits"

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

const SUCCESS_RESPONSE: ProductCopySuggestionResponse = {
  suggestion: {
    name: "Casque Bluetooth Pro X",
    shortDescription: "Casque sans fil clair et confortable.",
    longDescription: "Description longue revue pour la fiche produit.",
    features: ["Bluetooth 5.3", "Autonomie 40h", "Reduction de bruit active"],
  },
  assets: {
    imageProfile: "all-auto",
    candidateImageCount: 2,
    imageCount: 2,
    imageFallback: false,
    datasheetUsed: false,
    warnings: [],
  },
  requestId: "req-1",
}

let idCounter = 0

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
    rayon: "informatique",
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

function mountAttached(product: ProductDetail | null) {
  if (product) stubInventory(product.id)
  return mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
}

/** Opens the brand combobox (portalled to <body>) and clicks the option carrying this label. */
async function selectBrand(
  wrapper: { get: (selector: string) => { trigger: (event: string) => Promise<void> } },
  brandName: string,
) {
  await wrapper.get("[data-testid='products-detail-overview-brand-input']").trigger("click")
  await flushPromises()
  // The option's leading-logo fallback (initials, e.g. "AN") shares a text node with the label and
  // leaves no whitespace between them ("ANAnker"), so an exact match on the trimmed text never hits.
  const option = Array.from(document.body.querySelectorAll("[data-slot='command-item']")).find(element =>
    element.textContent?.includes(brandName),
  )
  expect(option, `brand option "${brandName}"`).toBeDefined()
  ;(option as HTMLElement).click()
  await flushPromises()
}

function stubSaveEndpoints(productId?: number) {
  const calls = { create: 0, update: 0 }
  stubEndpoint(PRODUCT_PATH, "POST", () => {
    calls.create += 1
    return makeProductDetail()
  })
  if (productId !== undefined) {
    stubEndpoint(`${PRODUCT_PATH}/${productId}`, "PATCH", () => {
      calls.update += 1
      return makeProductDetail({ id: productId })
    })
  }
  return calls
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

function captureAiRequests() {
  const bodies: Array<Record<string, unknown>> = []
  stubEndpoint(AI_PATH, "POST", async event => {
    bodies.push(await readBody(event))
    return SUCCESS_RESPONSE
  })
  return bodies
}

const TITLE_INPUT = "[data-testid='products-detail-overview-title']"
const SHORT_INPUT = "[data-testid='products-detail-overview-description-input']"
const LONG_INPUT = "[data-testid='products-detail-overview-long-description-input']"
const SLUG_INPUT = "[data-testid='products-detail-form-slug']"
const GENERATE = "[data-testid='product-copy-generate']"

function featureValue(wrapper: { get: (selector: string) => { element: HTMLInputElement } }, index: number) {
  return wrapper.get(`[aria-label='Feature ${index}']`).element.value
}

describe("product copy AI suggestions in the product editor", () => {
  afterEach(() => {
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    // The store exposes no public `reset`; `release` only resets when the given target still
    // matches the store's own, so passing its current target back is the only external way in.
    const store = useAiGenerationStore()
    if (store.target) store.release(store.target)
    store.clearHistory()
    store.setPanelOpen(false)
    store.setPreferredLanguage("fr")
    store.setPreferredFields(["name", "shortDescription", "longDescription", "features"])
    store.setPreferredImageProfile("all-auto")
  })

  it("shows no text on the generate control and still names it for assistive technology", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const wrapper = await mount(makePopulatedProduct())
    await flushPromises()

    const generate = wrapper.get(GENERATE)
    expect(generate.text()).toBe("")
    expect(generate.attributes("aria-label")).toBe("Generate product copy")

    wrapper.unmount()
  })

  it("hides every AI control from a non-direction user, even on a fully populated product", async () => {
    seedTaxonomie()
    seedSession(["comptoir"])
    const wrapper = await mount(makePopulatedProduct())
    await flushPromises()

    expect(wrapper.find(GENERATE).exists()).toBe(false)

    wrapper.unmount()
  })

  it("posts the exact fr draft built from the product's current values, with no url, image or PDF data", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct({ fiche_pdf: "produits/42/fiche.pdf" })
    stubSaveEndpoints(product.id)
    const bodies = captureAiRequests()

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get(GENERATE).trigger("click")
    await settle()

    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toStrictEqual({
      language: "fr",
      productId: product.id,
      fields: ["name", "shortDescription", "longDescription", "features"],
      imageProfile: "all-auto",
      draft: {
        name: "Casque Bluetooth Pro",
        brand: "Anker",
        department: "Informatique",
        primaryCategory: "Casques",
        secondaryCategories: ["Chargeurs"],
        price: 49_900,
        existingShortDescription: "Casque sans fil avec reduction de bruit active.",
        existingLongDescription: "Fiche detaillee du casque.\nAutonomie 30h, Bluetooth 5.0.",
        existingFeatures: ["Bluetooth 5.0", "Autonomie 30h"],
      },
    })

    wrapper.unmount()
  })

  it("posts the language chosen in the NowTech AI settings", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    const bodies = captureAiRequests()

    const wrapper = await mount(product)
    await flushPromises()

    useAiGenerationStore().setPreferredLanguage("en")

    await wrapper.get(GENERATE).trigger("click")
    await settle()

    expect(bodies).toHaveLength(1)
    expect(bodies[0]?.language).toBe("en")

    wrapper.unmount()
  })

  it("posts the selected field scope and image profile, then shows only matching cards", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const bodies: Array<Record<string, unknown>> = []
    stubEndpoint(AI_PATH, "POST", async event => {
      bodies.push(await readBody(event))
      return {
        suggestion: { shortDescription: SUCCESS_RESPONSE.suggestion.shortDescription },
        assets: { ...SUCCESS_RESPONSE.assets, imageProfile: "primary-auto", imageCount: 1 },
        requestId: "req-short",
      }
    })
    const store = useAiGenerationStore()
    store.setPreferredFields(["shortDescription"])
    store.setPreferredImageProfile("primary-auto")

    const wrapper = await mountAttached(makePopulatedProduct())
    await flushPromises()
    await wrapper.get(GENERATE).trigger("click")
    await settle()

    expect(bodies[0]).toMatchObject({ fields: ["shortDescription"], imageProfile: "primary-auto" })
    expect(wrapper.find("[data-testid='product-copy-card-shortDescription']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='product-copy-card-longDescription']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='product-copy-card-features']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("restores an exact matching result without a second request, while a fresh alternative always requests again", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const bodies = captureAiRequests()
    const wrapper = await mountAttached(makePopulatedProduct())
    await flushPromises()

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get(GENERATE).trigger("click")
    await settle()

    expect(bodies).toHaveLength(1)
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(true)

    await wrapper.get("[data-testid='product-copy-menu']").trigger("click")
    await flushPromises()
    ;(document.body.querySelector("[data-testid='product-copy-fresh-alternative']") as HTMLButtonElement).click()
    await settle()

    expect(bodies).toHaveLength(2)
    wrapper.unmount()
  })

  it("omits productId and sends the exact structured draft for an unsaved product", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const bodies = captureAiRequests()

    const wrapper = await mountAttached(null)
    await flushPromises()

    await wrapper.get(TITLE_INPUT).setValue("Casque de test")
    await selectBrand(wrapper, "Anker")
    await wrapper.get(SHORT_INPUT).setValue("Casque sans fil pour le travail quotidien.")

    await wrapper.get(GENERATE).trigger("click")
    await settle()

    expect(bodies).toHaveLength(1)
    expect(bodies[0]).not.toHaveProperty("productId")
    expect(bodies[0]).toStrictEqual({
      language: "fr",
      fields: ["name", "shortDescription", "longDescription", "features"],
      imageProfile: "all-auto",
      draft: {
        name: "Casque de test",
        brand: "Anker",
        department: null,
        primaryCategory: null,
        secondaryCategories: [],
        price: null,
        existingShortDescription: "Casque sans fil pour le travail quotidien.",
        existingLongDescription: "",
        existingFeatures: [],
      },
    })

    wrapper.unmount()
  })

  it("keeps Generate disabled without structured descriptive facts, then enables it once a source description is added", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    const wrapper = await mountAttached(null)
    await flushPromises()

    expect(wrapper.get(GENERATE).attributes("disabled")).toBeDefined()

    await wrapper.get(TITLE_INPUT).setValue("Casque")
    await flushPromises()
    expect(wrapper.get(GENERATE).attributes("disabled")).toBeDefined()

    await selectBrand(wrapper, "Anker")
    expect(wrapper.get(GENERATE).attributes("disabled")).toBeDefined()

    await wrapper.get(SHORT_INPUT).setValue("Casque sans fil pour le travail quotidien.")

    expect(wrapper.get(GENERATE).attributes("disabled")).toBeUndefined()

    wrapper.unmount()
  })

  it("keeps the generate button disabled and sends only one request while a generation is in flight", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    let calls = 0
    const { promise, resolve } = deferred<ProductCopySuggestionResponse>()
    stubEndpoint(AI_PATH, "POST", () => {
      calls += 1
      return promise
    })

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get(GENERATE).trigger("click")
    await flushPromises()

    expect(useAiGenerationStore().status).toBe("loading")
    expect(wrapper.get(GENERATE).attributes("disabled")).toBeDefined()

    await wrapper.get(GENERATE).trigger("click")
    await flushPromises()
    expect(calls).toBe(1)

    resolve(SUCCESS_RESPONSE)
    await flushPromises()
    wrapper.unmount()
  })

  it("shows one review card per suggested field on success, changes nothing in the form, and never calls a save endpoint", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    const saveCalls = stubSaveEndpoints(product.id)
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()
    const nameBefore = wrapper.get(TITLE_INPUT).element as HTMLInputElement
    const nameValueBefore = nameBefore.value

    await wrapper.get(GENERATE).trigger("click")
    await settle()

    for (const field of ["name", "shortDescription", "longDescription", "features"]) {
      expect(wrapper.find(`[data-testid='product-copy-card-${field}']`).exists()).toBe(true)
    }
    expect(wrapper.text()).toContain("AI draft")
    expect((wrapper.get(TITLE_INPUT).element as HTMLInputElement).value).toBe(nameValueBefore)
    expect(saveCalls.create + saveCalls.update).toBe(0)

    wrapper.unmount()
  })

  it("applying the name card writes only the name field and drops that card from the pending list", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubSaveEndpoints(product.id)
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()
    const shortBefore = (wrapper.get(SHORT_INPUT).element as HTMLTextAreaElement).value

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get("[data-testid='product-copy-apply-name']").trigger("click")
    await flushPromises()

    expect((wrapper.get(TITLE_INPUT).element as HTMLInputElement).value).toBe(SUCCESS_RESPONSE.suggestion.name)
    expect((wrapper.get(SHORT_INPUT).element as HTMLTextAreaElement).value).toBe(shortBefore)
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(false)
    expect(useAiGenerationStore().pending).not.toHaveProperty("name")

    wrapper.unmount()
  })

  it("applying the short-description card writes only that textarea", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubSaveEndpoints(product.id)
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()
    const nameValueBefore = (wrapper.get(TITLE_INPUT).element as HTMLInputElement).value
    const longBefore = (wrapper.get(LONG_INPUT).element as HTMLTextAreaElement).value

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get("[data-testid='product-copy-apply-shortDescription']").trigger("click")
    await flushPromises()

    expect((wrapper.get(SHORT_INPUT).element as HTMLTextAreaElement).value).toBe(
      SUCCESS_RESPONSE.suggestion.shortDescription,
    )
    expect((wrapper.get(TITLE_INPUT).element as HTMLInputElement).value).toBe(nameValueBefore)
    expect((wrapper.get(LONG_INPUT).element as HTMLTextAreaElement).value).toBe(longBefore)
    expect(wrapper.find("[data-testid='product-copy-card-shortDescription']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("applying the long-description card writes only that textarea", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubSaveEndpoints(product.id)
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()
    const shortBefore = (wrapper.get(SHORT_INPUT).element as HTMLTextAreaElement).value

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get("[data-testid='product-copy-apply-longDescription']").trigger("click")
    await flushPromises()

    expect((wrapper.get(LONG_INPUT).element as HTMLTextAreaElement).value).toBe(
      SUCCESS_RESPONSE.suggestion.longDescription,
    )
    expect((wrapper.get(SHORT_INPUT).element as HTMLTextAreaElement).value).toBe(shortBefore)
    expect(wrapper.find("[data-testid='product-copy-card-longDescription']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("apply all from the panel writes every suggested field in one step and leaves no card behind", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    const saveCalls = stubSaveEndpoints(product.id)
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()
    await wrapper.get(GENERATE).trigger("click")
    await settle()
    const store = useAiGenerationStore()
    const entry = store.history[0]

    expect(store.applyAll(entry!.id)).toBe(true)
    await flushPromises()

    expect((wrapper.get(TITLE_INPUT).element as HTMLInputElement).value).toBe(SUCCESS_RESPONSE.suggestion.name)
    expect((wrapper.get(SHORT_INPUT).element as HTMLTextAreaElement).value).toBe(
      SUCCESS_RESPONSE.suggestion.shortDescription,
    )
    expect((wrapper.get(LONG_INPUT).element as HTMLTextAreaElement).value).toBe(
      SUCCESS_RESPONSE.suggestion.longDescription,
    )
    expect(wrapper.find("[data-testid^='product-copy-card-']").exists()).toBe(false)
    expect(store.pending).toEqual({})
    expect(saveCalls.create + saveCalls.update).toBe(0)

    wrapper.unmount()
  })

  it("applying the features card replaces the whole existing feature list with the suggested one", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubSaveEndpoints(product.id)
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get("[data-testid='product-copy-apply-features']").trigger("click")
    await flushPromises()

    const features = SUCCESS_RESPONSE.suggestion.features!
    const values = features.map((_, index) => featureValue(wrapper, index + 1))
    expect(values).toStrictEqual(features)
    expect(wrapper.findAll("[aria-label^='Feature ']")).toHaveLength(features.length)
    expect(wrapper.find("[data-testid='product-copy-card-features']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("dismissing a card removes it without changing the field's value", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()
    const nameValueBefore = (wrapper.get(TITLE_INPUT).element as HTMLInputElement).value

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get("[data-testid='product-copy-dismiss-name']").trigger("click")
    await flushPromises()

    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(false)
    expect((wrapper.get(TITLE_INPUT).element as HTMLInputElement).value).toBe(nameValueBefore)

    wrapper.unmount()
  })

  it("applies a card even when its best-effort outcome event cannot be recorded", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)
    stubEndpoint("/api/ai/products/suggestions/outcomes", "POST", () => {
      throw createError({ statusCode: 503 })
    })
    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get("[data-testid='product-copy-apply-name']").trigger("click")
    await flushPromises()

    expect((wrapper.get(TITLE_INPUT).element as HTMLInputElement).value).toBe(SUCCESS_RESPONSE.suggestion.name!)
    expect(useAiGenerationStore().status).toBe("ready")
    wrapper.unmount()
  })

  it("mirrors the suggested name into an untouched add-mode slug when the name card is applied", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mountAttached(null)
    await flushPromises()

    await wrapper.get(TITLE_INPUT).setValue("Casque")
    await selectBrand(wrapper, "Anker")
    await wrapper.get(SHORT_INPUT).setValue("Casque sans fil pour le travail quotidien.")

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get("[data-testid='product-copy-apply-name']").trigger("click")
    await flushPromises()

    expect((wrapper.get(SLUG_INPUT).element as HTMLInputElement).value).toBe(slugify(SUCCESS_RESPONSE.suggestion.name!))

    wrapper.unmount()
  })

  it("does not overwrite a slug the operator edited by hand when the name card is applied", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mountAttached(null)
    await flushPromises()

    await wrapper.get(TITLE_INPUT).setValue("Casque")
    await selectBrand(wrapper, "Anker")
    await wrapper.get(SHORT_INPUT).setValue("Casque sans fil pour le travail quotidien.")
    await wrapper.get(SLUG_INPUT).setValue("mon-slug-perso")

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    await wrapper.get("[data-testid='product-copy-apply-name']").trigger("click")
    await flushPromises()

    expect((wrapper.get(SLUG_INPUT).element as HTMLInputElement).value).toBe("mon-slug-perso")

    wrapper.unmount()
  })

  it("leaves form and cards untouched on a quota failure, surfaces the reason in the store, and succeeds on a later retry", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubSaveEndpoints(product.id)
    let attempt = 0
    stubEndpoint(AI_PATH, "POST", () => {
      attempt += 1
      if (attempt === 1)
        throw createError({ statusCode: 429, data: { reason: "quota_exceeded", retryAfterSeconds: 1800 } })
      return SUCCESS_RESPONSE
    })

    const wrapper = await mount(product)
    await flushPromises()
    const nameValueBefore = (wrapper.get(TITLE_INPUT).element as HTMLInputElement).value

    await wrapper.get(GENERATE).trigger("click")
    await settle()

    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(false)
    expect((wrapper.get(TITLE_INPUT).element as HTMLInputElement).value).toBe(nameValueBefore)
    const store = useAiGenerationStore()
    expect(store.status).toBe("error")
    expect(store.failure).toStrictEqual({ reason: "quota_exceeded", retryAfterSeconds: 1800 })
    expect(wrapper.get(GENERATE).attributes("disabled")).toBeUndefined()

    await wrapper.get(GENERATE).trigger("click")
    await settle()

    expect(store.status).toBe("ready")
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("clears every card when the form switches to a different product, and the stale result never reappears when switching back", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const productA = makePopulatedProduct()
    const productB = makePopulatedProduct({ nom: "Autre produit" })
    stubInventory(productB.id)
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(productA)
    await flushPromises()

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(true)

    await wrapper.setProps({ product: productB })
    await flushPromises()
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(false)

    await wrapper.setProps({ product: productA })
    await flushPromises()
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("clears every card when the form is cancelled", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()

    // Cancel only renders once the form is dirty; this edit is unrelated to the AI target field.
    await wrapper.get(SHORT_INPUT).setValue("Resume modifie pour afficher Annuler.")
    await wrapper.get(GENERATE).trigger("click")
    await settle()
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(true)

    await wrapper.get("[data-testid='products-detail-form-cancel']").trigger("click")
    await flushPromises()

    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(false)
    expect(useAiGenerationStore().pending).toStrictEqual({})

    wrapper.unmount()
  })

  it("does not throw and leaves the store's pending state empty when the form unmounts before the request resolves", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    const { promise, resolve } = deferred<ProductCopySuggestionResponse>()
    stubEndpoint(AI_PATH, "POST", () => promise)

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get(GENERATE).trigger("click")
    await flushPromises()

    wrapper.unmount()
    resolve(SUCCESS_RESPONSE)
    await flushPromises()

    expect(useAiGenerationStore().pending).toStrictEqual({})
  })

  it("labels the history entry with the product name the operator had typed when generating", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(makePopulatedProduct())
    await flushPromises()
    await wrapper.get(TITLE_INPUT).setValue("Nom tape avant de generer")
    await wrapper.get(GENERATE).trigger("click")
    await settle()

    expect(useAiGenerationStore().history.map(entry => entry.label)).toEqual(["Nom tape avant de generer"])

    wrapper.unmount()
  })

  it("registers the product it is editing as the open editor, and forgets it once it goes away", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const productA = makePopulatedProduct()
    const productB = makePopulatedProduct({ nom: "Autre produit" })
    stubInventory(productB.id)
    const store = useAiGenerationStore()

    const wrapper = await mount(productA)
    await flushPromises()
    expect(store.editorTarget).toEqual({ kind: "product", id: productA.id })

    await wrapper.setProps({ product: productB })
    await flushPromises()
    expect(store.editorTarget).toEqual({ kind: "product", id: productB.id })

    wrapper.unmount()
    expect(store.editorTarget).toBeNull()
  })

  it("brings the cards back from the history after they were applied and dismissed", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)
    const store = useAiGenerationStore()

    const wrapper = await mount(makePopulatedProduct())
    await flushPromises()
    await wrapper.get(GENERATE).trigger("click")
    await settle()
    for (const field of ["name", "shortDescription", "longDescription", "features"]) {
      await wrapper.get(`[data-testid='product-copy-dismiss-${field}']`).trigger("click")
    }
    await flushPromises()
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(false)

    const entry = store.history[0]
    expect(entry && store.canRestore(entry.id)).toBe(true)
    store.restore(entry!.id)
    await flushPromises()

    for (const field of ["name", "shortDescription", "longDescription", "features"]) {
      expect(wrapper.find(`[data-testid='product-copy-card-${field}']`).exists()).toBe(true)
    }

    wrapper.unmount()
  })

  it("keeps the name card in place and never overwrites what the operator is typing", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct()
    stubEndpoint(AI_PATH, "POST", () => SUCCESS_RESPONSE)

    const wrapper = await mount(product)
    await flushPromises()

    await wrapper.get(GENERATE).trigger("click")
    await settle()
    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(true)

    await wrapper.get(TITLE_INPUT).setValue("Nom tape par l'operateur")
    await flushPromises()

    expect(wrapper.find("[data-testid='product-copy-card-name']").exists()).toBe(true)
    expect((wrapper.get(TITLE_INPUT).element as HTMLInputElement).value).toBe("Nom tape par l'operateur")

    wrapper.unmount()
  })
})
