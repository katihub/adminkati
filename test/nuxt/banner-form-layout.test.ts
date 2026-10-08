import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import BannerForm from "@/components/content/BannerForm.vue"

const LARGE_DIMENSIONS = "[data-testid='banner-artwork-field-large-dimensions']"
const MOBILE_DIMENSIONS = "[data-testid='banner-artwork-field-mobile-dimensions']"
const FOCUS = "[data-testid='banner-form-focus']"
const FOCUS_HANDLE = "[data-testid='banner-focus-picker-handle']"

function makeBanner(overrides: Partial<BanniereAdmin> = {}): BanniereAdmin {
  return {
    id: 12,
    emplacement: "principal",
    ordre: 1,
    active: true,
    fichier_large: "bannieres/large-12.jpg",
    largeur_large: 1600,
    hauteur_large: 600,
    fichier_mobile: "bannieres/mobile-12.jpg",
    largeur_mobile: 800,
    hauteur_mobile: 900,
    href: "/categorie/promo",
    libelle: "Promo rentree",
    alt: "Chaussures en cuir noires, tres confortables",
    focus: 50,
    creee_le: "2026-08-01T00:00:00.000Z",
    modifiee_le: "2026-08-15T00:00:00.000Z",
    modifiee_par: null,
    url_large: "https://cdn.example.com/branding/bannieres/large-12.jpg",
    url_mobile: "https://cdn.example.com/branding/bannieres/mobile-12.jpg",
    ...overrides,
  }
}

function mountForm(banner: BanniereAdmin | null = makeBanner()) {
  return mountSuspended(BannerForm, { props: { banner, formId: "test-banner-form" }, attachTo: document.body })
}

/** happy-dom cannot assign `files` on an input, so the picked file is defined on the instance. */
function attachFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

