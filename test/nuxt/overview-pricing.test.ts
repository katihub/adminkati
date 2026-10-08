import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ProductsOverviewPricing from "@/components/products/OverviewPricing.vue"

describe("products overview pricing", () => {
  it("shows grouped FCFA amounts until either price field is focused", async () => {
    const wrapper = await mountSuspended(ProductsOverviewPricing, {
      props: {
        name: "Casque Bluetooth",
        price: "250000",
        referencePrice: "325000",
        discount: "23",
        promoDebut: "",
        promoFin: "",
      },
    })

    const price = wrapper.get("[data-testid='products-detail-overview-price-input']")
    const referencePrice = wrapper.get("[data-testid='products-detail-overview-reference-price-input']")

    expect(price.element).toHaveProperty("value", "250 000")
    expect(referencePrice.element).toHaveProperty("value", "325 000")

    await price.trigger("focus")
    await referencePrice.trigger("focus")

    expect(price.element).toHaveProperty("value", "250000")
    expect(referencePrice.element).toHaveProperty("value", "325000")

    await price.trigger("blur")
    await referencePrice.trigger("blur")

    expect(price.element).toHaveProperty("value", "250 000")
    expect(referencePrice.element).toHaveProperty("value", "325 000")
    expect(wrapper.emitted("update:price")).toBeUndefined()
    expect(wrapper.emitted("update:referencePrice")).toBeUndefined()
  })

  it("no longer offers a manual in-stock switch, since stock follows the inventory movements", async () => {
    const wrapper = await mountSuspended(ProductsOverviewPricing, {
      props: {
        name: "Casque Bluetooth",
        price: "250000",
        referencePrice: "325000",
        discount: "23",
        promoDebut: "",
        promoFin: "",
      },
    })

    expect(wrapper.find("[data-testid='products-detail-overview-en-stock']").exists()).toBe(false)
  })
})
