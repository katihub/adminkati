import type { InventaireHistorique } from "@/types/api/inventaire"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { DOMWrapper, flushPromises } from "@vue/test-utils"
import { createError, readBody } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import ProductsInventoryActionBar from "@/components/products/InventoryActionBar.vue"
import ProductsInventoryPanel from "@/components/products/InventoryPanel.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { clearEndpoints, existsInBody, inBody, settle, stubEndpoint } from "./delivery-fixture"
import { inventoryPath, makeHistory, makeInventory, makeMovement } from "./inventory-fixture"

const ID = 42
const PATH = inventoryPath(ID)
const MOVEMENTS_PATH = `${PATH}/mouvements`
const STATUS_PATH = `${PATH}/statut`
const ADJUST = "[data-testid='product-inventory-adjust']"
const TOGGLE = "[data-testid='product-inventory-restocking-toggle']"
const ROW = "[data-testid='product-inventory-movement']"

const mounted: Array<{ unmount: () => void }> = []

function seedSession(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles,
  })
}

function historyOf(
  quantite: number,
  statut: "en_stock" | "rupture" | "reapprovisionnement",
  mouvements = [makeMovement()],
): InventaireHistorique {
  return makeHistory({ inventaire: makeInventory({ quantite_stock: quantite, statut_stock: statut }), mouvements })
}

function serveHistory(initial: InventaireHistorique) {
  const state = { history: initial, reads: 0 }
  stubEndpoint(PATH, "GET", () => {
    state.reads += 1
    return state.history
  })
  return state
}

