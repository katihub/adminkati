import type { ProductDetail } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ProductsDetailForm from "@/components/products/DetailForm.vue"
import { clearEndpoints, inBody, settle, stubEndpoint } from "./delivery-fixture"
import { inventoryPath, makeInventory, stubInventory } from "./inventory-fixture"

const TITLE = "[data-testid='products-detail-overview-title']"
const DESCRIPTION = "[data-testid='products-detail-overview-description-input']"
const SAVE = "[data-testid='products-detail-form-save']"
const CANCEL = "[data-testid='products-detail-form-cancel']"

function makeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 7001,
    slug: "casque",
    nom: "Casque Bluetooth Pro",
    prix: 49_900,
    prix_reference: null,
    remise_pct: null,
    // The backend derives this legacy flag from the stock state, so it flips with every write that crosses zero.
    en_stock: true,
    statut_stock: "en_stock",
    quantite_stock: 10,
    inventaire: {
      produit_id: 7001,
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
    description: "Resume initial.",
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

/** The same product as the server returns it after a stock write: only the stock fields move. */
function afterStockWrite(product: ProductDetail): ProductDetail {
  return {
    ...product,
    en_stock: false,
    quantite_stock: 0,
    statut_stock: "rupture",
    inventaire: {
      produit_id: product.id,
      quantite_stock: 0,
      statut_stock: "rupture",
      modifie_le: "2026-09-30T08:00:00.000Z",
      disponibilite_forcee: null,
    },
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

const mounted: Array<{ unmount: () => void }> = []

async function mountForm(product: ProductDetail) {
  seedSession(["direction"])
  stubInventory(product.id)
  const wrapper = await mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

async function openHistoryTab(wrapper: Awaited<ReturnType<typeof mountForm>>) {
  const tab = wrapper.findAll("button").find(button => button.text().startsWith("History"))
  expect(tab, "History tab").toBeDefined()
  await tab!.trigger("click")
  await flushPromises()
}

const PANEL = "[data-testid='product-inventory-panel']"

async function openStockTab(wrapper: Awaited<ReturnType<typeof mountForm>>) {
  const tab = wrapper.findAll("button").find(button => button.text() === "Stock")
  expect(tab, "Stock tab").toBeDefined()
  await tab!.trigger("click")
  await settle()
}

describe("products detail form: refetch after a stock write", () => {
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("keeps an unsaved name edit and the dirty state when only the stock fields change", async () => {
    const product = makeProduct()
    const wrapper = await mountForm(product)

    await wrapper.get(TITLE).setValue("Nom en cours de saisie")
    await wrapper.setProps({ product: afterStockWrite(product) })
    await flushPromises()

    expect(wrapper.get(TITLE).element).toHaveProperty("value", "Nom en cours de saisie")
    expect(wrapper.get(SAVE).attributes("disabled")).toBeUndefined()
    expect(wrapper.find(CANCEL).exists()).toBe(true)
  })

  it("keeps an unsaved description edit when only the stock fields change", async () => {
    const product = makeProduct()
    const wrapper = await mountForm(product)

    await wrapper.get(DESCRIPTION).setValue("Resume reecrit a moitie")
    await wrapper.setProps({ product: afterStockWrite(product) })
    await flushPromises()

    expect(wrapper.get(DESCRIPTION).element).toHaveProperty("value", "Resume reecrit a moitie")
    expect(wrapper.find(CANCEL).exists()).toBe(true)
  })

  it("stays on the tab the operator switched to when only the stock fields change", async () => {
    const product = makeProduct()
    const wrapper = await mountForm(product)

    await openHistoryTab(wrapper)
    expect(wrapper.get(TITLE).isVisible()).toBe(false)
    await wrapper.setProps({ product: afterStockWrite(product) })
    await flushPromises()

    expect(wrapper.get(TITLE).isVisible()).toBe(false)
  })

  it("re-syncs to the saved values and returns to the overview when saved fields change", async () => {
    const product = makeProduct()
    const wrapper = await mountForm(product)

    await wrapper.get(TITLE).setValue("Edition abandonnee")
    await openHistoryTab(wrapper)
    await wrapper.setProps({ product: { ...product, nom: "Nom enregistre" } })
    await flushPromises()

    expect(wrapper.get(TITLE).element).toHaveProperty("value", "Nom enregistre")
    expect(wrapper.get(TITLE).isVisible()).toBe(true)
    expect(wrapper.find(CANCEL).exists()).toBe(false)
    expect(wrapper.find(SAVE).exists()).toBe(false)
  })

  it("re-syncs when a different product is shown", async () => {
    const product = makeProduct()
    const other = makeProduct({
      id: 7002,
      slug: "chargeur",
      nom: "Chargeur rapide",
      inventaire: {
        produit_id: 7002,
        quantite_stock: 3,
        statut_stock: "en_stock",
        modifie_le: null,
        disponibilite_forcee: null,
      },
    })
    stubInventory(other.id)
    const wrapper = await mountForm(product)

    await wrapper.get(TITLE).setValue("Edition en cours")
    await wrapper.setProps({ product: other })
    await flushPromises()

    expect(wrapper.get(TITLE).element).toHaveProperty("value", "Chargeur rapide")
    expect(wrapper.find(CANCEL).exists()).toBe(false)
  })

  it("keeps a pending name edit when a stock movement is posted from the panel and the detail refetches", async () => {
    const product = makeProduct()
    const wrapper = await mountForm(product)
    let posted = 0
    stubEndpoint(`${inventoryPath(product.id)}/mouvements`, "POST", () => {
      posted += 1
      return makeInventory({ produit_id: product.id, quantite_stock: 0, statut_stock: "rupture" })
    })

    await wrapper.get(TITLE).setValue("Nom en attente")
    await openStockTab(wrapper)
    await wrapper.get("[data-testid='product-inventory-adjust']").trigger("click")
    await settle()
    await inBody("inventory-adjustment-variation").setValue("3")
    await inBody("inventory-adjustment-reason").setValue("Livraison")
    await inBody("inventory-adjustment-save").trigger("click")
    await settle()
    // The page-level detail query refetches after the write; the parent hands the form a fresh object.
    await wrapper.setProps({ product: afterStockWrite(product) })
    await flushPromises()

    expect(posted).toBe(1)
    expect(wrapper.get(TITLE).element).toHaveProperty("value", "Nom en attente")
    expect(wrapper.find(CANCEL).exists()).toBe(true)
    expect(wrapper.get(PANEL).isVisible()).toBe(true)
    expect(wrapper.get(TITLE).isVisible()).toBe(false)
  })

  it("returns from the Stock tab to the overview when saved fields change", async () => {
    const product = makeProduct()
    const wrapper = await mountForm(product)

    await openStockTab(wrapper)
    await wrapper.setProps({ product: { ...product, nom: "Nom enregistre" } })
    await flushPromises()

    expect(wrapper.get(TITLE).isVisible()).toBe(true)
    expect(wrapper.get(PANEL).isVisible()).toBe(false)
  })
})
