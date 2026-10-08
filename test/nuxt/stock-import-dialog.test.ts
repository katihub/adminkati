import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { DOMWrapper } from "@vue/test-utils"
import { createError } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StockImportDialog from "@/components/products/StockImportDialog.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { clearEndpoints, settle, stubEndpoint } from "./delivery-fixture"
import { inventoryPath, makeMovement } from "./inventory-fixture"
import {
  type CapturedImport,
  failedLine,
  fakeImportFetch,
  resetImportFetch,
  importLine,
  importResponse,
  previewResponse,
  seedStockSession,
  STOCK_PRODUCTS_PATH,
  stockPage,
  stockProduct,
} from "./stock-import-fixture"

mockNuxtImport("useApiWrite", async original =>
  (await import("./stock-import-fixture")).bridgedApiWrite(original as never),
)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const mounted: Array<{ unmount: () => void }> = []
const calls: CapturedImport[] = []

function button(name: RegExp) {
  const element = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(node =>
    name.test(node.textContent ?? ""),
  )
  expect(element, `button ${name}`).toBeDefined()
  return new DOMWrapper(element!)
}
function hasButton(name: RegExp) {
  return Array.from(document.body.querySelectorAll("button")).some(node => name.test(node.textContent ?? ""))
}
function reasonField() {
  const label = Array.from(document.body.querySelectorAll("label")).find(node =>
    /reason|motif/i.test(node.textContent ?? ""),
  )
  expect(label, "labelled import reason").toBeDefined()
  return new DOMWrapper(document.getElementById(label!.htmlFor) as HTMLInputElement)
}
async function upload(file: File) {
  const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input, "file input").not.toBeNull()
  Object.defineProperty(input, "files", { configurable: true, value: [file] })
  await new DOMWrapper(input!).trigger("change")
  await settle()
}
function csv(text = "product,quantity\nrouter,2", name = "stock.csv") {
  return new File([text], name, { type: "text/csv" })
}
function serve(respond: (call: number) => unknown) {
  fakeImportFetch(respond, calls)
}
async function mount(open = true) {
  const wrapper = await mountSuspended(StockImportDialog, { props: { open }, attachTo: document.body })
  mounted.push(wrapper)
  await settle()
  return wrapper
}
const REVIEW = /^review changes$/i
const APPLY = /^apply \d+ changes?$/i
function serveFlow(preview: unknown = previewResponse(), applied: unknown = importResponse()) {
  serve(call => (calls[call - 1]!.fields.apercu === "true" ? preview : applied))
}
function enabled(name: RegExp) {
  return hasButton(name) && button(name).attributes("disabled") === undefined
}
async function fillAndReview(file = csv()) {
  await reasonField().setValue("Livraison")
  await upload(file)
  await button(REVIEW).trigger("click")
}
async function reviewed(file = csv()) {
  await fillAndReview(file)
  await vi.waitFor(() => expect(hasButton(APPLY)).toBe(true))
}
async function applied(file = csv()) {
  await reviewed(file)
  await button(APPLY).trigger("click")
  await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
}
const previews = () => calls.filter(call => call.fields.apercu === "true")
const applies = () => calls.filter(call => call.fields.apercu !== "true")
function reasonValue() {
  return (reasonField().element as HTMLInputElement).value
}
const text = () => document.body.textContent ?? ""
const heading = () => ({
  title: document.body.querySelector('[data-slot="dialog-title"]')?.textContent?.trim(),
  description: document.body.querySelector('[data-slot="dialog-description"]')?.textContent?.trim(),
})

