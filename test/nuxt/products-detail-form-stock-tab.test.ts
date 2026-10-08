import type { ProductDetail } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ProductsDetailForm from "@/components/products/DetailForm.vue"
import { clearEndpoints, settle, stubEndpoint } from "./delivery-fixture"
import { inventoryPath, makeHistory, makeInventory, makeMovement } from "./inventory-fixture"

const PANEL = "[data-testid='product-inventory-panel']"
const ADJUST = "[data-testid='product-inventory-adjust']"
const BAR = "[data-testid='product-inventory-action-bar']"
const TOGGLE = "[data-testid='product-inventory-restocking-toggle']"
const ROW = "[data-testid='product-inventory-movement']"
const TITLE = "[data-testid='products-detail-overview-title']"

let inventoryRequests = 0

function serveInventory(
  product: ProductDetail,
  history = makeHistory({ inventaire: makeInventory({ produit_id: product.id }), mouvements: [makeMovement()] }),
) {
  stubEndpoint(inventoryPath(product.id), "GET", () => {
    inventoryRequests += 1
    return history
  })
}

function makeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 7001,
    slug: "casque",
    nom: "Casque Bluetooth Pro",
    prix: 49_900,
    prix_reference: null,
    remise_pct: null,
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

async function mountForm(product: ProductDetail | null, roles: Role[] = ["direction"]) {
  seedSession(roles)
  inventoryRequests = 0
  if (product) {
    stubEndpoint(inventoryPath(product.id), "GET", () => {
      inventoryRequests += 1
      return makeHistory({ inventaire: makeInventory({ produit_id: product.id }) })
    })
  }
  const wrapper = await mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountForm>>

function tabLabels(wrapper: Wrapper) {
  return wrapper
    .findAll("button")
    .map(button => button.text())
    .filter(text => /^(?:Overview|Stock|History)/.test(text))
}

async function clickTab(wrapper: Wrapper, label: string) {
  const tab = wrapper.findAll("button").find(button => button.text().startsWith(label))
  expect(tab, `${label} tab`).toBeDefined()
  await tab!.trigger("click")
  await settle()
}

describe("products detail form: Stock tab", () => {
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("orders the tabs Overview, Stock, History for a saved product", async () => {
    const wrapper = await mountForm(makeProduct())

    expect(tabLabels(wrapper)).toEqual(["Overview", "Stock", "History (0)"])
  })

  it("has no Stock tab in create mode and keeps the History tab", async () => {
    const wrapper = await mountForm(null)

    expect(tabLabels(wrapper)).toEqual(["Overview", "History (0)"])
    expect(wrapper.find(PANEL).exists()).toBe(false)
  })

  it("does not mount the inventory panel or request inventory while on Overview", async () => {
    const wrapper = await mountForm(makeProduct())

    expect(wrapper.find(PANEL).exists()).toBe(false)
    expect(inventoryRequests).toBe(0)
  })

  it("does not mount the inventory panel when only the History tab is opened", async () => {
    const wrapper = await mountForm(makeProduct())

    await clickTab(wrapper, "History")

    expect(wrapper.find(PANEL).exists()).toBe(false)
    expect(inventoryRequests).toBe(0)
  })

  it("shows the panel and hides the overview once the Stock tab is opened", async () => {
    const wrapper = await mountForm(makeProduct())

    await clickTab(wrapper, "Stock")

    expect(wrapper.get(PANEL).isVisible()).toBe(true)
    expect(wrapper.get(TITLE).isVisible()).toBe(false)
    expect(inventoryRequests).toBe(1)
  })

  it("keeps the panel mounted but hidden, without refetching, when switching away and back", async () => {
    const wrapper = await mountForm(makeProduct())

    await clickTab(wrapper, "Stock")
    await clickTab(wrapper, "Overview")
    expect(wrapper.find(PANEL).exists()).toBe(true)
    expect(wrapper.get(PANEL).isVisible()).toBe(false)
    expect(wrapper.get(TITLE).isVisible()).toBe(true)

    await clickTab(wrapper, "History")
    expect(wrapper.get(PANEL).isVisible()).toBe(false)

    await clickTab(wrapper, "Stock")
    expect(wrapper.get(PANEL).isVisible()).toBe(true)
    expect(inventoryRequests).toBe(1)
  })

  it("returns to Overview when a different product is shown", async () => {
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
    const wrapper = await mountForm(product)
    stubEndpoint(inventoryPath(other.id), "GET", () =>
      makeHistory({ inventaire: makeInventory({ produit_id: other.id }) }),
    )

    await clickTab(wrapper, "Stock")
    await wrapper.setProps({ product: other })
    await flushPromises()

    expect(wrapper.get(TITLE).isVisible()).toBe(true)
    expect(wrapper.find(PANEL).exists() && wrapper.get(PANEL).isVisible()).toBe(false)
  })

  it("lets direction adjust stock from the action bar of the Stock tab, outside the table panel", async () => {
    const wrapper = await mountForm(makeProduct(), ["direction"])

    await clickTab(wrapper, "Stock")

    expect(wrapper.get(BAR).isVisible()).toBe(true)
    expect(wrapper.get(BAR).find(ADJUST).exists()).toBe(true)
    expect(wrapper.get(PANEL).find(BAR).exists()).toBe(false)
    expect(wrapper.get(PANEL).find(ADJUST).exists()).toBe(false)
    expect(inventoryRequests).toBe(1)
  })

  it("removes the action bar when switching to Overview or History and brings it back on Stock", async () => {
    const wrapper = await mountForm(makeProduct(), ["direction"])

    await clickTab(wrapper, "Stock")
    await clickTab(wrapper, "Overview")
    expect(wrapper.find(BAR).exists() && wrapper.get(BAR).isVisible()).toBe(false)

    await clickTab(wrapper, "History")
    expect(wrapper.find(BAR).exists() && wrapper.get(BAR).isVisible()).toBe(false)

    await clickTab(wrapper, "Stock")
    expect(wrapper.get(BAR).isVisible()).toBe(true)
  })

  it("gives comptoir the movements table but no action bar, no adjust and no restocking toggle", async () => {
    const product = makeProduct()
    seedSession(["comptoir"])
    serveInventory(
      product,
      makeHistory({
        inventaire: makeInventory({ produit_id: product.id, quantite_stock: 0, statut_stock: "rupture" }),
        mouvements: [makeMovement()],
      }),
    )
    const wrapper = await mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
    mounted.push(wrapper)
    await settle()

    await clickTab(wrapper, "Stock")

    expect(wrapper.get(PANEL).isVisible()).toBe(true)
    expect(wrapper.findAll(ROW)).toHaveLength(1)
    expect(wrapper.find(BAR).exists()).toBe(false)
    expect(wrapper.find(ADJUST).exists()).toBe(false)
    expect(wrapper.find(TOGGLE).exists()).toBe(false)
  })

  it("shows the restocking toggle in the action bar for direction when the product is out of stock with no quantity", async () => {
    const product = makeProduct()
    seedSession(["direction"])
    serveInventory(
      product,
      makeHistory({
        inventaire: makeInventory({ produit_id: product.id, quantite_stock: 0, statut_stock: "rupture" }),
        mouvements: [],
      }),
    )
    const wrapper = await mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
    mounted.push(wrapper)
    await settle()

    await clickTab(wrapper, "Stock")

    expect(wrapper.get(BAR).find(TOGGLE).exists()).toBe(true)
  })
})
