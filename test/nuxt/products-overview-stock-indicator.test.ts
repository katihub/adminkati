import type { InventaireProduit } from "@/types/api/inventaire"
import type { ProductDetail } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import ProductsDetailForm from "@/components/products/DetailForm.vue"
import { clearEndpoints, existsInBody, inBody, settle, stubEndpoint } from "./delivery-fixture"
import { stubInventory } from "./inventory-fixture"

const COUNTED_AT = "2026-09-29T10:00:00.000Z"
const TRACK = "[data-testid='products-detail-overview-track-stock']"
const SOURCE = "[data-testid='products-detail-overview-status-source']"
const NOT_COUNTED = "[data-testid='products-detail-overview-not-counted']"
const CONFIRM = "stock-conflict-confirm"
const CANCEL = "stock-conflict-cancel"
const DIALOG = "stock-conflict-dialog"
const SWITCH = "[data-testid='products-detail-overview-en-stock']"
const QUANTITY = "[data-testid='products-detail-overview-stock-quantity']"
const EDIT = "[data-testid='products-detail-overview-stock-edit']"
const TITLE = "[data-testid='products-detail-overview-title']"
const INITIAL = "[data-testid='products-detail-overview-initial-stock-input']"
const PRODUCT_PATH = "/api/v1/catalogue/administration/produits"

type Statut = "en_stock" | "rupture" | "reapprovisionnement"

