import { mountSuspended } from "@nuxt/test-utils/runtime"
import { createError, readBody } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import DeliveryIntervalManageDialog from "@/components/products/DeliveryIntervalManageDialog.vue"
import {
  ARCHIVED_OPTION,
  clearEndpoints,
  DELIVERY_PATH,
  deliveryOptions,
  existsInBody,
  inBody,
  settle,
  stubEndpoint,
  WORKING_DAYS_OPTION,
} from "./delivery-fixture"

const mounted: Array<{ unmount: () => void }> = []

async function mount() {
  const wrapper = await mountSuspended(DeliveryIntervalManageDialog, { props: { open: true }, attachTo: document.body })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

function serveList() {
  stubEndpoint(DELIVERY_PATH, "GET", () => deliveryOptions())
}

function rowIds() {
  return Array.from(document.body.querySelectorAll<HTMLElement>("[data-testid^='delivery-manage-row-']")).map(row =>
    row.dataset.testid!.replace("delivery-manage-row-", ""),
  )
}

describe("products delivery interval manage dialog", () => {
  beforeEach(() =>
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } }),
  )
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("lists every option including archived ones, default first", async () => {
    serveList()
    await mount()

    expect(rowIds()).toEqual(["1", "2", "3", "4"])
  })

  it("shows a skeleton while the list loads", async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    stubEndpoint(DELIVERY_PATH, "GET", async () => {
      await gate
      return deliveryOptions()
    })
    await mountSuspended(DeliveryIntervalManageDialog, { props: { open: true }, attachTo: document.body }).then(
      wrapper => mounted.push(wrapper),
    )
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(existsInBody("delivery-manage-loading")).toBe(true)
    release()
    await settle()

    expect(existsInBody("delivery-manage-loading")).toBe(false)
    expect(existsInBody("delivery-manage-row-2")).toBe(true)
  })

  it("offers no archive action on the default option, but does on active non-default ones", async () => {
    serveList()
    await mount()

    expect(existsInBody("delivery-manage-archive-1")).toBe(false)
    expect(existsInBody("delivery-manage-archive-2")).toBe(true)
    expect(existsInBody("delivery-manage-archive-3")).toBe(true)
  })

  it("archives an option by PATCHing { actif: false } to its URL", async () => {
    serveList()
    let body: unknown
    stubEndpoint(`${DELIVERY_PATH}/2`, "PATCH", async event => {
      body = await readBody(event)
      return { ...WORKING_DAYS_OPTION, actif: false }
    })
    await mount()

    await inBody("delivery-manage-archive-2").trigger("click")

    await vi.waitFor(() => expect(body).toEqual({ actif: false }))
  })

  it("offers restore, not archive, on an archived option, and restores with { actif: true }", async () => {
    serveList()
    let body: unknown
    stubEndpoint(`${DELIVERY_PATH}/4`, "PATCH", async event => {
      body = await readBody(event)
      return { ...ARCHIVED_OPTION, actif: true }
    })
    await mount()

    expect(existsInBody("delivery-manage-archive-4")).toBe(false)
    await inBody("delivery-manage-restore-4").trigger("click")

    await vi.waitFor(() => expect(body).toEqual({ actif: true }))
  })

  it("does not offer restore on an active option", async () => {
    serveList()
    await mount()

    expect(existsInBody("delivery-manage-restore-2")).toBe(false)
  })

  it("shows the backend's message when archiving is refused", async () => {
    serveList()
    stubEndpoint(`${DELIVERY_PATH}/2`, "PATCH", () => {
      throw createError({ statusCode: 409, data: { message: "Le delai par defaut ne peut pas etre archive." } })
    })
    await mount()

    await inBody("delivery-manage-archive-2").trigger("click")

    await vi.waitFor(() =>
      expect(inBody("delivery-manage-error").text()).toContain("Le delai par defaut ne peut pas etre archive."),
    )
    expect(inBody("delivery-manage-error").attributes("role")).toBe("alert")
  })

  it("opens the edit dialog for an option in use with its value fields explained as locked", async () => {
    serveList()
    await mount()

    await inBody("delivery-manage-edit-3").trigger("click")
    await settle()

    expect(existsInBody("delivery-dialog")).toBe(true)
    expect(existsInBody("delivery-dialog-locked-hint")).toBe(true)
  })

  it("opens the edit dialog for an unused option without the lock hint", async () => {
    serveList()
    await mount()

    await inBody("delivery-manage-edit-2").trigger("click")
    await settle()

    expect(existsInBody("delivery-dialog")).toBe(true)
    expect(existsInBody("delivery-dialog-locked-hint")).toBe(false)
  })

  it("reports a failed list fetch and refetches on retry", async () => {
    let failing = true
    stubEndpoint(DELIVERY_PATH, "GET", () => {
      if (failing) throw createError({ statusCode: 500, statusMessage: "Server Error" })
      return deliveryOptions()
    })
    await mount()

    expect(inBody("delivery-manage-error").attributes("role")).toBe("alert")
    expect(existsInBody("delivery-manage-row-2")).toBe(false)

    failing = false
    await inBody("delivery-manage-retry").trigger("click")

    await vi.waitFor(() => expect(existsInBody("delivery-manage-row-2")).toBe(true))
    expect(existsInBody("delivery-manage-error")).toBe(false)
  })
})
