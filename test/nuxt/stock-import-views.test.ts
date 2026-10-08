import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import StockImportPreview from "@/components/products/StockImportPreview.vue"
import StockImportResult from "@/components/products/StockImportResult.vue"
import { failedLine, importLine, importResponse, previewResponse } from "./stock-import-fixture"

const ROW = '[data-testid="stock-import-result-row"]'
const LARGE_RENDER_TIMEOUT = 30_000

function mixedLines() {
  return [
    importLine({ ligne: 2, produit_nom: "Routeur" }),
    importLine({ ligne: 3, produit_nom: "Switch", statut: "ignore", variation: 0, stock_avant: 5, stock_apres: 5 }),
    failedLine({ ligne: 4 }),
  ]
}
function manyLines(count: number) {
  return Array.from({ length: count }, (_, index) => importLine({ ligne: index + 2, produit_nom: `Produit ${index}` }))
}

describe.each([
  {
    name: "result",
    mount: (lignes: ReturnType<typeof mixedLines>) =>
      mountSuspended(StockImportResult, { props: { result: importResponse(lignes) } }),
    labels: ["Applied", "Skipped", "Failed"],
    presentHeaders: ["Balance"],
    absentHeaders: ["Updates"],
  },
  {
    name: "preview",
    mount: (lignes: ReturnType<typeof mixedLines>) =>
      mountSuspended(StockImportPreview, { props: { preview: previewResponse(lignes) } }),
    labels: ["Will apply", "No change", "Will fail"],
    presentHeaders: ["Updates"],
    absentHeaders: ["Balance"],
  },
])("$name view", ({ mount, labels, presentHeaders, absentHeaders }) => {
  it("renders one row per response line with its product name and status label", async () => {
    const wrapper = await mount(mixedLines())
    const rows = wrapper.findAll(ROW)
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain("Routeur")
    expect(rows[1]!.text()).toContain("Switch")
    labels.forEach((label, index) => expect(rows[index]!.text()).toContain(label))
    for (const present of presentHeaders) expect(wrapper.find("thead").text()).toContain(present)
    for (const absent of absentHeaders) expect(wrapper.find("thead").text()).not.toContain(absent)
  })

  it("still renders every row of a 2000-line response", { timeout: LARGE_RENDER_TIMEOUT }, async () => {
    const wrapper = await mount(manyLines(2000))
    expect(wrapper.findAll(ROW)).toHaveLength(2000)
  })
})

const BADGE = '[data-testid="stock-import-changed-badge"]'
const NOTICE = '[data-testid="stock-import-changed-notice"]'
const SWITCH = '[data-testid="stock-import-include-changed"]'
const drift = (overrides: Parameters<typeof importLine>[0] = {}) =>
  importLine({
    ligne: 2,
    statut: "ignore",
    variation: null,
    stock_avant: 9,
    stock_apres: null,
    raison_ignore: "stock_modifie",
    stock_fichier: 12,
    stock_modifie: true,
    ...overrides,
  })
const blank = () =>
  importLine({
    ligne: 3,
    quantite_saisie: "",
    statut: "ignore",
    variation: null,
    stock_avant: null,
    stock_apres: null,
    raison_ignore: "quantite_vide",
  })
const mountPreview = (lignes: ReturnType<typeof importLine>[], overrides: Parameters<typeof previewResponse>[1] = {}) =>
  mountSuspended(StockImportPreview, { props: { preview: previewResponse(lignes, overrides) } })
const mountResult = (lignes: ReturnType<typeof importLine>[], overrides: Parameters<typeof importResponse>[1] = {}) =>
  mountSuspended(StockImportResult, { props: { result: importResponse(lignes, overrides) } })

describe.each([
  {
    name: "preview",
    mount: (l: ReturnType<typeof importLine>[]) => mountPreview(l, { mode: "count" }),
    applied: "Will apply",
  },
  {
    name: "result",
    mount: (l: ReturnType<typeof importLine>[]) => mountResult(l, { mode: "count" }),
    applied: "Applied",
  },
])("$name row reasons", ({ mount, applied }) => {
  it("shows a skipped drift row with its file and live stock, the skip headline and a Stock changed badge", async () => {
    const wrapper = await mount([drift()])
    const text = wrapper.get(ROW).text()
    expect(text).toContain("Exported at 12, now 9")
    expect(text).toContain("Skipped: stock changed since export")
    expect(text).toContain("Stock changed")
  })
  it("shows an included drift row as Stock changed while keeping its normal status and the export line", async () => {
    const wrapper = await mount([
      importLine({ stock_modifie: true, stock_fichier: 12, stock_avant: 9, stock_apres: 14, variation: 5 }),
    ])
    const text = wrapper.get(ROW).text()
    expect(text).toContain("Stock changed")
    expect(text).toContain(applied)
    expect(text).toContain("Exported at 12, now 9")
    expect(text).not.toContain("Skipped: stock changed since export")
  })
  it("labels a blank-quantity row as left empty, not as already at the quantity", async () => {
    const text = (await mount([blank()])).get(ROW).text()
    expect(text).toContain("Quantity left empty, not changed")
    expect(text).not.toContain("Stock already at this quantity")
  })
  it.each(["aucun_ecart", null] as const)("keeps Stock already at this quantity for raison_ignore %s", async raison => {
    const text = (
      await mount([
        importLine({ statut: "ignore", variation: 0, stock_avant: 5, stock_apres: 5, raison_ignore: raison }),
      ])
    )
      .get(ROW)
      .text()
    expect(text).toContain("Stock already at this quantity")
    expect(text).not.toContain("Quantity left empty")
  })
  it("shows no export line and no Stock changed badge on a normal row", async () => {
    const text = (await mount([importLine()])).get(ROW).text()
    expect(text).not.toContain("Exported at")
    expect(text).not.toContain("Stock changed")
  })
  it("explains a stock_reference_invalide failure", async () => {
    const text = (await mount([failedLine({ code_erreur: "stock_reference_invalide", message: "x" })])).get(ROW).text()
    expect(text).toContain("Invalid current_stock value")
  })
})

