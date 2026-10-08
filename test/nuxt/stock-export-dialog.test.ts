import type { ProductListQuery } from "@/types/api/produits"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, setResponseStatus } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StockExportDialog from "@/components/products/StockExportDialog.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { seedStockSession } from "./stock-import-fixture"

const PATH = "/api/v1/catalogue/administration/produits/inventaire/export"
const CEILING_MESSAGE = "More than 10,000 products match. Narrow the filters to export."
const queries: Record<string, unknown>[] = []
let failWith: { status: number; json: unknown } | null = null
let hold: Promise<void> | null = null
let stopEndpoint: (() => void) | undefined
const mounted: Array<{ unmount: () => void }> = []
let originalCreate: typeof URL.createObjectURL
let originalRevoke: typeof URL.revokeObjectURL

function serve() {
  stopEndpoint = registerEndpoint(PATH, {
    method: "GET",
    handler: async event => {
      queries.push(getQuery(event))
      if (hold) await hold
      if (failWith) {
        setResponseStatus(event, failWith.status)
        return failWith.json
      }
      return new Blob(["product,quantity"], { type: "text/csv" })
    },
  })
}
async function mountDialog(props: { filters?: ProductListQuery; total?: number | null; open?: boolean } = {}) {
  const wrapper = await mountSuspended(StockExportDialog, {
    props: { open: true, filters: { page: 1, taille: 50 }, total: null, ...props },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}
const byId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid='${id}']`)
const confirm = () => byId("stock-export-confirm") as HTMLButtonElement
function text(id: string) {
  return byId(id)?.textContent?.replace(/\s+/g, " ").trim() ?? ""
}
function choose(id: string, value: string) {
  const select = byId(id) as HTMLSelectElement
  select.value = value
  select.dispatchEvent(new Event("change", { bubbles: true }))
}
function cancelButton() {
  return Array.from(byId("stock-export-dialog")!.querySelectorAll("button")).find(
    button => button.textContent?.trim() === "Cancel",
  )
}
async function settleDialog() {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 50))
  await flushPromises()
}

describe("products stock export dialog", () => {
  beforeEach(() => {
    queries.length = 0
    failWith = null
    hold = null
    seedStockSession("direction")
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.taxonomy.all, { rayons: [], categories: [], marques: [] })
    originalCreate = URL.createObjectURL
    originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => "blob:mock-url")
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    serve()
  })
  afterEach(() => {
    stopEndpoint?.()
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
    document.body.innerHTML = ""
    useNuxtApp().$queryClient.clear()
  })

  describe("access", () => {
    it("renders for direction with the title and an Export button", async () => {
      await mountDialog()
      expect(text("stock-export-dialog")).toContain("Export stock file")
      expect(text("stock-export-dialog")).not.toContain(
        "Download the products matching your current filters as a file you can fill in and import with Adjust stock.",
      )
      expect(confirm().textContent?.trim()).toBe("Export")
    })

    it("renders nothing for comptoir, trigger included", async () => {
      seedStockSession("comptoir")
      const wrapper = await mountSuspended(StockExportDialog, {
        props: { open: true, filters: {}, total: 5 },
        slots: { trigger: '<button data-testid="export-trigger">Export</button>' },
        attachTo: document.body,
      })
      mounted.push(wrapper)
      await flushPromises()
      expect(byId("stock-export-dialog")).toBeNull()
      expect(byId("export-trigger")).toBeNull()
    })

    it("renders the trigger slot for direction", async () => {
      const wrapper = await mountSuspended(StockExportDialog, {
        props: { open: false, filters: {}, total: 5 },
        slots: { trigger: '<button data-testid="export-trigger">Export</button>' },
        attachTo: document.body,
      })
      mounted.push(wrapper)
      await flushPromises()
      expect(byId("export-trigger")).not.toBeNull()
    })
  })

  describe("choices", () => {
    it("defaults to a count in xlsx", async () => {
      await mountDialog()
      expect((byId("stock-export-mode") as HTMLSelectElement).value).toBe("count")
      expect((byId("stock-export-format") as HTMLSelectElement).value).toBe("xlsx")
    })

    it("shows the stale-count warning only in count mode", async () => {
      await mountDialog()
      expect(text("stock-export-notice-stale")).toBe(
        "Import soon after exporting: sales made in between would be undone by a count.",
      )
      choose("stock-export-mode", "reception")
      await flushPromises()
      expect(byId("stock-export-notice-stale")).toBeNull()
    })
  })

  describe("filter summary", () => {
    it("says All products when no filter applies", async () => {
      await mountDialog({ filters: { page: 1, taille: 50 } })
      expect(text("stock-export-filters")).toContain("All products")
    })

    it("lists the active filters", async () => {
      await mountDialog({ filters: { q: "câble", etat: "actifs", page: 2, taille: 50 } })
      const line = text("stock-export-filters")
      expect(line).toContain("Search: câble")
      expect(line).toContain("State: Active")
      expect(line).not.toContain("All products")
    })
  })

  describe("volume", () => {
    it("shows a singular count", async () => {
      await mountDialog({ total: 1 })
      expect(text("stock-export-count")).toContain("1 product")
      expect(text("stock-export-count")).not.toContain("1 products")
    })

    it("shows a grouped plural count", async () => {
      await mountDialog({ total: 1234 })
      expect(text("stock-export-count")).toMatch(/1[,\s  .]?234 products/)
    })

    it("shows no count and keeps Export enabled while the total is unknown", async () => {
      await mountDialog({ total: null })
      expect(byId("stock-export-count")).toBeNull()
      expect(confirm().disabled).toBe(false)
    })

    it("blocks the export of an empty result with an explanation", async () => {
      await mountDialog({ total: 0 })
      expect(text("stock-export-notice-empty")).toBe("No products match the current filters.")
      expect(confirm().disabled).toBe(true)
    })

    it.each([1, 2000])("shows neither split nor blocked notice for %i products", async total => {
      await mountDialog({ total })
      expect(byId("stock-export-notice-split")).toBeNull()
      expect(byId("stock-export-notice-blocked")).toBeNull()
      expect(byId("stock-export-notice-empty")).toBeNull()
      expect(confirm().disabled).toBe(false)
    })

    it.each([2001, 10000])("warns to split the file for %i products but allows it", async total => {
      await mountDialog({ total })
      expect(text("stock-export-notice-split")).toContain("split the file before importing")
      expect(byId("stock-export-notice-blocked")).toBeNull()
      expect(confirm().disabled).toBe(false)
    })

    it("blocks an export above the ceiling", async () => {
      await mountDialog({ total: 10001 })
      expect(text("stock-export-notice-blocked")).toBe(CEILING_MESSAGE)
      expect(byId("stock-export-notice-split")).toBeNull()
      expect(confirm().disabled).toBe(true)
    })

    it("does not request a blocked export when Export is pressed", async () => {
      await mountDialog({ total: 10001 })
      confirm().click()
      await settleDialog()
      expect(queries).toHaveLength(0)
    })

    it.each(["tous", "retires"] as const)(
      "warns that withdrawn products are exported empty for etat %s",
      async etat => {
        await mountDialog({ filters: { etat } })
        expect(text("stock-export-notice-withdrawn")).toBe(
          "Withdrawn products are included with an empty quantity; the import skips them.",
        )
      },
    )

    it.each(["actifs", undefined] as const)("shows no withdrawn warning for etat %s", async etat => {
      await mountDialog({ filters: { etat } })
      expect(byId("stock-export-notice-withdrawn")).toBeNull()
    })
  })

  describe("exporting", () => {
    it("sends one GET with the filters minus page and size plus the default mode and format", async () => {
      await mountDialog({ filters: { q: "câble", stock: "rupture", page: 3, taille: 50 }, total: 4 })
      confirm().click()
      await vi.waitFor(() => expect(queries).toHaveLength(1))
      await settleDialog()
      expect(queries).toEqual([{ q: "câble", stock: "rupture", mode: "count", format: "xlsx" }])
    })

    it("sends the chosen mode and format", async () => {
      await mountDialog({ filters: { etat: "actifs" } })
      choose("stock-export-mode", "reception")
      choose("stock-export-format", "csv")
      await flushPromises()
      confirm().click()
      await vi.waitFor(() => expect(queries).toHaveLength(1))
      expect(queries[0]).toEqual({ etat: "actifs", mode: "reception", format: "csv" })
    })

    it("closes the dialog once the file is saved", async () => {
      const wrapper = await mountDialog({ total: 3 })
      confirm().click()
      await vi.waitFor(() => expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false]))
      expect(queries).toHaveLength(1)
    })

    it("is busy and locked while the request is in flight, and cannot be cancelled", async () => {
      let release!: () => void
      hold = new Promise<void>(resolve => (release = resolve))
      const wrapper = await mountDialog({ total: 3 })
      confirm().click()
      await vi.waitFor(() => expect(queries).toHaveLength(1))
      await settleDialog()

      expect(confirm().disabled).toBe(true)
      expect(confirm().getAttribute("aria-busy")).toBe("true")
      expect(byId("stock-export-dialog")?.querySelector('[data-slot="dialog-title"]')?.textContent?.trim()).toBe(
        "Preparing your export",
      )
      expect(byId("stock-export-skeleton")?.querySelector('[data-slot="skeleton"]')).not.toBeNull()
      expect(byId("stock-export-skeleton")?.querySelector('[role="status"]')?.textContent).toMatch(/preparing/i)
      expect(byId("stock-export-dialog")?.querySelector('[data-slot="spinner"], .animate-spin')).toBeNull()
      expect((byId("stock-export-mode") as HTMLSelectElement).disabled).toBe(true)
      expect((byId("stock-export-format") as HTMLSelectElement).disabled).toBe(true)

      cancelButton()?.click()
      await settleDialog()
      expect(wrapper.emitted("update:open")?.some(args => args[0] === false) ?? false).toBe(false)
      expect(byId("stock-export-dialog")).not.toBeNull()

      confirm().click()
      await settleDialog()
      expect(queries).toHaveLength(1)

      release()
      await vi.waitFor(() => expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false]))
    })
  })

  describe("failure", () => {
    const ceiling = {
      statusCode: 400,
      error: "Bad Request",
      message: "Plus de 10000 produits correspondent : affinez les filtres.",
      code_erreur: "export_trop_volumineux",
      maximum: 10000,
    }

    it("shows the ceiling message when the list grew past it, stays open, and can be retried", async () => {
      failWith = { status: 400, json: ceiling }
      const wrapper = await mountDialog({ total: 500 })
      confirm().click()
      await vi.waitFor(() => expect(text("stock-export-error")).toBe(CEILING_MESSAGE))

      expect(byId("stock-export-error")!.getAttribute("role")).toBe("alert")
      expect(byId("stock-export-dialog")).not.toBeNull()
      expect(wrapper.emitted("update:open")?.some(args => args[0] === false) ?? false).toBe(false)
      expect(confirm().disabled).toBe(false)

      failWith = null
      confirm().click()
      await vi.waitFor(() => expect(queries).toHaveLength(2))
      await vi.waitFor(() => expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false]))
    })

    it("shows an error and stays open on a server error, without retrying on its own", async () => {
      failWith = { status: 500, json: {} }
      const wrapper = await mountDialog({ total: 500 })
      confirm().click()
      await vi.waitFor(() => expect(text("stock-export-error")).not.toBe(""))
      await settleDialog()

      expect(queries).toHaveLength(1)
      expect(byId("stock-export-dialog")).not.toBeNull()
      expect(wrapper.emitted("update:open")?.some(args => args[0] === false) ?? false).toBe(false)
    })

    it("clears the error when the dialog is reopened", async () => {
      failWith = { status: 500, json: {} }
      const wrapper = await mountDialog({ total: 500 })
      confirm().click()
      await vi.waitFor(() => expect(byId("stock-export-error")).not.toBeNull())

      await wrapper.setProps({ open: false })
      await settleDialog()
      await wrapper.setProps({ open: true })
      await settleDialog()

      expect(byId("stock-export-dialog")).not.toBeNull()
      expect(byId("stock-export-error")).toBeNull()
    })
  })
})
