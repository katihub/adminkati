import type { ProductDetail, Taxonomie } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import ProductsDetailForm from "@/components/products/DetailForm.vue"
import OverviewInitialStock from "@/components/products/OverviewInitialStock.vue"
import { clearEndpoints, settle, stubEndpoint } from "./delivery-fixture"

const INPUT = "[data-testid='products-detail-overview-initial-stock-input']"
const ERROR = "[data-testid='products-detail-overview-initial-stock-error']"

const mounted: Array<{ unmount: () => void }> = []

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  clearEndpoints()
  useNuxtApp().$queryClient.clear()
})

describe("products initial stock field: error", () => {
  async function mountField(error?: string) {
    const wrapper = await mountSuspended(OverviewInitialStock, {
      props: { modelValue: "-3", inputId: "initial-stock", error },
    })
    mounted.push(wrapper)
    return wrapper
  }

  it("announces the message under the field and ties it to the input", async () => {
    const wrapper = await mountField("This value is out of range.")

    const message = wrapper.get(ERROR)
    expect(message.text()).toBe("This value is out of range.")
    expect(message.attributes("role")).toBe("alert")
    const input = wrapper.get(INPUT)
    expect(input.attributes("aria-invalid")).toBe("true")
    expect(message.attributes("id")).toBeTruthy()
    expect(input.attributes("aria-describedby")).toContain(message.attributes("id"))
  })

  it("renders no error element and no invalid marker without a message", async () => {
    const wrapper = await mountField()

    expect(wrapper.find(ERROR).exists()).toBe(false)
    expect(wrapper.get(INPUT).attributes("aria-invalid")).not.toBe("true")
  })

  it("renders no error element for an empty message", async () => {
    const wrapper = await mountField("")

    expect(wrapper.find(ERROR).exists()).toBe(false)
  })
})

const TAXONOMIE: Taxonomie = { rayons: [], categories: [], marques: [] }

function seedAddSession() {
  const client = useNuxtApp().$queryClient
  client.setQueryData(["v1", "taxonomie"], TAXONOMIE)
  client.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles: ["direction"],
  })
}

describe("products add form: initial stock error", () => {
  async function mountAdd() {
    seedAddSession()
    const bodies: Array<Record<string, unknown>> = []
    stubEndpoint("/api/v1/catalogue/administration/produits", "POST", async event => {
      bodies.push(await readBody(event))
      return { id: 1, slug: "nouveau", nom: "Nouveau produit", prix: 1000 } as unknown as ProductDetail
    })
    const wrapper = await mountSuspended(ProductsDetailForm, { props: { product: null }, attachTo: document.body })
    mounted.push(wrapper)
    await flushPromises()
    await wrapper.get("[data-testid='products-detail-overview-title']").setValue("Nouveau produit")
    await wrapper.get("[data-testid='products-detail-overview-price-input']").setValue("1000")
    return { wrapper, bodies }
  }

  async function submit(wrapper: Awaited<ReturnType<typeof mountAdd>>["wrapper"]) {
    await wrapper.get("[data-testid='products-detail-form']").trigger("submit")
    await settle()
  }

  it.each(["-3", "2.5"])("shows the out-of-range message under the field when the quantity is %s", async typed => {
    const { wrapper, bodies } = await mountAdd()

    await wrapper.get(INPUT).setValue(typed)
    await submit(wrapper)

    expect(bodies).toEqual([])
    const message = wrapper.find(ERROR)
    expect(message.exists()).toBe(true)
    expect(message.text()).toBe("This value is out of range.")
    expect(wrapper.get(INPUT).attributes("aria-invalid")).toBe("true")
  })

  it("clears the message once the quantity is corrected and the form is submitted again", async () => {
    const { wrapper, bodies } = await mountAdd()

    await wrapper.get(INPUT).setValue("-3")
    await submit(wrapper)
    expect(wrapper.find(ERROR).exists()).toBe(true)

    await wrapper.get(INPUT).setValue("4")
    await submit(wrapper)

    expect(wrapper.find(ERROR).exists()).toBe(false)
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toHaveProperty("quantite_stock_initiale", 4)
  })

  it("clears the message when the form is cancelled", async () => {
    const { wrapper } = await mountAdd()

    await wrapper.get(INPUT).setValue("-3")
    await submit(wrapper)
    expect(wrapper.find(ERROR).exists()).toBe(true)

    await wrapper.get("[data-testid='products-detail-form-cancel']").trigger("click")
    await flushPromises()

    expect(wrapper.find(ERROR).exists()).toBe(false)
  })
})