async function mountBar() {
  const wrapper = await mountSuspended(ProductsInventoryActionBar, {
    props: { productId: ID },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

/** The bar and the table side by side, as the Stock tab shows them: one query key, so one request. */
async function mountBarWithPanel() {
  const Harness = defineComponent({
    render: () =>
      h("div", [h(ProductsInventoryActionBar, { productId: ID }), h(ProductsInventoryPanel, { productId: ID })]),
  })
  const wrapper = await mountSuspended(Harness, { attachTo: document.body })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

async function openDialog(wrapper: Awaited<ReturnType<typeof mountBar>>) {
  await wrapper.get(ADJUST).trigger("click")
  await settle()
  return inBody("inventory-adjustment-dialog")
}

async function chooseType(value: "reception" | "correction") {
  const control = inBody("inventory-adjustment-type")
  if (control.element.tagName === "SELECT") {
    await control.setValue(value)
    return
  }
  const option = control.element.querySelector<HTMLElement>(`[value='${value}'], [data-value='${value}']`)
  expect(option, `type option ${value}`).not.toBeNull()
  await new DOMWrapper(option!).trigger("click")
}

function selectedType() {
  const control = inBody("inventory-adjustment-type").element
  if (control.tagName === "SELECT") return (control as HTMLSelectElement).value
  return control.querySelector("[data-state='checked'], [aria-checked='true']")?.getAttribute("value")
}

async function fillAdjustment(fields: { type?: "reception" | "correction"; variation?: string; reason?: string }) {
  if (fields.type) await chooseType(fields.type)
  if (fields.variation !== undefined) await inBody("inventory-adjustment-variation").setValue(fields.variation)
  if (fields.reason !== undefined) await inBody("inventory-adjustment-reason").setValue(fields.reason)
}

async function submitAdjustment() {
  await inBody("inventory-adjustment-save").trigger("click")
  await settle()
}

function deferred() {
  let open!: () => void
  const promise = new Promise<void>(resolve => {
    open = resolve
  })
  return { promise, open }
}

describe("product inventory action bar", () => {
  beforeEach(() => {
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false } })
  })

  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: 1 } })
    document.body.innerHTML = ""
  })

  describe("layout", () => {
    it("offers no adjust action until the first inventory page has loaded", async () => {
      seedSession(["direction"])
      const gate = deferred()
      stubEndpoint(PATH, "GET", async () => {
        await gate.promise
        return historyOf(5, "en_stock")
      })

      const wrapper = await mountSuspended(ProductsInventoryActionBar, {
        props: { productId: ID },
        attachTo: document.body,
      })
      mounted.push(wrapper)
      await flushPromises()
      expect(wrapper.find(ADJUST).exists()).toBe(false)

      gate.open()
      await settle()
      expect(wrapper.find(ADJUST).exists()).toBe(true)
    })

    it("offers no adjust action and no restocking toggle when the inventory failed to load", async () => {
      seedSession(["direction"])
      stubEndpoint(PATH, "GET", () => {
        throw createError({ statusCode: 500, statusMessage: "Server Error" })
      })

      const wrapper = await mountBar()

      expect(wrapper.find(ADJUST).exists()).toBe(false)
      expect(wrapper.find(TOGGLE).exists()).toBe(false)
    })

    it("shares one inventory request with the movements table", async () => {
      seedSession(["direction"])
      const reads = serveHistory(historyOf(5, "en_stock"))

      const wrapper = await mountBarWithPanel()

      expect(reads.reads).toBe(1)
      expect(wrapper.find(ADJUST).exists()).toBe(true)
      expect(wrapper.findAll(ROW)).toHaveLength(1)
    })
  })

  describe("adjusting stock", () => {
    async function mountDirection(history = historyOf(5, "en_stock")) {
      seedSession(["direction"])
      const reads = serveHistory(history)
      const wrapper = await mountBar()
      return { wrapper, reads }
    }

    function captureMovements(response: unknown = historyOf(8, "en_stock")) {
      const seen: { bodies: unknown[] } = { bodies: [] }
      stubEndpoint(MOVEMENTS_PATH, "POST", async event => {
        seen.bodies.push(await readBody(event))
        return response
      })
      return seen
    }

    it("opens the adjustment dialog on a reception by default", async () => {
      const { wrapper } = await mountDirection()

      await openDialog(wrapper)

      expect(selectedType()).toBe("reception")
    })

    it("posts exactly the type, the numeric variation and the trimmed reason", async () => {
      const { wrapper } = await mountDirection()
      const seen = captureMovements()

      await openDialog(wrapper)
      await fillAdjustment({ variation: "3", reason: "  Livraison fournisseur  " })
      await submitAdjustment()

      expect(seen.bodies).toEqual([{ type: "reception", variation: 3, motif: "Livraison fournisseur" }])
    })

    it("posts a negative correction", async () => {
      const { wrapper } = await mountDirection()
      const seen = captureMovements()

      await openDialog(wrapper)
      await fillAdjustment({ type: "correction", variation: "-2", reason: "Casse" })
      await submitAdjustment()

      expect(seen.bodies).toEqual([{ type: "correction", variation: -2, motif: "Casse" }])
    })

    it.each([
      ["a zero variation", { variation: "0", reason: "Recomptage" }],
      ["a negative reception", { variation: "-3", reason: "Recomptage" }],
      ["a reason that is blank once trimmed", { variation: "3", reason: "   " }],
      ["a reason over 200 characters", { variation: "3", reason: "m".repeat(201) }],
    ])("refuses %s inline without sending anything", async (_name, fields) => {
      const { wrapper } = await mountDirection()
      const seen = captureMovements()

      await openDialog(wrapper)
      await fillAdjustment(fields)
      await submitAdjustment()

      expect(inBody("inventory-adjustment-error").attributes("role")).toBe("alert")
      expect(seen.bodies).toEqual([])
      expect(existsInBody("inventory-adjustment-dialog")).toBe(true)
    })

    it("keeps the dialog open with the server's message and the typed values when the server refuses", async () => {
      const { wrapper } = await mountDirection()
      stubEndpoint(MOVEMENTS_PATH, "POST", () => {
        throw createError({ statusCode: 409, statusMessage: "Conflict", data: { message: "Stock insuffisant." } })
      })

      await openDialog(wrapper)
      await fillAdjustment({ type: "correction", variation: "-9", reason: "Casse" })
      await submitAdjustment()

      const alert = inBody("inventory-adjustment-error")
      expect(alert.attributes("role")).toBe("alert")
      expect(alert.text()).toContain("Stock insuffisant.")
      expect(existsInBody("inventory-adjustment-dialog")).toBe(true)
      expect((inBody("inventory-adjustment-variation").element as HTMLInputElement).value).toBe("-9")
      expect((inBody("inventory-adjustment-reason").element as HTMLInputElement).value).toBe("Casse")
    })

    it("disables the save button and the controls while the request is pending", async () => {
      const { wrapper } = await mountDirection()
      const gate = deferred()
      stubEndpoint(MOVEMENTS_PATH, "POST", async () => {
        await gate.promise
        return historyOf(8, "en_stock")
      })

      await openDialog(wrapper)
      await fillAdjustment({ variation: "3", reason: "Livraison" })
      await inBody("inventory-adjustment-save").trigger("click")
      await flushPromises()

      expect(inBody("inventory-adjustment-save").attributes("disabled")).toBeDefined()
      expect(inBody("inventory-adjustment-variation").attributes("disabled")).toBeDefined()
      expect(inBody("inventory-adjustment-reason").attributes("disabled")).toBeDefined()

      gate.open()
      await settle()
    })

    it("closes the dialog after a recorded movement", async () => {
      const { wrapper } = await mountDirection()
      captureMovements()

      await openDialog(wrapper)
      await fillAdjustment({ variation: "3", reason: "Livraison" })
      await submitAdjustment()

      expect(existsInBody("inventory-adjustment-dialog")).toBe(false)
    })

    it("refreshes the product detail, the product lists, the statistics and this inventory after a movement", async () => {
      const { wrapper, reads } = await mountDirection()
      const queryClient = useNuxtApp().$queryClient
      const others = [
        apiQueryKeys.products.detail(ID),
        apiQueryKeys.products.list({ etat: "actifs" }),
        apiQueryKeys.statistics.overview(),
      ]
      others.forEach(key => queryClient.setQueryData(key, { seeded: true }))
      captureMovements()
      const readsBefore = reads.reads

      await openDialog(wrapper)
      await fillAdjustment({ variation: "3", reason: "Livraison" })
      await submitAdjustment()

      others.forEach(key => expect(queryClient.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true))
      expect(reads.reads).toBeGreaterThan(readsBefore)
    })

    it("shows the newly recorded movement first in the table beside it", async () => {
      seedSession(["direction"])
      let written = false
      stubEndpoint(PATH, "GET", () => {
        const fresh = written
          ? [
              makeMovement({
                id: "fresh",
                type: "correction",
                variation: -1,
                quantite_avant: 5,
                quantite_apres: 4,
                motif: "Mouvement tout neuf",
              }),
            ]
          : []
        return makeHistory({
          inventaire: makeInventory({ quantite_stock: 5 }),
          mouvements: [...fresh, makeMovement({ id: "a", motif: "Ancien" })],
        })
      })
      stubEndpoint(MOVEMENTS_PATH, "POST", async event => {
        await readBody(event)
        written = true
        return makeInventory({ quantite_stock: 4 })
      })
      const wrapper = await mountBarWithPanel()

      await wrapper.get(ADJUST).trigger("click")
      await settle()
      await fillAdjustment({ variation: "1", reason: "Recomptage" })
      await submitAdjustment()

      expect(wrapper.findAll(ROW)[0]!.text()).toContain("Mouvement tout neuf")
    })
  })

  describe("restocking status", () => {
    async function mountDirection(history: InventaireHistorique) {
      seedSession(["direction"])
      const reads = serveHistory(history)
      const wrapper = await mountBar()
      return { wrapper, reads }
    }

    it.each([
      ["stock remains", historyOf(5, "rupture")],
      ["the product is in stock", historyOf(0, "en_stock")],
    ])("offers no restocking control while %s", async (_name, history) => {
      const { wrapper } = await mountDirection(history)

      expect(wrapper.find(TOGGLE).exists()).toBe(false)
    })

    it("offers Mark as restocking for an out-of-stock product with no quantity, sending reapprovisionnement", async () => {
      const { wrapper } = await mountDirection(historyOf(0, "rupture"))
      let body: unknown
      stubEndpoint(STATUS_PATH, "PATCH", async event => {
        body = await readBody(event)
        return historyOf(0, "reapprovisionnement")
      })

      expect(wrapper.get(TOGGLE).text()).toContain("Mark as restocking")
      await wrapper.get(TOGGLE).trigger("click")
      await settle()

      expect(body).toEqual({ statut: "reapprovisionnement" })
    })

    it("offers Mark as out of stock while restocking, sending rupture", async () => {
      const { wrapper } = await mountDirection(historyOf(0, "reapprovisionnement"))
      let body: unknown
      stubEndpoint(STATUS_PATH, "PATCH", async event => {
        body = await readBody(event)
        return historyOf(0, "rupture")
      })

      expect(wrapper.get(TOGGLE).text()).toContain("Mark as out of stock")
      await wrapper.get(TOGGLE).trigger("click")
      await settle()

      expect(body).toEqual({ statut: "rupture" })
    })

    it("disables the control while the change is pending", async () => {
      const { wrapper } = await mountDirection(historyOf(0, "rupture"))
      const gate = deferred()
      stubEndpoint(STATUS_PATH, "PATCH", async () => {
        await gate.promise
        return historyOf(0, "reapprovisionnement")
      })

      await wrapper.get(TOGGLE).trigger("click")
      await flushPromises()

      expect(wrapper.get(TOGGLE).attributes("disabled")).toBeDefined()

      gate.open()
      await settle()
    })

    it("shows the server's error text as an alert and reloads the server state when the change is refused", async () => {
      const { wrapper, reads } = await mountDirection(historyOf(0, "rupture"))
      stubEndpoint(STATUS_PATH, "PATCH", () => {
        throw createError({
          statusCode: 409,
          statusMessage: "Conflict",
          data: { message: "Du stock est arrive entre-temps." },
        })
      })
      const readsBefore = reads.reads

      await wrapper.get(TOGGLE).trigger("click")
      await settle()

      const alert = wrapper.get("[data-testid='product-inventory-status-error']")
      expect(alert.attributes("role")).toBe("alert")
      expect(alert.text()).toContain("Du stock est arrive entre-temps.")
      await vi.waitFor(() => expect(reads.reads).toBeGreaterThan(readsBefore))
    })

    it("refreshes the product detail, the product lists, the statistics and this inventory after a change", async () => {
      const { wrapper, reads } = await mountDirection(historyOf(0, "rupture"))
      const queryClient = useNuxtApp().$queryClient
      const others = [
        apiQueryKeys.products.detail(ID),
        apiQueryKeys.products.list({ etat: "actifs" }),
        apiQueryKeys.statistics.overview(),
      ]
      others.forEach(key => queryClient.setQueryData(key, { seeded: true }))
      stubEndpoint(STATUS_PATH, "PATCH", () => historyOf(0, "reapprovisionnement"))
      const readsBefore = reads.reads

      await wrapper.get(TOGGLE).trigger("click")
      await settle()

      others.forEach(key => expect(queryClient.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true))
      expect(reads.reads).toBeGreaterThan(readsBefore)
    })
  })

  describe("following WooCommerce again", () => {
    const FOLLOW = "[data-testid='product-inventory-follow-catalogue']"
    const DIALOG = "follow-catalogue-dialog"
    const AVAILABILITY_PATH = `/api/v1/catalogue/administration/produits/${ID}/disponibilite`

    /** A product nobody counted has no `modifie_le`; `decision` is what staff set in the panel, if anything. */
    function uncounted(decision: "en_stock" | "rupture" | null) {
      return makeHistory({
        inventaire: makeInventory({
          quantite_stock: 0,
          statut_stock: decision ?? "en_stock",
          modifie_le: null,
          disponibilite_forcee: decision,
        }),
        mouvements: [],
      })
    }

    async function mountDirection(history: InventaireHistorique) {
      seedSession(["direction"])
      serveHistory(history)
      return mountBar()
    }

    function captureDecisions() {
      const bodies: unknown[] = []
      stubEndpoint(AVAILABILITY_PATH, "PATCH", async event => {
        bodies.push(await readBody(event))
        return {}
      })
      return bodies
    }

    it("is offered for an uncounted product whose status was set in the panel", async () => {
      const wrapper = await mountDirection(uncounted("rupture"))

      expect(wrapper.get(FOLLOW).text()).toContain("Follow WooCommerce")
    })

    it("is not offered while WooCommerce still decides", async () => {
      const wrapper = await mountDirection(uncounted(null))

      expect(wrapper.find(FOLLOW).exists()).toBe(false)
    })

    it("is not offered for a counted product, which hands the decision back with Track quantity", async () => {
      const counted = makeHistory({
        inventaire: makeInventory({ quantite_stock: 5, disponibilite_forcee: "rupture" }),
      })
      const wrapper = await mountDirection(counted)

      expect(wrapper.find(FOLLOW).exists()).toBe(false)
    })

    it("opens a dialog that names the status being given up and sends nothing yet", async () => {
      const wrapper = await mountDirection(uncounted("rupture"))
      const bodies = captureDecisions()

      await wrapper.get(FOLLOW).trigger("click")
      await settle()

      expect(inBody(DIALOG).text()).toContain("Out of stock")
      expect(bodies).toEqual([])
    })

    it("names In stock when that is the status set in the panel", async () => {
      const wrapper = await mountDirection(uncounted("en_stock"))

      await wrapper.get(FOLLOW).trigger("click")
      await settle()

      expect(inBody(DIALOG).text()).toContain("In stock")
    })

    it("sends nothing and closes when cancelled", async () => {
      const wrapper = await mountDirection(uncounted("rupture"))
      const bodies = captureDecisions()

      await wrapper.get(FOLLOW).trigger("click")
      await settle()
      await inBody("follow-catalogue-cancel").trigger("click")
      await settle()

      expect(bodies).toEqual([])
      expect(existsInBody(DIALOG)).toBe(false)
    })

    it("clears the panel decision on confirm and closes the dialog", async () => {
      const wrapper = await mountDirection(uncounted("rupture"))
      const bodies = captureDecisions()

      await wrapper.get(FOLLOW).trigger("click")
      await settle()
      await inBody("follow-catalogue-confirm").trigger("click")
      await settle()

      expect(bodies).toEqual([{ disponibilite_forcee: null }])
      expect(existsInBody(DIALOG)).toBe(false)
    })

    it("shows the server's message as an alert when the change is refused", async () => {
      const wrapper = await mountDirection(uncounted("rupture"))
      stubEndpoint(AVAILABILITY_PATH, "PATCH", () => {
        throw createError({ statusCode: 403, statusMessage: "Forbidden", data: { message: "Action reservee." } })
      })

      await wrapper.get(FOLLOW).trigger("click")
      await settle()
      await inBody("follow-catalogue-confirm").trigger("click")
      await settle()

      const alert = wrapper.get("[data-testid='product-inventory-status-error']")
      expect(alert.attributes("role")).toBe("alert")
      expect(alert.text()).toContain("Action reservee.")
    })
  })
})
