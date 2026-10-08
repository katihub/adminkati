import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import BannerArtworkField from "@/components/content/BannerArtworkField.vue"
import BannerForm from "@/components/content/BannerForm.vue"

const fixtureBanner: BanniereAdmin = {
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
}

function seedEmptyTaxonomie() {
  useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], { rayons: [], categories: [], marques: [] })
}

/**
 * happy-dom's native `HTMLInputElement.files` setter can't be assigned a `FileList`
 * directly from a test, so the property is redefined on the instance before the
 * `change` event fires — the standard escape hatch for simulating a file-input pick.
 */
function attachFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

/**
 * `BannerArtworkField`'s live preview calls `URL.createObjectURL(file)` on the staged
 * `File`. Node's own `URL.createObjectURL` (not happy-dom's — this API isn't polyfilled by
 * happy-dom, so the global `URL` is Node's) rejects that `File` with "must be an instance
 * of Blob", a Node/test-environment mismatch that a real browser never hits (`File`
 * genuinely extends `Blob` there). Patching only the two static methods — not
 * `vi.stubGlobal("URL", …)` — keeps `new URL()` itself intact for anything else that needs
 * it (Nuxt's own routing included).
 */
let originalCreateObjectURL: typeof URL.createObjectURL
let originalRevokeObjectURL: typeof URL.revokeObjectURL

describe("banner artwork field", () => {
  beforeEach(() => {
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
  })

  it("rejects a non-image file before measuring, emitting neither a valid file nor dimensions", async () => {
    const measureSpy = vi.fn()
    vi.stubGlobal("createImageBitmap", measureSpy)

    const wrapper = await mountSuspended(BannerArtworkField, {
      props: { previewUrl: null, file: null, dimensions: null, emplacement: "principal" },
      attachTo: document.body,
    })
    await flushPromises()

    const input = wrapper.get("[data-testid='banner-artwork-field-large-input']").element as HTMLInputElement
    attachFile(input, new File(["not an image"], "notes.txt", { type: "text/plain" }))
    await flushPromises()

    const fileEmits = wrapper.emitted("update:file") ?? []
    const emittedValidFile = fileEmits.some(args => args[0] instanceof File)
    expect(emittedValidFile).toBe(false)
    expect(wrapper.emitted("update:dimensions")).toBeUndefined()
    expect(wrapper.find("[data-testid='banner-artwork-field-large-error']").exists()).toBe(true)
    expect(measureSpy).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it("blocks save and shows the mobileNotNarrower issue when the staged mobile file is wider than the large artwork", async () => {
    seedEmptyTaxonomie()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1700, height: 900, close: () => {} })),
    )

    let patchCalled = false
    let imageCalled = false
    const cleanupPatch = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}`, {
      method: "PATCH",
      handler: () => {
        patchCalled = true
        return fixtureBanner
      },
    })
    const cleanupImage = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}/image/mobile`, {
      method: "POST",
      handler: () => {
        imageCalled = true
        return fixtureBanner
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: fixtureBanner, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()

    const mobileInput = wrapper.get("[data-testid='banner-artwork-field-mobile-input']").element as HTMLInputElement
    attachFile(mobileInput, new File(["mobile-bytes"], "mobile.jpg", { type: "image/jpeg" }))
    await flushPromises()

    const issue = wrapper.get("[data-testid='banner-artwork-field-mobile-issue']")
    expect(issue.text().trim().length).toBeGreaterThan(0)

    /**
     * Save/Cancel live in `BannerPanel.vue`'s footer now, outside this form — see
     *  `banner-edit-save.test.ts` for why submitting the form directly is the right
     *  substitute for clicking a button this component no longer renders.
     */
    expect(wrapper.vm.saveDisabled).toBe(true)

    await wrapper.get("[data-testid='banner-form']").trigger("submit")
    await flushPromises()

    expect(patchCalled).toBe(false)
    expect(imageCalled).toBe(false)

    cleanupPatch()
    cleanupImage()
    wrapper.unmount()
  })
})
