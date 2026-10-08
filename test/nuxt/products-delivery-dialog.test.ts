import type { DelaiLivraison } from "@/types/api/delais-livraison"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { createError, readBody } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import DeliveryIntervalDialog from "@/components/products/DeliveryIntervalDialog.vue"
import {
  clearEndpoints,
  DELIVERY_PATH,
  deliveryOptions,
  existsInBody,
  fillDialog,
  inBody,
  settle,
  stubEndpoint,
  WORKING_DAYS_OPTION,
} from "./delivery-fixture"

const RANGE_OPTION: DelaiLivraison = {
  id: 7,
  min_valeur: 2,
  max_valeur: 3,
  unite: "jours",
  est_defaut: false,
  actif: true,
  utilise_par: 0,
}
const LOCKED_RANGE_OPTION: DelaiLivraison = { ...RANGE_OPTION, id: 8, utilise_par: 2 }

const mounted: Array<{ unmount: () => void }> = []

async function mount(interval: DelaiLivraison | null = null) {
  const wrapper = await mountSuspended(DeliveryIntervalDialog, {
    props: { open: true, interval },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

function serveList() {
  stubEndpoint(DELIVERY_PATH, "GET", () => deliveryOptions())
  useNuxtApp().$queryClient.setQueryData(["v1", "catalogue", "administration", "delais-livraison"], deliveryOptions())
}

function field(testId: string) {
  return inBody(testId).element as HTMLInputElement | HTMLSelectElement
}

/** A POST handler that records whether it was ever reached and what it received. */
function serveCreate(response: DelaiLivraison = { ...WORKING_DAYS_OPTION, min_valeur: 7, id: 99 }) {
  const seen: { calls: number; body?: unknown } = { calls: 0 }
  stubEndpoint(DELIVERY_PATH, "POST", async event => {
    seen.calls += 1
    seen.body = await readBody(event)
    return response
  })
  return seen
}

describe("products delivery interval dialog", () => {
  beforeEach(() =>
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } }),
  )
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("creates a single-value option with numeric fields, emits saved and closes", async () => {
    serveList()
    const seen = serveCreate()
    const wrapper = await mount()

    await fillDialog({ unit: "jours_ouvres", min: 7 })
    await inBody("delivery-dialog-save").trigger("click")

    await vi.waitFor(() => expect(seen.body).toEqual({ min_valeur: 7, max_valeur: null, unite: "jours_ouvres" }))
    await vi.waitFor(() =>
      expect(wrapper.emitted("saved")?.at(-1)).toEqual([{ ...WORKING_DAYS_OPTION, min_valeur: 7, id: 99 }]),
    )
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false])
  })

  it("creates a range option after switching to range mode", async () => {
    serveList()
    const seen = serveCreate()
    await mount()

    expect(existsInBody("delivery-dialog-max")).toBe(false)
    await fillDialog({ unit: "semaines", min: 2, max: 3 })
    await inBody("delivery-dialog-save").trigger("click")

    await vi.waitFor(() => expect(seen.body).toEqual({ min_valeur: 2, max_valeur: 3, unite: "semaines" }))
  })

  it("previews the localized label live while typing", async () => {
    serveList()
    await mount()

    await fillDialog({ unit: "jours_ouvres", min: 5 })
    await settle()

    const preview = inBody("delivery-dialog-preview").text()
    expect(preview).toContain("5")
    expect(preview).toMatch(/working/i)
  })

  it("exposes the mode toggles as pressed state", async () => {
    serveList()
    await mount()

    expect(inBody("delivery-dialog-mode-single").attributes("aria-pressed")).toBe("true")
    expect(inBody("delivery-dialog-mode-range").attributes("aria-pressed")).toBe("false")
    await inBody("delivery-dialog-mode-range").trigger("click")
    expect(inBody("delivery-dialog-mode-range").attributes("aria-pressed")).toBe("true")
    expect(inBody("delivery-dialog-mode-single").attributes("aria-pressed")).toBe("false")
  })

  it.each([
    ["a minimum of zero", { unit: "jours", min: 0 }],
    ["an empty minimum", { unit: "jours", min: "" }],
    ["a range whose maximum is below its minimum", { unit: "jours", min: 5, max: 3 }],
  ])("refuses %s and sends nothing", async (_label, fields) => {
    serveList()
    const seen = serveCreate()
    await mount()

    await fillDialog(fields)
    await inBody("delivery-dialog-save").trigger("click")
    await settle()

    expect(inBody("delivery-dialog-error").text()).not.toBe("")
    expect(seen.calls).toBe(0)
  })

  it.each([
    ["an active option", { unit: "jours_ouvres", min: 5 }],
    ["an archived option", { unit: "mois", min: 1 }],
  ])("refuses a value equal to %s and sends nothing", async (_label, fields) => {
    serveList()
    const seen = serveCreate()
    await mount()

    await fillDialog(fields)
    await inBody("delivery-dialog-save").trigger("click")
    await settle()

    expect(inBody("delivery-dialog-error").text()).not.toBe("")
    expect(seen.calls).toBe(0)
  })

  it("shows the backend's 409 message and stays open", async () => {
    serveList()
    stubEndpoint(DELIVERY_PATH, "POST", () => {
      throw createError({ statusCode: 409, data: { message: "Ce delai existe deja." } })
    })
    const wrapper = await mount()

    await fillDialog({ unit: "jours", min: 9 })
    await inBody("delivery-dialog-save").trigger("click")

    await vi.waitFor(() => expect(inBody("delivery-dialog-error").text()).toContain("Ce delai existe deja."))
    expect(inBody("delivery-dialog-error").attributes("role")).toBe("alert")
    expect(wrapper.emitted("update:open")?.some(args => args[0] === false)).toBeFalsy()
    expect(wrapper.emitted("saved")).toBeUndefined()
  })

  it("prefills a single-value option in edit mode", async () => {
    serveList()
    await mount(WORKING_DAYS_OPTION)

    expect(field("delivery-dialog-unit").value).toBe("jours_ouvres")
    expect(field("delivery-dialog-min").value).toBe("5")
    expect(inBody("delivery-dialog-mode-single").attributes("aria-pressed")).toBe("true")
    expect(existsInBody("delivery-dialog-max")).toBe(false)
  })

  it("prefills a range option in range mode", async () => {
    serveList()
    await mount(RANGE_OPTION)

    expect(field("delivery-dialog-unit").value).toBe("jours")
    expect(field("delivery-dialog-min").value).toBe("2")
    expect(field("delivery-dialog-max").value).toBe("3")
    expect(inBody("delivery-dialog-mode-range").attributes("aria-pressed")).toBe("true")
  })

  it("pATCHes only the changed fields to the option's URL when an edit is saved", async () => {
    serveList()
    let body: unknown
    stubEndpoint(`${DELIVERY_PATH}/${RANGE_OPTION.id}`, "PATCH", async event => {
      body = await readBody(event)
      return { ...RANGE_OPTION, min_valeur: 1 }
    })
    const wrapper = await mount(RANGE_OPTION)

    await fillDialog({ min: 1 })
    await inBody("delivery-dialog-save").trigger("click")

    await vi.waitFor(() => expect(body).toEqual({ min_valeur: 1 }))
    await vi.waitFor(() => expect(wrapper.emitted("saved")).toBeDefined())
  })

  it("explains and locks the value fields of an option products already use", async () => {
    serveList()
    await mount(LOCKED_RANGE_OPTION)

    expect(existsInBody("delivery-dialog-locked-hint")).toBe(true)
    for (const testId of [
      "delivery-dialog-unit",
      "delivery-dialog-min",
      "delivery-dialog-max",
      "delivery-dialog-mode-single",
      "delivery-dialog-mode-range",
      "delivery-dialog-save",
    ])
      expect(inBody(testId).attributes("disabled"), testId).toBeDefined()
  })

  it("shows no lock hint for an unused option and keeps its fields editable", async () => {
    serveList()
    await mount(WORKING_DAYS_OPTION)

    expect(existsInBody("delivery-dialog-locked-hint")).toBe(false)
    expect(inBody("delivery-dialog-min").attributes("disabled")).toBeUndefined()
    expect(inBody("delivery-dialog-unit").attributes("disabled")).toBeUndefined()
  })

  it("starts blank in create mode when reopened after a cancelled attempt", async () => {
    serveList()
    serveCreate()
    const wrapper = await mount()

    await fillDialog({ unit: "semaines", min: 0, max: 3 })
    await inBody("delivery-dialog-save").trigger("click")
    await settle()
    expect(existsInBody("delivery-dialog-error")).toBe(true)

    await wrapper.setProps({ open: false })
    await settle()
    await wrapper.setProps({ open: true })
    await settle()

    expect(field("delivery-dialog-min").value).toBe("")
    expect(existsInBody("delivery-dialog-error")).toBe(false)
    expect(inBody("delivery-dialog-mode-single").attributes("aria-pressed")).toBe("true")
    expect(existsInBody("delivery-dialog-max")).toBe(false)
  })
})
