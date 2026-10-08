import type { TaxonomieMarque } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import ProductsOverviewMedia from "@/components/products/OverviewMedia.vue"

const mounted: Array<{ unmount: () => void }> = []
let originalPublishableKey = ""

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  useNuxtApp().$queryClient.clear()
  document.body.innerHTML = ""
  useRuntimeConfig().public.logoDevPublishableKey = originalPublishableKey
})

function brand(nom: string, logoUrl: string | null = null): TaxonomieMarque {
  return { nom, slug: nom.toLowerCase().replaceAll(" ", "-"), nombre_produits: 2, logo_url: logoUrl }
}

function setPublishableKey(key: string) {
  const config = useRuntimeConfig().public
  originalPublishableKey = config.logoDevPublishableKey
  config.logoDevPublishableKey = key
}

async function mountOverview(selectedBrand = "Acme", savedLogoUrl: string | null = null) {
  const wrapper = await mountSuspended(ProductsOverviewMedia, {
    props: {
      images: [],
      productId: 42,
      brand: selectedBrand,
      brands: [brand("Acme", savedLogoUrl), brand("A & B (Cameroun)")],
      sourceUrl: "",
      mode: "edit",
      slug: "acme-router",
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

describe("products brand logo preview", () => {
  it("shows the live Logo.dev match instead of a saved taxonomy URL", async () => {
    setPublishableKey("pk_test")
    const wrapper = await mountOverview("Acme", "https://storage.example/old-acme.png")

    const image = wrapper.get("[data-testid='products-brand-logo-image']")
    expect(image.attributes("src")).toBe(
      "https://img.logo.dev/name/Acme?token=pk_test&size=128&format=webp&fallback=404",
    )
    expect(image.attributes("alt")).toBe("Acme")
    expect(wrapper.get("[data-testid='products-brand-logo-attribution']").attributes("href")).toBe("https://logo.dev")
  })

  it("updates the image URL when the selected brand changes", async () => {
    setPublishableKey("pk_test")
    const wrapper = await mountOverview()

    await wrapper.setProps({ brand: "A & B (Cameroun)" })

    expect(wrapper.get("[data-testid='products-brand-logo-image']").attributes("src")).toBe(
      "https://img.logo.dev/name/A%20%26%20B%20(Cameroun)?token=pk_test&size=128&format=webp&fallback=404",
    )
  })

  it("falls back to brand initials on image failure without discovery or save controls", async () => {
    setPublishableKey("pk_test")
    const wrapper = await mountOverview()

    await wrapper.get("[data-testid='products-brand-logo-image']").trigger("error")

    expect(wrapper.find("[data-testid='products-brand-logo-image']").exists()).toBe(false)
    expect(wrapper.get("[data-testid='products-brand-logo-fallback']").text()).toBe("AC")
    expect(wrapper.find("[data-testid='products-brand-logo-find']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='products-brand-logo-save']").exists()).toBe(false)
  })

  it("uses initials when no publishable key is configured", async () => {
    setPublishableKey("")
    const wrapper = await mountOverview()

    expect(wrapper.find("[data-testid='products-brand-logo-image']").exists()).toBe(false)
    expect(wrapper.get("[data-testid='products-brand-logo-fallback']").text()).toBe("AC")
  })
})
