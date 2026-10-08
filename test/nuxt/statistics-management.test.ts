import type { Role } from "@/types/session"
import type { H3Event } from "h3"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { DOMWrapper, flushPromises } from "@vue/test-utils"
import { createError, readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ProductsCostHistoryPanel from "@/components/products/CostHistoryPanel.vue"

const PRODUCT_ID = 42

function seedSession(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles,
  })
}

const COSTS_PATH = `/api/v1/catalogue/administration/produits/${PRODUCT_ID}/couts`

const stubs: Array<() => void> = []
const mounted: Array<{ unmount: () => void }> = []

/** Registered here so a failing assertion cannot leave its handler behind for the next test. */
function stub(method: "GET" | "POST", handler: (event: H3Event) => unknown) {
  stubs.push(registerEndpoint(COSTS_PATH, { method, handler }))
}

async function mountCosts() {
  const wrapper = await mountSuspended(ProductsCostHistoryPanel, {
    props: { productId: PRODUCT_ID },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** The add-cost form lives in a modal portalled to <body>, outside the mounted wrapper. */
function inDialog(testId: string) {
  const element = document.body.querySelector<HTMLElement>(`[data-testid='${testId}']`)
  expect(element, testId).not.toBeNull()
  return new DOMWrapper(element!)
}

describe("statistics management controls", () => {
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    stubs.splice(0).forEach(cleanup => cleanup())
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("does not expose product cost mutations outside direction", async () => {
    seedSession(["preparation"])
    const costs = await mountSuspended(ProductsCostHistoryPanel, { props: { productId: PRODUCT_ID } })

    expect(costs.find("[data-testid='product-cost-add']").exists()).toBe(false)

    costs.unmount()
  })

  it("posts an effective-now cost only for the selected product, from a modal", async () => {
    seedSession(["direction"])
    stub("GET", () => [])
    let body: unknown
    stub("POST", async event => {
      body = await readBody(event)
      return { cost: 15_000, effectiveAt: "2026-09-07T09:00:00.000Z" }
    })
    const wrapper = await mountCosts()

    await flushPromises()
    expect(document.body.querySelector("[data-testid='product-cost-amount']")).toBeNull()

    await wrapper.get("[data-testid='product-cost-add']").trigger("click")
    await inDialog("product-cost-amount").setValue("15000")
    await inDialog("product-cost-save").trigger("click")

    await vi.waitFor(() => expect(body).toEqual({ cost: 15_000 }))
    await vi.waitFor(() =>
      expect(wrapper.get("[data-testid='product-cost-add']").attributes("aria-expanded")).toBe("false"),
    )
  })

  it("keeps the typed cost in the modal and says why when saving fails", async () => {
    seedSession(["direction"])
    stub("GET", () => [])
    stub("POST", () => {
      throw createError({ statusCode: 500, statusMessage: "Server Error" })
    })
    const wrapper = await mountCosts()

    await flushPromises()
    await wrapper.get("[data-testid='product-cost-add']").trigger("click")
    await inDialog("product-cost-amount").setValue("15000")
    await inDialog("product-cost-save").trigger("click")

    await vi.waitFor(() => expect(inDialog("product-cost-error").text()).toContain("The cost could not be saved"))
    expect((inDialog("product-cost-amount").element as HTMLInputElement).value).toBe("15000")
    expect(wrapper.get("[data-testid='product-cost-add']").attributes("aria-expanded")).toBe("true")
  })

  it.each([["-5"], [""]])("refuses the cost %j without sending anything", async typed => {
    seedSession(["direction"])
    stub("GET", () => [])
    let posted = false
    stub("POST", () => {
      posted = true
      return {}
    })
    const wrapper = await mountCosts()

    await flushPromises()
    await wrapper.get("[data-testid='product-cost-add']").trigger("click")
    await inDialog("product-cost-amount").setValue(typed)
    await inDialog("product-cost-save").trigger("click")
    await flushPromises()

    expect(inDialog("product-cost-error").text()).toContain("Enter a whole-number cost of zero or more.")
    expect(posted).toBe(false)
  })

  it("says a product has no recorded costs instead of reporting a load failure", async () => {
    seedSession(["direction"])
    stub("GET", () => [])
    const wrapper = await mountCosts()

    await vi.waitFor(() => expect(wrapper.find("[data-testid='product-cost-history-empty']").exists()).toBe(true))
    expect(wrapper.text()).not.toContain("could not be loaded")
  })

  it("lists the recorded costs", async () => {
    seedSession(["direction"])
    stub("GET", () => [
      {
        id: "c2",
        productId: PRODUCT_ID,
        cost: 16_000,
        effectiveAt: "2026-09-10T09:00:00.000Z",
        actor: null,
        createdAt: "2026-09-10T09:00:00.000Z",
      },
      {
        id: "c1",
        productId: PRODUCT_ID,
        cost: 15_000,
        effectiveAt: "2026-09-07T09:00:00.000Z",
        actor: null,
        createdAt: "2026-09-07T09:00:00.000Z",
      },
    ])
    const wrapper = await mountCosts()

    await vi.waitFor(() => expect(wrapper.findAll("li")).toHaveLength(2))
    expect(wrapper.text()).not.toContain("could not be loaded")
  })

  it("reports a load failure only when the request actually fails", async () => {
    seedSession(["direction"])
    stub("GET", () => {
      throw createError({ statusCode: 403, statusMessage: "Forbidden" })
    })
    const wrapper = await mountCosts()

    await vi.waitFor(() => expect(wrapper.text()).toContain("Cost history could not be loaded."), { timeout: 4000 })
  })
})
