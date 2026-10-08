import type { DelaiLivraison } from "@/types/api/delais-livraison"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { createError, readBody } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import OverviewDelivery from "@/components/products/OverviewDelivery.vue"
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

const mounted: Array<{ unmount: () => void }> = []

async function mount(props: { modelValue: number | null; resolved?: DelaiLivraison | null; disabled?: boolean }) {
  const wrapper = await mountSuspended(OverviewDelivery, { props, attachTo: document.body })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

function serveOptions() {
  stubEndpoint(DELIVERY_PATH, "GET", () => deliveryOptions())
}

async function openPopover(wrapper: Awaited<ReturnType<typeof mount>>) {
  await wrapper.get("[data-testid='product-delivery-trigger']").trigger("click")
  await settle()
}

describe("products delivery picker", () => {
  beforeEach(() =>
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } }),
  )
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    clearEndpoints()
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("shows the default option when the product has no explicit option", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: null })

    const trigger = wrapper.get("[data-testid='product-delivery-trigger']")
    expect(trigger.text()).toContain("30")
    expect(trigger.text()).toContain("72")
  })

  it("shows the chosen option", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: 2 })

    const trigger = wrapper.get("[data-testid='product-delivery-trigger']")
    expect(trigger.text()).toContain("5")
    expect(trigger.text()).toMatch(/working/i)
  })

  it("emits the option's id when a non-default option is picked", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: null })
    await openPopover(wrapper)

    await inBody("product-delivery-option-2").trigger("click")

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([2])
  })

  it("emits null when the default option is picked, because null means inherit", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: 2 })
    await openPopover(wrapper)

    await inBody("product-delivery-option-1").trigger("click")

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([null])
  })

  it("marks the default option with a badge inside the list", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: 2 })
    await openPopover(wrapper)

    expect(inBody("product-delivery-option-1").find("[data-testid='product-delivery-default-badge']").exists()).toBe(
      true,
    )
    expect(inBody("product-delivery-option-2").find("[data-testid='product-delivery-default-badge']").exists()).toBe(
      false,
    )
  })

  it("does not list an archived option while another option is selected", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: 2 })
    await openPopover(wrapper)

    expect(existsInBody("product-delivery-option-1")).toBe(true)
    expect(existsInBody("product-delivery-option-2")).toBe(true)
    expect(existsInBody("product-delivery-option-3")).toBe(true)
    expect(existsInBody("product-delivery-option-4")).toBe(false)
  })

  it("still lists an archived option when the product holds it", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: 4 })
    await openPopover(wrapper)

    expect(existsInBody("product-delivery-option-4")).toBe(true)
  })

  it("does not open when disabled", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: null, disabled: true })

    const trigger = wrapper.get("[data-testid='product-delivery-trigger']")
    expect(trigger.attributes("disabled")).toBeDefined()
    await trigger.trigger("click")
    await settle()

    expect(existsInBody("product-delivery-option-2")).toBe(false)
  })

  it("says the options are unavailable, disables the picker and keeps showing the saved value when the list fails to load", async () => {
    stubEndpoint(DELIVERY_PATH, "GET", () => {
      throw createError({ statusCode: 500, statusMessage: "Server Error" })
    })
    const wrapper = await mount({ modelValue: 2, resolved: WORKING_DAYS_OPTION })

    expect(wrapper.find("[data-testid='product-delivery-error']").exists()).toBe(true)
    const trigger = wrapper.get("[data-testid='product-delivery-trigger']")
    expect(trigger.attributes("disabled")).toBeDefined()
    expect(trigger.text()).toContain("5")
    expect(trigger.text()).toMatch(/working/i)
  })

  it("opens the manage dialog from the manage button", async () => {
    serveOptions()
    const wrapper = await mount({ modelValue: null })
    await openPopover(wrapper)

    expect(existsInBody("delivery-manage-dialog")).toBe(false)
    await inBody("product-delivery-manage").trigger("click")
    await settle()

    expect(existsInBody("delivery-manage-dialog")).toBe(true)
  })

  it("creates an option from the add button and selects it on the product", async () => {
    serveOptions()
    let body: unknown
    stubEndpoint(DELIVERY_PATH, "POST", async event => {
      body = await readBody(event)
      return {
        id: 99,
        min_valeur: 7,
        max_valeur: null,
        unite: "jours_ouvres",
        est_defaut: false,
        actif: true,
        utilise_par: 0,
      }
    })
    const wrapper = await mount({ modelValue: null })
    await openPopover(wrapper)

    await inBody("product-delivery-add").trigger("click")
    await settle()
    expect(existsInBody("delivery-dialog")).toBe(true)
    await fillDialog({ unit: "jours_ouvres", min: 7 })
    await inBody("delivery-dialog-save").trigger("click")

    await vi.waitFor(() => expect(body).toEqual({ min_valeur: 7, max_valeur: null, unite: "jours_ouvres" }))
    await vi.waitFor(() => expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([99]))
  })
})
