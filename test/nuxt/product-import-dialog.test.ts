import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { DOMWrapper } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ProductImportDialog from "@/components/products/ProductImportDialog.vue"
import { seedStockSession } from "./stock-import-fixture"

const calls: Array<{ path: string; fields: Record<string, string>; file?: string }> = []

mockNuxtImport("useApiWrite", () => () => async (path: string, options?: { body?: FormData }) => {
  const fields: Record<string, string> = {}
  let file: string | undefined
  for (const [key, value] of options?.body?.entries() ?? []) {
    if (value instanceof File) file = await value.text()
    else fields[key] = String(value)
  }
  calls.push({ path, fields, file })
  const preview = fields.apercu === "true"
  return {
    apercu: preview,
    total_lignes: 2,
    pretes: preview ? 1 : 0,
    creees: preview ? 0 : 1,
    echouees: 1,
    lignes: [
      {
        ligne: 2,
        nom: "Laptop Pro",
        prix_saisi: "450000",
        slug: "laptop-pro",
        categorie_id: 7,
        statut: preview ? "pret" : "cree",
        produit_id: preview ? null : 1000000001,
        code_erreur: null,
        message: null,
      },
      {
        ligne: 3,
        nom: "Produit incomplet",
        prix_saisi: "",
        slug: "produit-incomplet",
        categorie_id: null,
        statut: "echec",
        produit_id: null,
        code_erreur: "ligne_invalide",
        message: "prix est obligatoire",
      },
    ],
  }
})

async function upload(file: File) {
  const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, "files", { configurable: true, value: [file] })
  await new DOMWrapper(input).trigger("change")
}

function button(name: RegExp) {
  const element = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(node =>
    name.test(node.textContent ?? ""),
  )
  expect(element).toBeDefined()
  return new DOMWrapper(element!)
}

describe("product import dialog", () => {
  beforeEach(() => {
    calls.length = 0
    seedStockSession()
  })
  afterEach(() => {
    document.body.innerHTML = ""
    vi.restoreAllMocks()
  })

  it("is hidden from comptoir users", async () => {
    seedStockSession("comptoir")
    await mountSuspended(ProductImportDialog, { props: { open: true }, attachTo: document.body })
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it("previews the selected CSV, then imports the same file", async () => {
    await mountSuspended(ProductImportDialog, { props: { open: true }, attachTo: document.body })
    await upload(new File(["nom,prix\nLaptop Pro,450000"], "produits.csv", { type: "text/csv" }))
    await button(/prévisualiser|preview/i).trigger("click")
    await vi.waitFor(() => expect(document.body.textContent).toContain("Laptop Pro"))
    expect(calls[0]).toMatchObject({
      path: "/catalogue/administration/produits/import",
      fields: { apercu: "true" },
      file: "nom,prix\nLaptop Pro,450000",
    })
    expect(document.body.textContent).toContain("prix est obligatoire")

    await button(/importer 1 produit|import 1 product/i).trigger("click")
    await vi.waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1]?.fields).toEqual({})
    expect(document.body.textContent).toMatch(/1 produit créé|1 product created/i)
  })

  it("rejects legacy XLS with an actionable message", async () => {
    await mountSuspended(ProductImportDialog, { props: { open: true }, attachTo: document.body })
    await upload(new File(["legacy"], "produits.xls"))
    expect(document.body.querySelector('[role="alert"]')?.textContent).toMatch(/xlsx/i)
    expect(calls).toHaveLength(0)
  })
})