describe("preview stock changed controls", () => {
  const driftPreview = (overrides: Parameters<typeof previewResponse>[1] = {}) =>
    mountPreview([drift(), importLine({ ligne: 4 })], { mode: "count", stock_modifiees: 1, ...overrides })

  it("shows the badge, notice and switch when rows changed since export", async () => {
    const wrapper = await driftPreview({ stock_modifiees: 3 })
    expect(wrapper.get(BADGE).text()).toContain("3 stock changed since export")
    expect(wrapper.get(NOTICE).text()).toContain("Stock changed on these rows after the file was exported.")
    expect(wrapper.get(NOTICE).attributes("role")).toBe("status")
    const text = wrapper.text()
    expect(text).toContain("Apply these rows anyway")
    expect(text).toContain("Their quantity replaces the current stock, cancelling the movements made since export.")
    expect(wrapper.get(SWITCH).attributes("role")).toBe("switch")
    expect(wrapper.get(SWITCH).attributes("aria-checked")).toBe("false")
  })
  it("reflects inclure_stock_modifie on the switch and keeps it visible so it can be turned off", async () => {
    const wrapper = await driftPreview({ inclure_stock_modifie: true })
    expect(wrapper.get(SWITCH).attributes("aria-checked")).toBe("true")
  })
  it("emits includeChanged with the new value when the switch is clicked", async () => {
    const off = await driftPreview()
    await off.get(SWITCH).trigger("click")
    expect(off.emitted("includeChanged")).toEqual([[true]])
    const on = await driftPreview({ inclure_stock_modifie: true })
    await on.get(SWITCH).trigger("click")
    expect(on.emitted("includeChanged")).toEqual([[false]])
  })
  it.each([
    ["reception mode, even with stock_modifiees", { mode: "reception" as const, stock_modifiees: 2 }],
    ["no changed rows", { mode: "count" as const, stock_modifiees: 0 }],
  ])("renders no badge, notice or switch for %s", async (_name, overrides) => {
    const wrapper = await mountPreview([importLine()], overrides)
    expect(wrapper.find(BADGE).exists()).toBe(false)
    expect(wrapper.find(NOTICE).exists()).toBe(false)
    expect(wrapper.find(SWITCH).exists()).toBe(false)
  })
  it("keeps the switch and says nothing to apply when every row is excluded, with no Apply button", async () => {
    const wrapper = await mountPreview([drift()], { mode: "count", stock_modifiees: 1 })
    expect(wrapper.text()).toContain("Nothing to apply")
    expect(wrapper.findAll("button").some(b => /^apply/i.test(b.text()))).toBe(false)
    expect(wrapper.find(SWITCH).exists()).toBe(true)
  })
})

describe("result stock changed summary", () => {
  it("shows the badge and the skipped notice when changed rows were not included", async () => {
    const wrapper = await mountResult([drift()], { mode: "count", stock_modifiees: 2 })
    expect(wrapper.get(BADGE).text()).toContain("2 stock changed since export")
    expect(wrapper.get(NOTICE).text()).toContain(
      "Rows whose stock changed since export were skipped. Export again to count them.",
    )
    expect(wrapper.find(SWITCH).exists()).toBe(false)
  })
  it("shows the badge but not the skipped notice when changed rows were included", async () => {
    const wrapper = await mountResult([importLine({ stock_modifie: true, stock_fichier: 12 })], {
      mode: "count",
      stock_modifiees: 1,
      inclure_stock_modifie: true,
    })
    expect(wrapper.get(BADGE).text()).toContain("1 stock changed since export")
    expect(wrapper.find(NOTICE).exists()).toBe(false)
  })
  it("shows neither when no row changed", async () => {
    const wrapper = await mountResult([importLine()], { mode: "count", stock_modifiees: 0 })
    expect(wrapper.find(BADGE).exists()).toBe(false)
    expect(wrapper.find(NOTICE).exists()).toBe(false)
  })
})
