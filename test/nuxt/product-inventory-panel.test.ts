import type { InventaireHistorique } from "@/types/api/inventaire"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError } from "h3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import ProductsInventoryPanel from "@/components/products/InventoryPanel.vue"
import { clearEndpoints, settle, stubEndpoint } from "./delivery-fixture"
import { inventoryPath, makeHistory, makeInventory, makeMember, makeMovement, seedRoster } from "./inventory-fixture"

const ID = 42
const PATH = inventoryPath(ID)
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
  seedRoster([makeMember()])
}

function serveHistory(history: InventaireHistorique) {
  stubEndpoint(PATH, "GET", () => history)
}

async function mountPanel() {
  const wrapper = await mountSuspended(ProductsInventoryPanel, { props: { productId: ID }, attachTo: document.body })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

function deferred() {
  let open!: () => void
  const promise = new Promise<void>(resolve => {
    open = resolve
  })
  return { promise, open }
}

function cellsOf(row: { findAll: (selector: string) => Array<{ text: () => string }> }) {
  return row.findAll("td").map(cell => cell.text())
}

describe("product inventory panel: movements table", () => {
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

  it("shows the table skeleton while the history is loading, then the rows", async () => {
    seedSession(["direction"])
    const gate = deferred()
    stubEndpoint(PATH, "GET", async () => {
      await gate.promise
      return makeHistory({ mouvements: [makeMovement()] })
    })

    const wrapper = await mountSuspended(ProductsInventoryPanel, { props: { productId: ID }, attachTo: document.body })
    mounted.push(wrapper)
    await flushPromises()

    expect(wrapper.find("[data-testid='taxonomy-flat-table-loading']").exists()).toBe(true)
    expect(wrapper.findAll(ROW)).toHaveLength(0)

    gate.open()
    await settle()

    expect(wrapper.find("[data-testid='taxonomy-flat-table-loading']").exists()).toBe(false)
    expect(wrapper.findAll(ROW)).toHaveLength(1)
  })

  it("renders one table row per movement, newest first as the server returned them", async () => {
    seedSession(["direction"])
    serveHistory(
      makeHistory({
        total: 2,
        mouvements: [
          makeMovement({
            id: "new",
            variation: 5,
            quantite_avant: 37,
            quantite_apres: 42,
            motif: "Livraison fournisseur",
          }),
          makeMovement({
            id: "old",
            type: "correction",
            variation: -2,
            quantite_avant: 39,
            quantite_apres: 37,
            motif: "Casse constatee",
          }),
        ],
      }),
    )

    const wrapper = await mountPanel()
    const rows = wrapper.findAll(ROW)

    expect(rows).toHaveLength(2)
    expect(rows.every(row => row.element.tagName === "TR")).toBe(true)
    const first = cellsOf(rows[0]!)
    const second = cellsOf(rows[1]!)
    expect(first).toHaveLength(7)
    expect(first[1]).toBe("Reception")
    expect(first[2]).toBe("5")
    expect(first[3]).toContain("From 37 to 42")
    expect(first[4]).toBe("Livraison fournisseur")
    expect(second[1]).toBe("Correction")
    expect(second[2]).toBe("-2")
    expect(second[3]).toContain("From 39 to 37")
    expect(second[4]).toBe("Casse constatee")
  })

  it("formats the date of each movement", async () => {
    seedSession(["direction"])
    serveHistory(makeHistory({ mouvements: [makeMovement({ cree_le: "2026-09-29T10:00:00.000Z" })] }))

    const wrapper = await mountPanel()
    const date = cellsOf(wrapper.get(ROW))[0]!

    expect(date).toMatch(/[a-z]{3,}\.?\s+\d{1,2}|\d{1,2}\s+[a-z]{3,}/i)
    expect(date).not.toContain("Invalid")
    expect(date).not.toContain("NaN")
    expect(date).not.toContain("T10:00")
  })

  it("shows an em dash for a missing reason and a missing order reference", async () => {
    seedSession(["direction"])
    serveHistory(makeHistory({ mouvements: [makeMovement({ motif: null, commande_reference: null })] }))

    const cells = cellsOf((await mountPanel()).get(ROW))

    expect(cells[4]).toBe("—")
    expect(cells[6]).toBe("—")
  })

  it("shows the order reference of a movement caused by an order", async () => {
    seedSession(["direction"])
    serveHistory(
      makeHistory({
        mouvements: [
          makeMovement({
            type: "commande_confirmee",
            variation: -2,
            quantite_avant: 5,
            quantite_apres: 3,
            commande_reference: "CMD-2026-0042",
          }),
        ],
      }),
    )

    const cells = cellsOf((await mountPanel()).get(ROW))

    expect(cells[1]).toBe("Order confirmed")
    expect(cells[6]).toBe("CMD-2026-0042")
  })

  describe("balance cell", () => {
    async function balanceCell() {
      seedSession(["direction"])
      serveHistory(
        makeHistory({ mouvements: [makeMovement({ quantite_avant: 37, quantite_apres: 42, variation: 5 })] }),
      )
      return (await mountPanel()).get(`${ROW} [data-testid='product-inventory-balance']`)
    }

    it("shows before and after with an icon instead of an arrow character", async () => {
      const cell = await balanceCell()

      expect(cell.text()).toContain("37")
      expect(cell.text()).toContain("42")
      expect(cell.text()).not.toMatch(/→|->/)
      expect(cell.find("[aria-hidden='true']").exists()).toBe(true)
    })

    it("reads in French when the panel does", async () => {
      const i18n = useNuxtApp().$i18n
      await i18n.loadLocaleMessages("fr")
      i18n.locale.value = "fr"
      await flushPromises()
      try {
        expect((await balanceCell()).element.textContent).toContain("De 37 à 42")
      } finally {
        i18n.locale.value = "en"
      }
    })
  })

  describe("reason cell", () => {
    it("shows the reason and exposes the full text as its title", async () => {
      seedSession(["direction"])
      const motif = "Casse constatee lors de l'inventaire du rayon nord, palette 4"
      serveHistory(makeHistory({ mouvements: [makeMovement({ motif })] }))

      const cell = (await mountPanel()).get(`${ROW} [data-testid='product-inventory-reason']`)

      expect(cell.text()).toBe(motif)
      expect(cell.attributes("title")).toBe(motif)
    })
  })

  describe("actor cell", () => {
    async function actorCell(acteur: { type: "equipe" | "systeme"; id: string | null; role: string | null }) {
      seedSession(["direction"])
      serveHistory(makeHistory({ mouvements: [makeMovement({ acteur })] }))
      const wrapper = await mountPanel()
      return wrapper.get(ROW).findAll("td")[5]!
    }

    it("puts the actor pill for a team member in the By cell", async () => {
      const cell = await actorCell({ type: "equipe", id: "m2", role: "comptoir" })

      expect(cell.find("[data-testid='inventory-actor-pill']").exists()).toBe(true)
      expect(cell.text()).toContain("Awa Ngo")
    })
  })

  describe("states", () => {
    it("shows the empty state, not the table, for a saved product with no movements", async () => {
      seedSession(["direction"])
      serveHistory(
        makeHistory({
          inventaire: makeInventory({ quantite_stock: 0, statut_stock: "rupture", modifie_le: null }),
          mouvements: [],
        }),
      )

      const wrapper = await mountPanel()

      expect(wrapper.get("[data-testid='taxonomy-flat-table-empty']").text()).toContain("No stock movements yet.")
      expect(wrapper.findAll(ROW)).toHaveLength(0)
      expect(wrapper.text()).not.toContain("Showing")
    })

    it("shows an error card scoped to the panel and refetches when Retry is clicked", async () => {
      seedSession(["direction"])
      let failing = true
      stubEndpoint(PATH, "GET", () => {
        if (failing) throw createError({ statusCode: 500, statusMessage: "Server Error" })
        return makeHistory({ mouvements: [makeMovement({ motif: "Apres reprise" })] })
      })

      const wrapper = await mountPanel()

      expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(true)
      expect(wrapper.findAll(ROW)).toHaveLength(0)

      failing = false
      await wrapper.get("[data-testid='api-error-card'] button").trigger("click")
      await settle()

      expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(false)
      expect(wrapper.findAll(ROW)).toHaveLength(1)
    })

    it("shows the movements to a comptoir session and offers no stock write", async () => {
      seedSession(["comptoir"])
      serveHistory(
        makeHistory({
          inventaire: makeInventory({ quantite_stock: 0, statut_stock: "rupture" }),
          mouvements: [makeMovement()],
        }),
      )

      const wrapper = await mountPanel()

      expect(wrapper.findAll(ROW)).toHaveLength(1)
      expect(wrapper.find("[data-testid='product-inventory-adjust']").exists()).toBe(false)
      expect(wrapper.find("[data-testid='product-inventory-restocking-toggle']").exists()).toBe(false)
    })
  })
})
