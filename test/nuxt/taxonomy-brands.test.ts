import type { Marque } from "@/types/api/taxonomie"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import BrandDetailPanel from "@/components/taxonomy/BrandDetailPanel.vue"
import BrandTable from "@/components/taxonomy/BrandTable.vue"

const mounted: Array<{ unmount: () => void }> = []
let originalPublishableKey = ""

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  useNuxtApp().$queryClient.clear()
  document.body.innerHTML = ""
  useRuntimeConfig().public.logoDevPublishableKey = originalPublishableKey
})

function setPublishableKey(key: string) {
  const config = useRuntimeConfig().public
  originalPublishableKey = config.logoDevPublishableKey
  config.logoDevPublishableKey = key
}

const sampleBrand: Marque = { nom: "Acme", slug: "acme", nombre_produits: 4 }
const sampleBrands: Marque[] = [sampleBrand, { nom: "Beta Corp", slug: "beta-corp", nombre_produits: 10 }]

describe("taxonomy brand components logo rendering", () => {
  describe("BrandTable", () => {
    it("renders brand logos using Logo.dev when publishable key is configured", async () => {
      setPublishableKey("pk_test")
      const wrapper = await mountSuspended(BrandTable, {
        props: {
          brands: sampleBrands,
          sort: { key: "nom", direction: "asc" },
        },
        attachTo: document.body,
      })
      mounted.push(wrapper)

      const image = wrapper.find("[data-testid='brand-logo-acme-image']")
      expect(image.exists()).toBe(true)
      expect(image.attributes("src")).toBe(
        "https://img.logo.dev/name/Acme?token=pk_test&size=128&format=webp&fallback=404",
      )
    })

    it("falls back to initials when publishable key is missing", async () => {
      setPublishableKey("")
      const wrapper = await mountSuspended(BrandTable, {
        props: {
          brands: sampleBrands,
          sort: { key: "nom", direction: "asc" },
        },
        attachTo: document.body,
      })
      mounted.push(wrapper)

      expect(wrapper.find("[data-testid='brand-logo-acme-image']").exists()).toBe(false)
      const fallback = wrapper.get("[data-testid='brand-logo-acme-fallback']")
      expect(fallback.text()).toBe("AC")
    })

    it("falls back to initials when the image fails to load", async () => {
      setPublishableKey("pk_test")
      const wrapper = await mountSuspended(BrandTable, {
        props: {
          brands: sampleBrands,
          sort: { key: "nom", direction: "asc" },
        },
        attachTo: document.body,
      })
      mounted.push(wrapper)

      await wrapper.get("[data-testid='brand-logo-acme-image']").trigger("error")

      expect(wrapper.find("[data-testid='brand-logo-acme-image']").exists()).toBe(false)
      expect(wrapper.get("[data-testid='brand-logo-acme-fallback']").text()).toBe("AC")
    })
  })

  describe("BrandDetailPanel", () => {
    it("renders brand logo in the detail panel overview when key is set", async () => {
      setPublishableKey("pk_test")
      const wrapper = await mountSuspended(BrandDetailPanel, {
        props: {
          open: true,
          brand: sampleBrand,
        },
        attachTo: document.body,
      })
      mounted.push(wrapper)

      const image = document.body.querySelector("[data-testid='brand-panel-logo-image']")
      expect(image).not.toBeNull()
      expect(image?.getAttribute("src")).toBe(
        "https://img.logo.dev/name/Acme?token=pk_test&size=128&format=webp&fallback=404",
      )
    })

    it("renders brand initials fallback in the detail panel overview when key is missing", async () => {
      setPublishableKey("")
      const wrapper = await mountSuspended(BrandDetailPanel, {
        props: {
          open: true,
          brand: sampleBrand,
        },
        attachTo: document.body,
      })
      mounted.push(wrapper)

      expect(document.body.querySelector("[data-testid='brand-panel-logo-image']")).toBeNull()
      const fallback = document.body.querySelector("[data-testid='brand-panel-logo-fallback']")
      expect(fallback?.textContent?.trim()).toBe("AC")
    })
  })
})