describe("banner form, details layout", () => {
  let originalCreateObjectURL: typeof URL.createObjectURL
  let originalRevokeObjectURL: typeof URL.revokeObjectURL

  beforeEach(() => {
    useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], { rayons: [], categories: [], marques: [] })
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1700, height: 900, close: () => {} })),
    )
    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => "blob:mock-url")
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  describe("artwork sizes", () => {
    it("shows the size of the saved large artwork on the artwork itself", async () => {
      const wrapper = await mountForm()
      await flushPromises()

      expect(wrapper.get(LARGE_DIMENSIONS).text()).toBe("1600 × 600 px")

      wrapper.unmount()
    })

    it("measures a newly picked artwork and shows its size instead", async () => {
      const wrapper = await mountForm()
      await flushPromises()

      attachFile(
        wrapper.get("[data-testid='banner-artwork-field-large-input']").element as HTMLInputElement,
        new File(["bytes"], "new.jpg", { type: "image/jpeg" }),
      )
      await flushPromises()

      expect(wrapper.get(LARGE_DIMENSIONS).text()).toBe("1700 × 900 px")

      wrapper.unmount()
    })

    it("shows the size of the saved phone artwork next to what can be done with it", async () => {
      const wrapper = await mountForm()
      await flushPromises()

      expect(wrapper.get(MOBILE_DIMENSIONS).text()).toBe("800 × 900 px")
      const replace = wrapper.get("[data-testid='banner-artwork-field-mobile-replace']")
      const remove = wrapper.get("[data-testid='banner-artwork-field-mobile-remove']")
      expect([replace.attributes("aria-label"), remove.attributes("aria-label")]).toEqual([
        "Replace the phone artwork",
        "Remove the phone artwork",
      ])
      expect([replace.text(), remove.text()]).toEqual(["", ""])

      wrapper.unmount()
    })

    it("offers to add a phone artwork when the banner has none, and says what phones get instead", async () => {
      const wrapper = await mountForm(
        makeBanner({ fichier_mobile: null, largeur_mobile: null, hauteur_mobile: null, url_mobile: null }),
      )
      await flushPromises()

      expect(wrapper.find(MOBILE_DIMENSIONS).exists()).toBe(false)
      const add = wrapper.get("[data-testid='banner-artwork-field-mobile-dropzone']")
      expect(add.attributes("aria-label")).toBe("Add phone artwork")
      expect(add.text()).toBe("")
      expect(wrapper.get("[data-testid='banner-artwork-field-mobile-detail']").text()).toContain(
        "cropped around the focus point",
      )

      wrapper.unmount()
    })
  })

  describe("focus point", () => {
    it("shows the saved focus point on the artwork, where the line is dragged", async () => {
      const wrapper = await mountForm(makeBanner({ focus: 78 }))
      await flushPromises()

      expect(wrapper.get(`[data-testid='banner-artwork-field-large'] ${FOCUS}`).text()).toBe("Focus 78%")

      wrapper.unmount()
    })

    it("follows the focus handle as it moves", async () => {
      const wrapper = await mountForm()
      await flushPromises()

      await wrapper.get(FOCUS_HANDLE).trigger("keydown", { key: "ArrowRight" })

      expect(wrapper.get(FOCUS).text()).toContain("51%")

      wrapper.unmount()
    })

    it("has nothing to show until there is an artwork to focus on", async () => {
      const wrapper = await mountForm(null)
      await flushPromises()

      expect(wrapper.find(FOCUS).exists()).toBe(false)

      attachFile(
        wrapper.get("[data-testid='banner-artwork-field-large-input']").element as HTMLInputElement,
        new File(["bytes"], "new.jpg", { type: "image/jpeg" }),
      )
      await flushPromises()

      expect(wrapper.get(FOCUS).text()).toContain("50%")

      wrapper.unmount()
    })
  })

  describe("phone artwork block", () => {
    const PHONE = "[data-testid='banner-artwork-field-mobile']"
    const DETAIL = "[data-testid='banner-artwork-field-mobile-detail']"
    const withoutPhoneArtwork = (overrides: Partial<BanniereAdmin> = {}) =>
      makeBanner({ fichier_mobile: null, largeur_mobile: null, hauteur_mobile: null, url_mobile: null, ...overrides })

    it("with a phone artwork, says phones show it instead of the large one", async () => {
      const wrapper = await mountForm()
      await flushPromises()

      expect(wrapper.get(PHONE).text()).toContain("Custom phone artwork")
      expect(wrapper.get(DETAIL).text()).toBe("Shown on phones instead of the large artwork.")

      wrapper.unmount()
    })

    it("without one, says phones use the large artwork and how it is cropped", async () => {
      const wrapper = await mountForm(withoutPhoneArtwork({ focus: 78 }))
      await flushPromises()

      expect(wrapper.get(PHONE).text()).toContain("Phones use the large artwork")
      expect(wrapper.get(DETAIL).text()).toContain("cropped around the focus point (78%)")

      wrapper.unmount()
    })

    it("follows the focus handle in that sentence", async () => {
      const wrapper = await mountForm(withoutPhoneArtwork({ focus: 78 }))
      await flushPromises()

      await wrapper.get(FOCUS_HANDLE).trigger("keydown", { key: "ArrowRight" })

      expect(wrapper.get(DETAIL).text()).toContain("(79%)")

      wrapper.unmount()
    })

    it("asks for the large artwork first when there is none yet", async () => {
      const wrapper = await mountForm(null)
      await flushPromises()

      expect(wrapper.get(DETAIL).text()).toBe(
        "Add the large artwork first. Phones will show it, cropped around the focus point.",
      )

      wrapper.unmount()
    })

    it("falls back to the large artwork's wording once the saved phone artwork is staged for removal", async () => {
      const wrapper = await mountForm()
      await flushPromises()

      await wrapper.get("[data-testid='banner-artwork-field-mobile-remove']").trigger("click")

      expect(wrapper.get(PHONE).text()).toContain("Phones use the large artwork")
      expect(wrapper.get(PHONE).text()).toContain("will be removed when you save")

      wrapper.unmount()
    })
  })

  describe("field labels", () => {
    it("names the label field for screen readers and the alt text field by its visible label", async () => {
      const wrapper = await mountForm()

      const labelId = wrapper.get("[data-testid='banner-form-libelle']").attributes("id")
      const altId = wrapper.get("[data-testid='banner-form-alt']").attributes("id")

      expect(wrapper.get(`label[for='${labelId}']`).text()).toBe("Label")
      expect(wrapper.get(`label[for='${altId}']`).text()).toBe("Alt text")

      wrapper.unmount()
    })
  })

  describe("alt text counter", () => {
    const COUNTER = "[data-testid='banner-form-alt-counter']"

    it("follows what is typed", async () => {
      const wrapper = await mountForm(makeBanner({ alt: "" }))

      await wrapper.get("[data-testid='banner-form-alt']").setValue("Chaussures de course")

      expect(wrapper.get(COUNTER).text()).toBe("20/400")

      wrapper.unmount()
    })
  })
})
