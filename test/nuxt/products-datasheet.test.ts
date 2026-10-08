import type { Role } from "@/types/session"
import type { H3Event } from "h3"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { DOMWrapper, flushPromises } from "@vue/test-utils"
import { createError, getHeader } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ProductsDatasheetPanel from "@/components/products/DatasheetPanel.vue"

const PRODUCT_ID = 42
const FICHE_PATH = `/api/v1/catalogue/administration/produits/${PRODUCT_ID}/fiche`
const MAX_OCTETS = 25 * 1024 * 1024

const UPLOAD = "[data-testid='products-detail-datasheet-upload']"
const INPUT = "products-detail-datasheet-input"

const stubs: Array<() => void> = []
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

/** Registered here so a failing assertion cannot leave its handler behind for the next test. */
function stub(method: "POST" | "DELETE", handler: (event: H3Event) => unknown) {
  stubs.push(registerEndpoint(FICHE_PATH, { method, handler }))
}

async function mountPanel(
  props: { fichePdf?: string | null; fichePdfNom?: string | null; fichePdfOctets?: number | null } = {},
) {
  const wrapper = await mountSuspended(ProductsDatasheetPanel, {
    props: { productId: PRODUCT_ID, fichePdf: null, fichePdfNom: null, fichePdfOctets: null, ...props },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** The upload form lives in a modal portalled to <body>, outside the mounted wrapper. */
function inDialog(testId: string) {
  const element = document.body.querySelector<HTMLElement>(`[data-testid='${testId}']`)
  expect(element, testId).not.toBeNull()
  return new DOMWrapper(element!)
}

function pdf(name = "manual.pdf") {
  return new File(["%PDF-1.4"], name, { type: "application/pdf" })
}

function choose(file: File) {
  const input = inDialog(INPUT)
  Object.defineProperty(input.element, "files", { value: [file], configurable: true })
  return input.trigger("change")
}

describe("products datasheet card", () => {
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    stubs.splice(0).forEach(cleanup => cleanup())
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("uploads the chosen PDF from a modal and closes it", async () => {
    seedSession(["direction"])
    let received: { name: string | undefined; type: string | undefined } | undefined
    stub("POST", event => {
      received = { name: getHeader(event, "x-nom-fichier"), type: getHeader(event, "content-type") }
      return {}
    })
    const wrapper = await mountPanel()

    expect(document.body.querySelector(`[data-testid='${INPUT}']`)).toBeNull()

    await wrapper.get(UPLOAD).trigger("click")
    await choose(pdf())
    await inDialog("products-detail-datasheet-submit").trigger("click")

    await vi.waitFor(() => expect(received).toEqual({ name: "manual.pdf", type: "application/pdf" }))
    await vi.waitFor(() => expect(wrapper.get(UPLOAD).attributes("aria-expanded")).toBe("false"))
  })

  it("will not submit until a file has been chosen", async () => {
    seedSession(["direction"])
    const wrapper = await mountPanel()

    await wrapper.get(UPLOAD).trigger("click")

    expect(inDialog("products-detail-datasheet-submit").attributes("disabled")).toBeDefined()
  })

  it("refuses a file that is not a PDF without sending anything", async () => {
    seedSession(["direction"])
    let posted = false
    stub("POST", () => {
      posted = true
      return {}
    })
    const wrapper = await mountPanel()

    await wrapper.get(UPLOAD).trigger("click")
    await choose(
      new File(["hello"], "notes.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    )
    await flushPromises()

    expect(inDialog("products-detail-datasheet-upload-error").text()).toContain("PDF only")
    expect(inDialog("products-detail-datasheet-submit").attributes("disabled")).toBeDefined()
    expect(posted).toBe(false)
  })

  it("refuses a PDF over 25 MB without sending anything", async () => {
    seedSession(["direction"])
    let posted = false
    stub("POST", () => {
      posted = true
      return {}
    })
    const wrapper = await mountPanel()
    const heavy = pdf("huge.pdf")
    Object.defineProperty(heavy, "size", { value: MAX_OCTETS + 1 })

    await wrapper.get(UPLOAD).trigger("click")
    await choose(heavy)
    await flushPromises()

    expect(inDialog("products-detail-datasheet-upload-error").text()).toContain("larger than 25 MB")
    expect(posted).toBe(false)
  })

  it("keeps the modal open and says why when the upload fails", async () => {
    seedSession(["direction"])
    stub("POST", () => {
      throw createError({ statusCode: 500, statusMessage: "Server Error" })
    })
    const wrapper = await mountPanel()

    await wrapper.get(UPLOAD).trigger("click")
    await choose(pdf())
    await inDialog("products-detail-datasheet-submit").trigger("click")

    await vi.waitFor(() => expect(inDialog("products-detail-datasheet-upload-error").text()).not.toBe(""))
    expect(wrapper.get(UPLOAD).attributes("aria-expanded")).toBe("true")
  })

  it("offers to replace an existing datasheet, and still removes it from the card", async () => {
    seedSession(["direction"])
    let deleted = false
    stub("DELETE", () => {
      deleted = true
      return {}
    })
    const wrapper = await mountPanel({
      fichePdf: "produits/42/manual.pdf",
      fichePdfNom: "manual.pdf",
      fichePdfOctets: 2048,
    })

    expect(wrapper.get(UPLOAD).text()).toContain("Replace datasheet")
    expect(wrapper.text()).toContain("manual.pdf")

    await wrapper.get("[data-testid='products-detail-datasheet-delete']").trigger("click")

    await vi.waitFor(() => expect(deleted).toBe(true))
  })

  it("offers no upload or removal outside the direction role", async () => {
    seedSession(["comptoir"])
    const wrapper = await mountPanel({
      fichePdf: "produits/42/manual.pdf",
      fichePdfNom: "manual.pdf",
      fichePdfOctets: 2048,
    })

    expect(wrapper.find(UPLOAD).exists()).toBe(false)
    expect(wrapper.find("[data-testid='products-detail-datasheet-delete']").exists()).toBe(false)
  })
})
