import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, setResponseStatus } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import OrdersExportDialog from "@/components/orders/ExportDialog.vue"

const requestedQueries: Record<string, unknown>[] = []
let failExport: { status: number; message: string } | null = null

registerEndpoint("/api/v1/commandes/NT-000042/export", {
  method: "GET",
  handler: event => {
    requestedQueries.push(getQuery(event))
    if (failExport) {
      // The backend is not built yet — a failure body is exactly what this dialog must survive.
      // Returning the body with a status matches the Nest error shape ({ statusCode, message }).
      setResponseStatus(event, failExport.status)
      return { message: failExport.message }
    }
    return new Blob(["%PDF-1.4"], { type: "application/pdf" })
  },
})

/**
 * The dialog downloads through an object URL. `URL.createObjectURL` is stubbed the same way
 * the banner tests stub it (`banner-artwork-field.test.ts`): happy-dom does not polyfill it.
 */
let originalCreateObjectURL: typeof URL.createObjectURL

function mountDialog() {
  return mountSuspended(OrdersExportDialog, {
    props: { reference: "NT-000042", open: true },
    attachTo: document.body,
  })
}

/**
 * reka-ui: trigger opens on `pointerdown`, item commits on `pointerup` — see
 *  `products-category-picker.test.ts`. Content is teleported to `document.body`.
 */
function openSelect(testId: string) {
  document.body
    .querySelector(`[data-testid='${testId}']`)!
    .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }))
}

function pickOption(label: string) {
  const item = Array.from(document.body.querySelectorAll("[data-slot='select-item']")).find(
    element => element.textContent?.trim() === label,
  )
  if (!item) throw new Error(`no select item found for label "${label}"`)
  item.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }))
}

function confirmButton() {
  return document.body.querySelector<HTMLButtonElement>("[data-testid='orders-export-confirm']")!
}

describe("orders export dialog", () => {
  beforeEach(() => {
    requestedQueries.length = 0
    failExport = null
    originalCreateObjectURL = URL.createObjectURL
    URL.createObjectURL = vi.fn(() => "blob:mock-url")
    URL.revokeObjectURL = vi.fn()
    // happy-dom would try to navigate to the blob URL; the download click is asserted instead.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  it("offers the three documents and requests the default one in the UI's language", async () => {
    const wrapper = await mountDialog()
    await flushPromises()

    openSelect("orders-export-document")
    await flushPromises()
    const labels = Array.from(document.body.querySelectorAll("[data-slot='select-item']")).map(element =>
      element.textContent?.trim(),
    )
    expect(labels).toEqual(["Order summary", "Customer invoice", "Packing slip"])
    // Leave the default document selected; the list above was only opened to be read.
    pickOption("Order summary")
    await flushPromises()

    confirmButton().click()
    await vi.waitFor(() => expect(requestedQueries).toHaveLength(1))

    expect(requestedQueries[0]).toEqual({ document: "recapitulatif", locale: "en" })

    wrapper.unmount()
  })

  it("exports the picked document in the picked language, downloaded under the contract filename", async () => {
    const clickSpy = vi.mocked(HTMLAnchorElement.prototype.click)
    const wrapper = await mountDialog()
    await flushPromises()

    openSelect("orders-export-document")
    await flushPromises()
    pickOption("Packing slip")
    await flushPromises()
    openSelect("orders-export-language")
    await flushPromises()
    pickOption("Français")
    await flushPromises()

    confirmButton().click()
    await vi.waitFor(() => expect(requestedQueries).toHaveLength(1))
    await flushPromises()

    expect(requestedQueries[0]).toEqual({ document: "bon-preparation", locale: "fr" })
    expect(clickSpy).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(document.body.querySelector("[data-testid='orders-export-dialog']")).toBeNull())

    wrapper.unmount()
  })

  it("keeps the dialog open with the backend's message when the export fails", async () => {
    failExport = { status: 404, message: "Export indisponible pour le moment." }
    const wrapper = await mountDialog()
    await flushPromises()

    confirmButton().click()
    // The error body is a Blob (`responseType: "blob"`), read off the microtask queue.
    await vi.waitFor(() => {
      const alert = document.body.querySelector("[data-testid='orders-export-error']")
      expect(alert?.textContent).toContain("Export indisponible pour le moment.")
    })

    expect(requestedQueries).toHaveLength(1)
    expect(document.body.querySelector("[data-testid='orders-export-dialog']")).not.toBeNull()

    wrapper.unmount()
  })
})
