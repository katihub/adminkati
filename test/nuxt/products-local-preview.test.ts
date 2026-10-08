import type { ProductImage } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ProductsImageGallery from "@/components/products/ImageGallery.vue"

/**
 * THE PREVIEW OF A FILE PICKED BEFORE THE PRODUCT EXISTS.
 *
 * Creating a product lets an operator pick an image before there is an id to
 * upload it to, so the form holds the file and previews it through
 * `URL.createObjectURL`. That preview was blank: `<NuxtImg>`'s remote test is
 * `^https?://`, so a `blob:` URL fell through to "a path on our own site" and
 * was handed to IPX, which then tried to fetch a blob from the server. Nothing
 * appeared, and nothing was logged anywhere — no request ever reached the
 * backend.
 *
 * These tests pin the rule that replaced it: who can fetch the bytes decides
 * the element. They assert on `_ipx` in the rendered `src`, because that
 * prefix is the whole difference between an image that renders and one that
 * silently does not.
 */
function image(url: string): ProductImage {
  return { rang: 1, url, chemin_local: null, octets: null, alt: null }
}

function mount(url: string) {
  return mountSuspended(ProductsImageGallery, {
    props: { modelValue: [image(url)], productId: null, disabled: false },
  })
}

describe("product image local preview", () => {
  it("renders a blob: preview as a plain image, never through IPX", async () => {
    const wrapper = await mount("blob:http://localhost:3000/8f0e-4c21-9a77")

    const rendu = wrapper.findAll("[data-testid='products-image-gallery-thumbnail'] img")
    expect(rendu.length).toBeGreaterThan(0)
    for (const img of rendu) {
      const src = img.attributes("src") ?? ""
      expect(src).toBe("blob:http://localhost:3000/8f0e-4c21-9a77")
      expect(src).not.toContain("_ipx")
      expect(img.attributes("data-nuxt-img")).toBeDefined()
    }

    wrapper.unmount()
  })

  /* THE OTHER HALF OF THE RULE, REVERSED. This used to pin stored images to
     IPX, and only held because the test host happened to be the banner storage
     host. Production now serves Supabase behind the API's own domain, so that
     host is the catalogue host too, and a product image going through IPX means
     the panel's own server fetching and re-encoding every thumbnail. A stored
     image is now served as the backend sends it — on the shared host, which IS
     trusted for IPX, so this passes only because the component opts out. */
  it("serves a stored image untransformed even though its host is trusted for IPX", async () => {
    const stored = new URL(
      "/supabase/storage/v1/object/public/produits/60459/a997.jpg",
      useRuntimeConfig().public.catalogueImageOrigin,
    ).toString()
    expect(useImage().options.domains).toContain(new URL(stored).host)

    const wrapper = await mount(stored)

    const img = wrapper.find("[data-testid='products-image-gallery-thumbnail'] img")
    expect(img.attributes("src")).toBe(stored)
    expect(img.attributes("src") ?? "").not.toContain("_ipx")

    wrapper.unmount()
  })
})