/** `inventory` overrides the stock summary: by default the product was never counted and nobody decided its status. */
function makeProduct(
  statut: Statut = "en_stock",
  quantite = 12,
  overrides: Partial<ProductDetail> = {},
  inventory: Partial<InventaireProduit> = {},
): ProductDetail {
  return {
    id: 7001,
    slug: "casque",
    nom: "Casque Bluetooth Pro",
    prix: 49_900,
    prix_reference: null,
    remise_pct: null,
    statut_stock: statut,
    quantite_stock: quantite,
    inventaire: {
      produit_id: 7001,
      quantite_stock: quantite,
      statut_stock: statut,
      modifie_le: null,
      disponibilite_forcee: null,
      ...inventory,
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
  if (product) stubInventory(product.id)
  const wrapper = await mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

function isChecked(wrapper: Awaited<ReturnType<typeof mountForm>>) {
  const element = wrapper.get(SWITCH)
  return element.attributes("aria-checked") === "true" || element.attributes("data-state") === "checked"
}

describe("products overview: stock indicator", () => {
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("shows an In stock switch that is on, with the quantity, for a product in stock", async () => {
    const wrapper = await mountForm(makeProduct("en_stock", 12))

    expect(isChecked(wrapper)).toBe(true)
    expect(wrapper.get(QUANTITY).text()).toBe("12")
    expect(wrapper.text()).toContain("In stock")
    expect(wrapper.text()).not.toContain("Quantity in stock")
    expect(wrapper.get(QUANTITY).attributes("aria-label")).toBe("Quantity in stock")
  })

  it.each(["rupture", "reapprovisionnement"] as const)("shows the switch off for a %s product", async statut => {
    const wrapper = await mountForm(makeProduct(statut, 0))

    expect(isChecked(wrapper)).toBe(false)
    expect(wrapper.get(QUANTITY).text()).toBe("0")
    // The label names the actual state, so an off switch is never read as "In stock".
    expect(wrapper.text()).toContain("Out of stock")
  })

  it("is read-only for comptoir too, and still shows the state", async () => {
    const wrapper = await mountForm(makeProduct("rupture", 0), ["comptoir"])

    expect(wrapper.get(SWITCH).attributes("disabled")).toBeDefined()
    expect(isChecked(wrapper)).toBe(false)
  })

  describe("the selling status, independent of the count", () => {
    function captureDecisions(productId: number) {
      const bodies: unknown[] = []
      stubEndpoint(`${PRODUCT_PATH}/${productId}/disponibilite`, "PATCH", async event => {
        bodies.push(await readBody(event))
        return {}
      })
      return bodies
    }

    it("never writes for comptoir, whichever switch is clicked", async () => {
      const product = makeProduct("en_stock", 12, {}, { modifie_le: COUNTED_AT, disponibilite_forcee: "en_stock" })
      const bodies = captureDecisions(product.id)
      const wrapper = await mountForm(product, ["comptoir"])

      expect(wrapper.get(SWITCH).attributes("disabled")).toBeDefined()
      expect(wrapper.get(TRACK).attributes("disabled")).toBeDefined()
      await wrapper.get(SWITCH).trigger("click")
      await wrapper.get(TRACK).trigger("click")
      await settle()

      expect(bodies).toEqual([])
    })

    it("sets a product nobody has counted out of stock at once, without a warning and without a count", async () => {
      const product = makeProduct("en_stock", 0)
      const bodies = captureDecisions(product.id)
      const wrapper = await mountForm(product)

      expect(wrapper.get(TRACK).attributes("disabled")).toBeDefined()
      await wrapper.get(SWITCH).trigger("click")
      await settle()

      expect(existsInBody(DIALOG)).toBe(false)
      expect(bodies).toEqual([{ disponibilite_forcee: "rupture" }])
    })

    it("puts an uncounted product back in stock with an explicit decision, never by clearing it", async () => {
      const product = makeProduct("rupture", 0, {}, { disponibilite_forcee: "rupture" })
      const bodies = captureDecisions(product.id)
      const wrapper = await mountForm(product)

      await wrapper.get(SWITCH).trigger("click")
      await settle()

      expect(bodies).toEqual([{ disponibilite_forcee: "en_stock" }])
    })

    it("warns before selling a counted product with nothing on hand; cancel sends nothing, confirm sends the decision", async () => {
      const product = makeProduct("rupture", 0, {}, { modifie_le: COUNTED_AT, disponibilite_forcee: "rupture" })
      const bodies = captureDecisions(product.id)
      const wrapper = await mountForm(product)

      await wrapper.get(SWITCH).trigger("click")
      await settle()
      expect(existsInBody(DIALOG)).toBe(true)

      await inBody(CANCEL).trigger("click")
      await settle()
      expect(bodies).toEqual([])

      await wrapper.get(SWITCH).trigger("click")
      await settle()
      await inBody(CONFIRM).trigger("click")
      await settle()
      expect(bodies).toEqual([{ disponibilite_forcee: "en_stock" }])
    })

    it("lets a counted product follow its count: tracking is on and the status switch is read-only", async () => {
      const wrapper = await mountForm(makeProduct("en_stock", 12, {}, { modifie_le: COUNTED_AT }))

      expect(wrapper.get(TRACK).attributes("aria-checked")).toBe("true")
      expect(wrapper.get(SWITCH).attributes("disabled")).toBeDefined()
      expect(wrapper.get(SOURCE).text()).toBe("Follows the count")
    })

    it("says a counted product's status is set in the panel, and Track quantity warns before handing it back", async () => {
      const product = makeProduct("rupture", 5, {}, { modifie_le: COUNTED_AT, disponibilite_forcee: "rupture" })
      const bodies = captureDecisions(product.id)
      const wrapper = await mountForm(product)

      expect(wrapper.get(SOURCE).text()).toBe("Set in the panel")

      await wrapper.get(TRACK).trigger("click")
      await settle()

      expect(bodies).toHaveLength(0) // handing back would flip availability, so the warning comes first
      expect(existsInBody(DIALOG)).toBe(true)
    })

    /* WOOCOMMERCE RESTE LA SOURCE TANT QUE PERSONNE N'A DECIDE ICI. Une fois le statut fixe dans le
       panel, il l'emporte sur les imports : sans signe visible, les deux derivent sans avertissement. */
    it("says where an uncounted product's status comes from, to every role: WooCommerce until it is set in the panel", async () => {
      const untouched = await mountForm(makeProduct("en_stock", 0))
      expect(untouched.get(SOURCE).text()).toBe("From WooCommerce")
      untouched.unmount()
      mounted.length = 0

      const decided = await mountForm(makeProduct("rupture", 0, {}, { disponibilite_forcee: "rupture" }), ["comptoir"])
      expect(decided.get(SOURCE).text()).toBe("Set in the panel")
    })
  })

  it("flags a product nobody has counted as Not counted, and drops the flag once it is counted", async () => {
    const uncounted = await mountForm(makeProduct("en_stock", 0))
    expect(uncounted.get(NOT_COUNTED).text()).toBe("Not counted")
    uncounted.unmount()
    mounted.length = 0

    const counted = await mountForm(makeProduct("en_stock", 12, {}, { modifie_le: COUNTED_AT }))
    expect(counted.find(NOT_COUNTED).exists()).toBe(false)
  })

  it("offers direction an icon-only ghost edit button that opens the adjustment dialog", async () => {
    const wrapper = await mountForm(makeProduct("en_stock", 12), ["direction"])
    const edit = wrapper.get(EDIT)

    expect(edit.text()).toBe("")
    expect(edit.attributes("aria-label")).toBe("Adjust stock")
    expect(edit.attributes("data-variant")).toBe("ghost")
    expect(document.body.querySelector("[data-testid='inventory-adjustment-dialog']")).toBeNull()

    await edit.trigger("click")
    await settle()

    expect(document.body.querySelector("[data-testid='inventory-adjustment-dialog']")).not.toBeNull()
  })

  it("offers the edit button on an out-of-stock product too, so stock can be received", async () => {
    const wrapper = await mountForm(makeProduct("rupture", 0), ["direction"])

    expect(wrapper.find(EDIT).exists()).toBe(true)
  })

  it("hides the edit button from comptoir", async () => {
    const wrapper = await mountForm(makeProduct("en_stock", 12), ["comptoir"])

    expect(wrapper.find(EDIT).exists()).toBe(false)
  })

  it("is absent in create mode, where the initial-quantity field stays", async () => {
    const wrapper = await mountForm(null)

    expect(wrapper.find(EDIT).exists()).toBe(false)

    expect(wrapper.find(SWITCH).exists()).toBe(false)
    expect(wrapper.find(QUANTITY).exists()).toBe(false)
    expect(wrapper.find(INITIAL).exists()).toBe(true)
  })

  it("reflects the refreshed product after a stock write", async () => {
    const product = makeProduct("en_stock", 12)
    const wrapper = await mountForm(product)
    expect(wrapper.get(QUANTITY).text()).toBe("12")

    await wrapper.setProps({ product: makeProduct("rupture", 0) })
    await flushPromises()

    expect(wrapper.get(QUANTITY).text()).toBe("0")
    expect(isChecked(wrapper)).toBe(false)
  })

  it("updates the indicator on a stock-only refresh without losing unsaved Overview edits", async () => {
    const product = makeProduct("en_stock", 12)
    const wrapper = await mountForm(product)

    await wrapper.get(TITLE).setValue("Nom en cours de saisie")
    await wrapper.setProps({ product: makeProduct("en_stock", 20) })
    await flushPromises()

    expect(wrapper.get(QUANTITY).text()).toBe("20")
    expect(wrapper.get(TITLE).element).toHaveProperty("value", "Nom en cours de saisie")
    expect(wrapper.get(TITLE).isVisible()).toBe(true)
  })
})