describe("stock import dialog preview step", () => {
  beforeEach(() => {
    calls.length = 0
    vi.spyOn(console, "warn").mockImplementation(() => {})
    seedStockSession()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
  })
  afterEach(() => {
    resetImportFetch()
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })
  describe("setup", () => {
    it("does not expose a directly mounted dialog to comptoir", async () => {
      seedStockSession("comptoir")
      await mount()
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
      expect(document.body.querySelector('input[type="file"]')).toBeNull()
    })
    it("offers Review changes instead of Import file, disabled until a file and a reason are present", async () => {
      await mount()
      expect(hasButton(/^import file$/i)).toBe(false)
      expect(button(REVIEW).attributes("disabled")).toBeDefined()
      await reasonField().setValue("Livraison")
      expect(button(REVIEW).attributes("disabled")).toBeDefined()
      await upload(csv())
      expect(button(REVIEW).attributes("disabled")).toBeUndefined()
    })
    it("has no Apply button before a preview exists", async () => {
      await mount()
      await reasonField().setValue("Livraison")
      await upload(csv())
      expect(hasButton(/apply/i)).toBe(false)
    })
    it.each(["too large", "wrong type"])("rejects a %s file inline without sending it", async invalid => {
      serveFlow()
      await mount()
      await reasonField().setValue("Livraison")
      const file = csv("product,quantity\n42,2", invalid === "wrong type" ? "stock.html" : "stock.csv")
      if (invalid === "too large") Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 + 1 })
      await upload(file)
      expect(document.body.querySelector('[role="alert"]')?.textContent).toMatch(
        invalid === "too large" ? /5\s*MB/i : /csv|xlsx/i,
      )
      expect(button(REVIEW).attributes("disabled")).toBeDefined()
      expect(calls).toHaveLength(0)
    })
  })
  describe("previewing", () => {
    it("sends exactly one preview request with apercu=true, no key, and never loads the catalogue or posts movements", async () => {
      const catalogue = vi.fn(() => stockPage([stockProduct()]))
      const movement = vi.fn(() => makeMovement())
      stubEndpoint(STOCK_PRODUCTS_PATH, "GET", catalogue)
      stubEndpoint(`${inventoryPath(42)}/mouvements`, "POST", movement)
      serveFlow()
      await mount()
      await new DOMWrapper(document.body.querySelector("select")!).setValue("count")
      await reviewed(csv("product,quantity\nrouter,7"))
      await settle()
      expect(calls).toHaveLength(1)
      expect(calls[0]!.fields).toEqual({ mode: "count", motif: "Livraison", apercu: "true" })
      expect(calls[0]!.file?.text).toBe("product,quantity\nrouter,7")
      expect(calls[0]!.key).toBeUndefined()
      expect(catalogue).not.toHaveBeenCalled()
      expect(movement).not.toHaveBeenCalled()
    })
    it("shows a checking status with no Review button while the preview is pending", async () => {
      serve(() => new Promise(() => {}))
      await mount()
      await fillAndReview()
      await vi.waitFor(() => expect(calls).toHaveLength(1))
      await settle()
      expect(document.body.querySelector('[role="status"]')?.textContent).toMatch(/checking/i)
      expect(hasButton(REVIEW)).toBe(false)
      expect(document.body.querySelector('[data-testid="stock-import-skeleton"] [data-slot="skeleton"]')).not.toBeNull()
      expect(document.body.querySelector('[data-slot="spinner"], .animate-spin')).toBeNull()
    })
    it("closes on Escape while previewing, aborts the request, and reopens on a fresh setup with no failure", async () => {
      serve(() => new Promise(() => {}))
      const wrapper = await mount()
      await fillAndReview()
      await vi.waitFor(() => expect(calls).toHaveLength(1))
      await settle()
      const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
      await new DOMWrapper(dialog!).trigger("keydown", { key: "Escape" })
      await settle()
      expect(wrapper.emitted("update:open")?.some(args => args[0] === false)).toBe(true)
      expect(calls[0]!.signal?.aborted).toBe(true)
      await wrapper.setProps({ open: false })
      await settle()
      await wrapper.setProps({ open: true })
      await settle()
      expect(document.body.querySelector('[role="alert"]')).toBeNull()
      expect(text()).not.toContain("stock.csv")
      expect(button(REVIEW).attributes("disabled")).toBeDefined()
    })
  })
  describe("preview screen", () => {
    const mixed = () =>
      previewResponse([
        importLine({ ligne: 2, produit_nom: "Routeur" }),
        importLine({ ligne: 3, produit_nom: "Chargeur", produit_id: 43 }),
        importLine({ ligne: 4, produit_nom: "Câble", statut: "ignore", variation: 0 }),
        failedLine({ ligne: 5, produit_saisi: "ghost", message: "Produit introuvable : ghost" }),
      ])
    it("retitles the modal as the flow moves: setup, then a review that names the errors", async () => {
      serveFlow(mixed())
      await mount()
      expect(heading()).toEqual({ title: "Adjust stock", description: expect.stringMatching(/review stock changes/i) })

      await reviewed()
      expect(heading()).toEqual({
        title: "Some rows have errors",
        description: expect.stringMatching(/2 to update, 1 with errors that will be skipped/i),
      })
    })
    it("summarises will apply / unchanged / will fail and lists each row with its preview status", async () => {
      serveFlow(mixed())
      await mount()
      await reviewed()
      expect(text()).toMatch(/2\s*will apply/i)
      expect(text()).toMatch(/1\s*unchanged/i)
      expect(text()).toMatch(/1\s*will fail/i)
      for (const label of ["Will apply", "No change", "Will fail"]) expect(text()).toContain(label)
      for (const name of ["Routeur", "Chargeur", "Câble", "ghost", "Line 5"]) expect(text()).toContain(name)
      expect(text()).toContain("Produit introuvable : ghost")
      expect(text()).not.toContain("produit_introuvable")
      expect(text()).not.toMatch(/count mode brings stock/i)
      expect(text()).toContain("Receptions")
      expect(text()).toMatch(/will be skipped|skipped when you apply/i)
      expect(hasButton(/^done$/i)).toBe(false)
    })
    it("explains on the review screen that count mode is recalculated per row, and only in count mode", async () => {
      serveFlow(previewResponse([importLine()], { mode: "count" }))
      await mount()
      await reviewed()
      expect(text()).toMatch(/count mode brings stock to the counted quantity/i)
      expect(text()).toMatch(/\bcount\b/i)
    })
    it("labels the primary action with the number of applicable rows and offers Back and the error file", async () => {
      serveFlow(mixed())
      await mount()
      await reviewed()
      expect(button(/^apply 2 changes$/i).attributes("disabled")).toBeUndefined()
      expect(hasButton(/^back$/i)).toBe(true)
      expect(hasButton(/download error file/i)).toBe(true)
    })
    it("uses the singular for one change, and hides the failure note and error file when no row fails", async () => {
      serveFlow(previewResponse([importLine(), importLine({ ligne: 3, statut: "ignore", variation: 0 })]))
      await mount()
      await reviewed()
      expect(hasButton(/^apply 1 change$/i)).toBe(true)
      expect(text()).not.toMatch(/final figures may differ/i)
      expect(text()).not.toMatch(/will be skipped|skipped when you apply/i)
      expect(hasButton(/download error file/i)).toBe(false)
    })
    it("offers no enabled Apply and says there is nothing to apply when no row can be applied", async () => {
      serveFlow(previewResponse([failedLine(), importLine({ ligne: 3, statut: "ignore", variation: 0 })]))
      await mount()
      await fillAndReview()
      await vi.waitFor(() => expect(text()).toMatch(/nothing to apply/i))
      expect(enabled(/apply/i)).toBe(false)
      expect(hasButton(/^back$/i)).toBe(true)
      expect(applies()).toHaveLength(0)
    })
    it("renders a backend message containing HTML as text, never as DOM", async () => {
      serveFlow(
        previewResponse([
          importLine(),
          failedLine({ message: '<img src=x onerror="alert(1)"> Stock insuffisant', produit_saisi: "<b>x</b>" }),
        ]),
      )
      await mount()
      await reviewed()
      expect(text()).toContain("Stock insuffisant")
      expect(text()).toContain("<b>x</b>")
      expect(document.body.querySelector("img[onerror]")).toBeNull()
      expect(document.body.querySelector("b")).toBeNull()
    })
    it("has written nothing: no invalidation and no apply request until Apply is clicked", async () => {
      serveFlow()
      await mount()
      const spy = vi.spyOn(useNuxtApp().$queryClient, "invalidateQueries")
      await reviewed()
      await settle()
      expect(spy).not.toHaveBeenCalled()
      expect(applies()).toHaveLength(0)
    })
    it("downloads nothing and sends nothing on Back, and keeps the file, mode and reason", async () => {
      serveFlow()
      await mount()
      await new DOMWrapper(document.body.querySelector("select")!).setValue("count")
      await reviewed(csv("product,quantity\nrouter,2", "keep-me.csv"))
      await button(/^back$/i).trigger("click")
      await settle()
      expect(calls).toHaveLength(1)
      expect(text()).toContain("keep-me.csv")
      expect(reasonValue()).toBe("Livraison")
      expect((document.body.querySelector("select") as HTMLSelectElement).value).toBe("count")
      expect(button(REVIEW).attributes("disabled")).toBeUndefined()
      expect(hasButton(/apply/i)).toBe(false)
    })
    it("requires a new Review after Back, and the second preview carries the edited reason", async () => {
      serveFlow()
      await mount()
      await reviewed()
      await button(/^back$/i).trigger("click")
      await settle()
      await reasonField().setValue("Autre motif")
      await button(REVIEW).trigger("click")
      await vi.waitFor(() => expect(hasButton(APPLY)).toBe(true))
      expect(previews()).toHaveLength(2)
      expect(previews()[1]!.fields.motif).toBe("Autre motif")
      expect(applies()).toHaveLength(0)
    })
    it("applies the NEW mode, reason and file when they were changed after Back, never the old ones", async () => {
      serveFlow()
      await mount()
      await reviewed(csv("product,quantity\nold,1", "old.csv"))
      await button(/^back$/i).trigger("click")
      await settle()
      await new DOMWrapper(document.body.querySelector("select")!).setValue("count")
      await reasonField().setValue("Nouveau")
      await upload(csv("product,quantity\nnew,9", "new.csv"))
      await button(REVIEW).trigger("click")
      await vi.waitFor(() => expect(hasButton(APPLY)).toBe(true))
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
      expect(applies()).toHaveLength(1)
      expect(applies()[0]!.fields).toMatchObject({ mode: "count", motif: "Nouveau" })
      expect(applies()[0]!.file).toEqual({ name: "new.csv", text: "product,quantity\nnew,9" })
    })
    it("reopens on a fresh setup with no Apply button after closing from the preview", async () => {
      serveFlow()
      const wrapper = await mount()
      await reviewed()
      await wrapper.setProps({ open: false })
      await settle()
      await wrapper.setProps({ open: true })
      await settle()
      expect(hasButton(/apply/i)).toBe(false)
      expect(text()).not.toContain("stock.csv")
      expect(button(REVIEW).attributes("disabled")).toBeDefined()
    })
  })
  describe("apply", () => {
    it("sends the previewed inputs with a fresh key, shows the importing status, then the result rows from the response", async () => {
      let release!: (value: unknown) => void
      serve(call =>
        calls[call - 1]!.fields.apercu === "true"
          ? previewResponse([importLine()])
          : new Promise(resolve => (release = resolve)),
      )
      await mount()
      await new DOMWrapper(document.body.querySelector("select")!).setValue("count")
      await reviewed(csv("product,quantity\nrouter,7"))
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(applies()).toHaveLength(1))
      await settle()
      expect(document.body.querySelector('[role="status"]')?.textContent).toMatch(
        /Applying the adjustment… Do not close this window\./,
      )
      expect(hasButton(APPLY)).toBe(false)
      expect(document.body.querySelector('[data-testid="stock-import-skeleton"] [data-slot="skeleton"]')).not.toBeNull()
      expect(document.body.querySelector('[data-slot="spinner"], .animate-spin')).toBeNull()
      expect(applies()[0]!.key).toMatch(UUID)
      expect(applies()[0]!.fields).toEqual({ mode: "count", motif: "Livraison" })
      expect(applies()[0]!.file?.text).toBe("product,quantity\nrouter,7")
      release(
        importResponse([
          importLine({ ligne: 2, produit_nom: "Routeur" }),
          importLine({ ligne: 3, produit_nom: "Chargeur", produit_id: 43, stock_apres: 15 }),
        ]),
      )
      await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
      expect(text()).toMatch(/2\s*applied/i)
      expect(text()).toContain("Routeur")
      expect(text()).toContain("Chargeur")
      expect(text()).toContain("Line 3")
    })
    it("blocks Escape while the apply is submitting", async () => {
      serve(call => (calls[call - 1]!.fields.apercu === "true" ? previewResponse() : new Promise(() => {})))
      const wrapper = await mount()
      await reviewed()
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(applies()).toHaveLength(1))
      await settle()
      const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
      await new DOMWrapper(dialog!).trigger("keydown", { key: "Escape" })
      await settle()
      expect(wrapper.emitted("update:open")?.some(args => args[0] === false)).toBeFalsy()
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
      expect(applies()[0]!.signal?.aborted).toBeFalsy()
    })
    it("reports a complete success, offers no error file, and closes on Done", async () => {
      serveFlow(previewResponse(), importResponse([importLine(), importLine({ ligne: 3, produit_nom: "Chargeur" })]))
      const wrapper = await mount()
      await applied()
      expect(text()).toMatch(/2\s*applied/i)
      expect(text()).toMatch(/0\s*failed/i)
      expect(hasButton(/download error file/i)).toBe(false)
      await button(/^done$/i).trigger("click")
      expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false])
    })
    it("shows applied, skipped and failed rows together on a partial success and offers the error file", async () => {
      serveFlow(
        previewResponse(),
        importResponse([
          importLine({ ligne: 2, produit_nom: "Routeur" }),
          importLine({ ligne: 3, produit_nom: "Câble", statut: "ignore", variation: 0 }),
          failedLine({ ligne: 4, produit_saisi: "ghost", message: "Produit introuvable : ghost" }),
        ]),
      )
      await mount()
      await applied()
      expect(text()).toMatch(/1\s*applied/i)
      expect(text()).toMatch(/1\s*skipped/i)
      expect(text()).toMatch(/1\s*failed/i)
      expect(text()).toContain("Routeur")
      expect(text()).toContain("Produit introuvable : ghost")
      expect(hasButton(/download error file/i)).toBe(true)
    })
    it("refreshes products and overview statistics once, counting only the apply", async () => {
      serveFlow()
      await mount()
      const spy = vi.spyOn(useNuxtApp().$queryClient, "invalidateQueries")
      const count = (key: unknown) =>
        spy.mock.calls.filter(([o]) => JSON.stringify((o as { queryKey?: unknown })?.queryKey) === JSON.stringify(key))
          .length
      await reviewed()
      await settle()
      expect(count(apiQueryKeys.products.all)).toBe(0)
      expect(count(apiQueryKeys.statistics.overview())).toBe(0)
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
      expect(count(apiQueryKeys.products.all)).toBe(1)
      expect(count(apiQueryKeys.statistics.overview())).toBe(1)
    })
    it("after a 502 on apply shows an interruption notice, claims no applied rows, and Retry re-sends with the same key", async () => {
      let n = 0
      serve(call => {
        if (calls[call - 1]!.fields.apercu === "true") return previewResponse()
        if (++n === 1) throw createError({ statusCode: 502 })
        return importResponse([importLine()])
      })
      await mount()
      await reviewed()
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^retry$/i)).toBe(true))
      expect(text()).not.toMatch(/\d+\s*applied/i)
      await button(/^retry$/i).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
      expect(applies()).toHaveLength(2)
      expect(applies()[1]!.key).toBe(applies()[0]!.key)
      expect(applies()[1]!.fields).toEqual(applies()[0]!.fields)
      expect(applies()[1]!.file).toEqual(applies()[0]!.file)
      expect(previews()).toHaveLength(1)
    })
    it("on a 429 apply says it was rate limited with nothing applied, and Retry re-sends with the same key", async () => {
      let n = 0
      serve(call => {
        if (calls[call - 1]!.fields.apercu === "true") return previewResponse()
        if (++n === 1) throw createError({ statusCode: 429 })
        return importResponse([importLine()])
      })
      await mount()
      await reviewed()
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^retry$/i)).toBe(true))
      expect(text()).toMatch(/rate limit/i)
      expect(text()).toMatch(/nothing was applied/i)
      expect(text()).not.toMatch(/may have been applied/i)
      await button(/^retry$/i).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
      expect(applies()[1]!.key).toBe(applies()[0]!.key)
      expect(applies()[1]!.fields).toEqual(applies()[0]!.fields)
    })
    it("says the import is still processing on a 409 importation_en_cours and Retry reuses the key", async () => {
      let n = 0
      serve(call => {
        if (calls[call - 1]!.fields.apercu === "true") return previewResponse()
        if (++n === 1) throw createError({ statusCode: 409, data: { code_erreur: "importation_en_cours" } })
        return importResponse()
      })
      await mount()
      await reviewed()
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(text()).toMatch(/still processing/i))
      await button(/^retry$/i).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
      expect(applies()[1]!.key).toBe(applies()[0]!.key)
    })
    it("treats an apply-time 409 key conflict as a rejection with no Retry", async () => {
      serve(call => {
        if (calls[call - 1]!.fields.apercu === "true") return previewResponse()
        throw createError({
          statusCode: 409,
          data: { code_erreur: "cle_idempotence_conflit", message: "Clé déjà utilisée" },
        })
      })
      await mount()
      await reviewed()
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^back$/i)).toBe(true))
      expect(hasButton(/retry/i)).toBe(false)
    })
    it.each([
      ["a 502", () => createError({ statusCode: 502 })],
      [
        "a 409 importation_en_cours",
        () => createError({ statusCode: 409, data: { code_erreur: "importation_en_cours" } }),
      ],
    ])(
      "keeps Retry with the same file, mode, reason and key after closing and reopening following %s on apply",
      async (_n, fail) => {
        let n = 0
        serve(call => {
          if (calls[call - 1]!.fields.apercu === "true") return previewResponse()
          if (++n === 1) throw fail()
          return importResponse()
        })
        const wrapper = await mount()
        await new DOMWrapper(document.body.querySelector("select")!).setValue("count")
        await reviewed(csv("product,quantity\nrouter,9", "again.csv"))
        await button(APPLY).trigger("click")
        await vi.waitFor(() => expect(hasButton(/^retry$/i)).toBe(true))
        await wrapper.setProps({ open: false })
        await settle()
        await wrapper.setProps({ open: true })
        await settle()
        expect(hasButton(/^retry$/i), "Retry visible after reopen").toBe(true)
        await button(/^retry$/i).trigger("click")
        await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
        expect(applies()).toHaveLength(2)
        expect(applies()[1]!.key).toBe(applies()[0]!.key)
        expect(applies()[1]!.file).toEqual(applies()[0]!.file)
        expect(applies()[1]!.fields).toEqual({ mode: "count", motif: "Livraison" })
      },
    )
    it("reopens with a fresh setup and a new key after a successful result", async () => {
      serveFlow()
      const wrapper = await mount()
      await applied()
      await wrapper.setProps({ open: false })
      await settle()
      await wrapper.setProps({ open: true })
      await settle()
      expect(hasButton(/^done$/i)).toBe(false)
      expect(text()).not.toContain("stock.csv")
      expect(button(REVIEW).attributes("disabled")).toBeDefined()
      await applied()
      expect(applies()).toHaveLength(2)
      expect(applies()[1]!.key).not.toBe(applies()[0]!.key)
    })
  })
  describe("preview failures", () => {
    it("shows a translated file-level rejection with Back and no retry, invalidates nothing, and Back keeps the inputs", async () => {
      serve(() => {
        throw createError({
          statusCode: 400,
          data: { code_erreur: "colonnes_manquantes", message: "Colonne obligatoire manquante : quantity" },
        })
      })
      await mount()
      const spy = vi.spyOn(useNuxtApp().$queryClient, "invalidateQueries")
      await fillAndReview(csv("product\nrouter", "keep-me.csv"))
      await vi.waitFor(() => expect(hasButton(/^back$/i)).toBe(true))
      expect(text()).toContain("Colonne obligatoire manquante : quantity")
      expect(text()).not.toContain("colonnes_manquantes")
      expect(hasButton(/retry/i)).toBe(false)
      expect(hasButton(/apply/i)).toBe(false)
      expect(spy).not.toHaveBeenCalled()
      await button(/^back$/i).trigger("click")
      await settle()
      expect(text()).toContain("keep-me.csv")
      expect(reasonValue()).toBe("Livraison")
      expect(button(REVIEW).attributes("disabled")).toBeUndefined()
      expect(calls).toHaveLength(1)
    })
    it("treats a 413 preview as a rejection with no retry", async () => {
      serve(() => {
        throw createError({ statusCode: 413 })
      })
      await mount()
      await fillAndReview()
      await vi.waitFor(() => expect(hasButton(/^back$/i)).toBe(true))
      expect(hasButton(/retry/i)).toBe(false)
    })
    it.each([
      ["a 502", () => createError({ statusCode: 502 })],
      ["a 503", () => createError({ statusCode: 503 })],
      ["a 429", () => createError({ statusCode: 429 })],
      ["a network error", () => new Error("network down")],
    ])(
      "after %s says the preview failed and nothing was written, offers Retry preview and Back, and a retry re-sends a keyless preview",
      async (_n, fail) => {
        serve(call => {
          if (call === 1) throw fail()
          return previewResponse()
        })
        await mount()
        const spy = vi.spyOn(useNuxtApp().$queryClient, "invalidateQueries")
        await fillAndReview()
        await vi.waitFor(() => expect(hasButton(/^retry preview$/i)).toBe(true))
        expect(text()).toMatch(/preview/i)
        expect(text()).not.toMatch(/may have been applied/i)
        expect(hasButton(/^back$/i)).toBe(true)
        expect(spy).not.toHaveBeenCalled()
        await button(/^retry preview$/i).trigger("click")
        await vi.waitFor(() => expect(hasButton(APPLY)).toBe(true))
        expect(calls).toHaveLength(2)
        expect(calls[1]!.fields).toEqual({ mode: "reception", motif: "Livraison", apercu: "true" })
        expect(calls[1]!.key).toBeUndefined()
        expect(applies()).toHaveLength(0)
        expect(spy).not.toHaveBeenCalled()
      },
    )
  })
  describe("stock drift and blank quantities", () => {
    const SWITCH = '[data-testid="stock-import-include-changed"]'
    const drifted = () =>
      importLine({
        statut: "ignore",
        variation: null,
        stock_avant: 9,
        stock_apres: null,
        raison_ignore: "stock_modifie",
        stock_fichier: 12,
        stock_modifie: true,
      })
    const driftPreview = (included: boolean) =>
      previewResponse(included ? [importLine({ stock_modifie: true, stock_fichier: 12 })] : [drifted()], {
        mode: "count",
        stock_modifiees: 1,
        inclure_stock_modifie: included,
      })
    it("tells the user on the setup form that empty quantities are skipped", async () => {
      await mount()
      const hint = document.body.querySelector('[data-testid="stock-import-empty-hint"]')
      expect(hint, "empty quantity hint").not.toBeNull()
      expect(hint!.textContent).toContain("Rows with an empty quantity are skipped.")
    })
    it("re-previews with inclure_stock_modifie when the switch is toggled, shows the new preview, and applies with the field", async () => {
      serve(call => {
        const fields = calls[call - 1]!.fields
        if (fields.apercu !== "true") return importResponse()
        return driftPreview(fields.inclure_stock_modifie === "true")
      })
      await mount()
      await new DOMWrapper(document.body.querySelector("select")!).setValue("count")
      await fillAndReview()
      await vi.waitFor(() => expect(document.body.querySelector(SWITCH)).not.toBeNull())
      expect(text()).toContain("Skipped: stock changed since export")
      await new DOMWrapper(document.body.querySelector(SWITCH)!).trigger("click")
      await vi.waitFor(() => expect(hasButton(APPLY)).toBe(true))
      expect(previews()).toHaveLength(2)
      expect(previews()[0]!.fields.inclure_stock_modifie).toBeUndefined()
      expect(previews()[1]!.fields).toEqual({
        mode: "count",
        motif: "Livraison",
        apercu: "true",
        inclure_stock_modifie: "true",
      })
      expect(document.body.querySelector(SWITCH)?.getAttribute("aria-checked")).toBe("true")
      expect(text()).not.toContain("Skipped: stock changed since export")
      expect(applies()).toHaveLength(0)
      await button(APPLY).trigger("click")
      await vi.waitFor(() => expect(hasButton(/^done$/i)).toBe(true))
      expect(applies()).toHaveLength(1)
      expect(applies()[0]!.fields.inclure_stock_modifie).toBe("true")
      expect(applies()[0]!.key).toMatch(UUID)
    })
    it("renders blank-quantity and zero-delta rows with their own labels", async () => {
      serveFlow(
        previewResponse([
          importLine({
            ligne: 2,
            quantite_saisie: "",
            statut: "ignore",
            variation: null,
            stock_avant: null,
            stock_apres: null,
            raison_ignore: "quantite_vide",
          }),
          importLine({
            ligne: 3,
            statut: "ignore",
            variation: 0,
            stock_avant: 5,
            stock_apres: 5,
            raison_ignore: "aucun_ecart",
          }),
          importLine({ ligne: 4 }),
        ]),
      )
      await mount()
      await reviewed()
      expect(text()).toContain("Quantity left empty, not changed")
      expect(text()).toContain("Stock already at this quantity")
    })
  })
})
