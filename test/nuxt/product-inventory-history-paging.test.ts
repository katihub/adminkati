import type { MouvementStock } from "@/types/api/inventaire"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError, getQuery } from "h3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import ProductsInventoryPanel from "@/components/products/InventoryPanel.vue"
import { clearEndpoints, settle, stubEndpoint } from "./delivery-fixture"
import { inventoryPath, makeHistory, makeMovement, seedRoster } from "./inventory-fixture"

const ID = 42
const PATH = inventoryPath(ID)
const LOAD_MORE = "[data-testid='product-inventory-load-more']"
const MORE_ERROR = "[data-testid='product-inventory-more-error']"
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
  seedRoster()
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

function moves(prefix: string, count: number, overrides: Partial<MouvementStock> = {}) {
  return Array.from({ length: count }, (_, index) =>
    makeMovement({ id: `${prefix}-${index + 1}`, motif: `${prefix} motif ${index + 1}`, ...overrides }),
  )
}

function rowTexts(wrapper: { findAll: (selector: string) => Array<{ text: () => string }> }) {
  return wrapper.findAll(ROW).map(row => row.text())
}

/** Serves each page from a table, records the queries it received, and lets a test fail chosen pages. */
function servePages(pages: MouvementStock[][], options: { fail?: () => boolean; gate?: () => Promise<void> } = {}) {
  const seen: { queries: Array<Record<string, unknown>> } = { queries: [] }
  stubEndpoint(PATH, "GET", async event => {
    const query = getQuery(event)
    seen.queries.push(query)
    const page = Number(query.page ?? 1)
    if (page > 1) {
      await options.gate?.()
      if (options.fail?.()) throw createError({ statusCode: 500, statusMessage: "Server Error" })
    }
    const mouvements = pages[page - 1] ?? []
    return makeHistory({ mouvements, page, taille: 20, pages: pages.length, total: pages.flat().length })
  })
  return seen
}

describe("product inventory history paging", () => {
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

  describe("load more", () => {
    it("offers no load-more control when the whole history fits on one page", async () => {
      seedSession(["direction"])
      servePages([moves("a", 3)])

      const wrapper = await mountPanel()

      expect(wrapper.find(LOAD_MORE).exists()).toBe(false)
    })

    it("counts the loaded movements against the total, before and after loading more", async () => {
      seedSession(["direction"])
      servePages([moves("a", 2), moves("b", 1)])
      const wrapper = await mountPanel()
      expect(wrapper.text()).toContain("Showing 2 of 3 movements.")

      await wrapper.get(LOAD_MORE).trigger("click")
      await settle()

      expect(wrapper.text()).toContain("Showing 3 of 3 movements.")
    })

    it("appends the next page below the loaded rows, asking for page 2 at size 20", async () => {
      seedSession(["direction"])
      const seen = servePages([moves("a", 2), moves("b", 2)])
      const wrapper = await mountPanel()

      await wrapper.get(LOAD_MORE).trigger("click")
      await settle()

      const texts = rowTexts(wrapper)
      expect(texts).toHaveLength(4)
      expect(texts[0]).toContain("a motif 1")
      expect(texts[1]).toContain("a motif 2")
      expect(texts[2]).toContain("b motif 1")
      expect(texts[3]).toContain("b motif 2")
      expect(seen.queries.at(-1)).toMatchObject({ page: "2", taille: "20" })
    })

    it("makes the oldest movement reachable and removes the control after the last page", async () => {
      seedSession(["direction"])
      servePages([
        moves("a", 2),
        [
          makeMovement({
            id: "init",
            type: "initialisation",
            variation: 10,
            quantite_avant: 0,
            quantite_apres: 10,
            motif: "Stock de depart",
          }),
        ],
      ])
      const wrapper = await mountPanel()
      expect(wrapper.text()).not.toContain("Stock de depart")

      await wrapper.get(LOAD_MORE).trigger("click")
      await settle()

      expect(wrapper.text()).toContain("Stock de depart")
      expect(wrapper.find(LOAD_MORE).exists()).toBe(false)
    })

    it("keeps offering the control between pages while more remain", async () => {
      seedSession(["direction"])
      const seen = servePages([moves("a", 1), moves("b", 1), moves("c", 1)])
      const wrapper = await mountPanel()

      await wrapper.get(LOAD_MORE).trigger("click")
      await settle()
      expect(wrapper.find(LOAD_MORE).exists()).toBe(true)

      await wrapper.get(LOAD_MORE).trigger("click")
      await settle()

      expect(rowTexts(wrapper)).toHaveLength(3)
      expect(seen.queries.at(-1)).toMatchObject({ page: "3" })
      expect(wrapper.find(LOAD_MORE).exists()).toBe(false)
    })

    it("never shows the same movement twice when the server repeats an id on the next page", async () => {
      seedSession(["direction"])
      servePages([
        moves("a", 2),
        [makeMovement({ id: "a-2", motif: "a motif 2" }), makeMovement({ id: "b-1", motif: "b motif 1" })],
      ])
      const wrapper = await mountPanel()

      await wrapper.get(LOAD_MORE).trigger("click")
      await settle()

      const texts = rowTexts(wrapper)
      expect(texts).toHaveLength(3)
      expect(texts.filter(text => text.includes("a motif 2"))).toHaveLength(1)
    })

    it("disables the control while the next page is loading", async () => {
      seedSession(["direction"])
      const gate = deferred()
      servePages([moves("a", 1), moves("b", 1)], { gate: () => gate.promise })
      const wrapper = await mountPanel()

      await wrapper.get(LOAD_MORE).trigger("click")
      await flushPromises()

      expect(wrapper.get(LOAD_MORE).attributes("disabled")).toBeDefined()

      gate.open()
      await settle()
      expect(rowTexts(wrapper)).toHaveLength(2)
    })

    it("keeps the loaded rows, reports the failure and lets the operator retry", async () => {
      seedSession(["direction"])
      let failing = true
      servePages([moves("a", 2), moves("b", 1)], { fail: () => failing })
      const wrapper = await mountPanel()

      await wrapper.get(LOAD_MORE).trigger("click")
      await settle()

      expect(rowTexts(wrapper)).toHaveLength(2)
      expect(wrapper.find(MORE_ERROR).exists()).toBe(true)
      expect(wrapper.find(LOAD_MORE).exists()).toBe(true)
      expect(wrapper.get(LOAD_MORE).attributes("disabled")).toBeUndefined()

      failing = false
      await wrapper.get(LOAD_MORE).trigger("click")
      await settle()

      expect(rowTexts(wrapper)).toHaveLength(3)
      expect(wrapper.find(MORE_ERROR).exists()).toBe(false)
      expect(wrapper.find(LOAD_MORE).exists()).toBe(false)
    })
  })
})
