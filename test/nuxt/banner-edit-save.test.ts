import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import BannerForm from "@/components/content/BannerForm.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

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

describe("banner edit save", () => {
  beforeEach(() => {
    seedEmptyTaxonomie()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 700, height: 1000, close: () => {} })),
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
  })

  it("fires no request when nothing changed and save is submitted", async () => {
    /**
     * Save/Cancel now live in `BannerPanel.vue`'s footer, outside this form, associated
     * to it only via the HTML `form` attribute — so a real browser click goes through a
     * button this component never renders. Submitting the `<form>` directly is what a
     * `form="…"`-associated external button, or pressing Enter in a field, actually
     * does, and exercises the same `@submit.prevent="onSubmit"` handler either way.
     */
    let patchCalled = false
    const cleanup = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}`, {
      method: "PATCH",
      handler: () => {
        patchCalled = true
        return fixtureBanner
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: fixtureBanner, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()

    expect(wrapper.get("[data-testid='banner-form-alt-counter']").text()).toMatch(/^\d+\/400$/)
    expect(wrapper.vm.saveDisabled).toBe(true)

    await wrapper.get("[data-testid='banner-form']").trigger("submit")
    await flushPromises()

    expect(patchCalled).toBe(false)

    cleanup()
    wrapper.unmount()
  })

  it("sends only the changed field in the patch body when one field changes", async () => {
    let observedBody: unknown
    let requestCount = 0
    const cleanup = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}`, {
      method: "PATCH",
      handler: async event => {
        requestCount += 1
        observedBody = await readBody(event)
        return { ...fixtureBanner, libelle: "Nouveau libelle" }
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: fixtureBanner, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.get("[data-testid='banner-form-libelle']").setValue("Nouveau libelle")
    await flushPromises()

    expect(wrapper.vm.saveDisabled).toBe(false)
    await wrapper.get("[data-testid='banner-form']").trigger("submit")
    await flushPromises()

    expect(requestCount).toBe(1)
    expect(observedBody).toEqual({ libelle: "Nouveau libelle" })

    cleanup()
    wrapper.unmount()
  })

  it("sends the patch then the mobile image replace, in that order, and invalidates the list once", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(apiQueryKeys.banners.all, [fixtureBanner])

    const order: string[] = []
    const cleanupPatch = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}`, {
      method: "PATCH",
      handler: () => {
        order.push("patch")
        return { ...fixtureBanner, libelle: "Nouveau libelle" }
      },
    })
    const cleanupImage = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}/image/mobile`, {
      method: "POST",
      handler: () => {
        order.push("image")
        return fixtureBanner
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: fixtureBanner, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.get("[data-testid='banner-form-libelle']").setValue("Nouveau libelle")
    await flushPromises()

    const mobileInput = wrapper.get("[data-testid='banner-artwork-field-mobile-input']").element as HTMLInputElement
    attachFile(mobileInput, new File(["mobile-bytes"], "mobile.jpg", { type: "image/jpeg" }))
    await flushPromises()

    await wrapper.get("[data-testid='banner-form']").trigger("submit")

    /**
     * Two sequential mock round trips (`PATCH` then `POST image/mobile`), each through
     * `@nuxt/test-utils`'s `node-mock-http` bridge — a single `flushPromises()` only
     * drains the first one's microtask chain, matching the polling pattern
     * `banner-panel-url-state.test.ts` already established for this bridge's teardown
     * timing.
     */
    await vi.waitFor(() => expect(order).toEqual(["patch", "image"]))
    expect(queryClient.getQueryState(apiQueryKeys.banners.all)?.isInvalidated).toBe(true)

    cleanupPatch()
    cleanupImage()
    wrapper.unmount()
  })

  it("creates a promo banner from the large artwork alone, with its placement", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 3840, height: 2372, close: () => {} })),
    )
    let observed: { emplacement: FormDataEntryValue | null; parts: string[] } | undefined
    const cleanup = registerEndpoint("/api/v1/vitrine/administration/bannieres", {
      method: "POST",
      handler: event => {
        // The mock bridge keeps the client's FormData as is: see `banner-mutations.test.ts`.
        const formData = (event.node.req as unknown as { body: FormData }).body
        observed = { emplacement: formData.get("emplacement"), parts: [...formData.keys()] }
        return {
          ...fixtureBanner,
          id: 40,
          emplacement: "promo",
          fichier_mobile: null,
          largeur_mobile: null,
          hauteur_mobile: null,
          url_mobile: null,
        }
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: null, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()

    expect((wrapper.get("[data-testid='banner-form-emplacement-principal']").element as HTMLInputElement).checked).toBe(
      true,
    )
    expect(wrapper.vm.saveDisabled).toBe(true)

    await wrapper.get("[data-testid='banner-form-emplacement-promo']").setValue(true)
    attachFile(
      wrapper.get("[data-testid='banner-artwork-field-large-input']").element as HTMLInputElement,
      new File(["large-bytes"], "promo.jpg", { type: "image/jpeg" }),
    )
    await flushPromises()
    await wrapper.get("[data-testid='banner-form-libelle']").setValue("Promo Noël")
    await wrapper.get("[data-testid='banner-form-alt']").setValue("Jusqu'à moins trente pour cent sur les téléviseurs.")
    wrapper.findComponent({ name: "ContentBannerHrefPicker" }).vm.$emit("update:modelValue", "/categorie/televiseurs")
    await flushPromises()

    expect(wrapper.vm.saveDisabled).toBe(false)
    await wrapper.get("[data-testid='banner-form']").trigger("submit")
    await vi.waitFor(() => expect(observed).toBeDefined())

    expect(observed?.emplacement).toBe("promo")
    expect(observed?.parts).toContain("large")
    expect(observed?.parts).not.toContain("mobile")

    cleanup()
    wrapper.unmount()
  })

  it("stages the removal of the saved mobile artwork, can take it back, and sends DELETE only on save", async () => {
    let deletes = 0
    const cleanup = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}/image/mobile`, {
      method: "DELETE",
      handler: () => {
        deletes += 1
        return { ...fixtureBanner, fichier_mobile: null, largeur_mobile: null, hauteur_mobile: null, url_mobile: null }
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: fixtureBanner, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()
    const field = () => wrapper.get("[data-testid='banner-artwork-field-mobile']")

    await field().get("[data-testid='banner-artwork-field-mobile-remove']").trigger("click")
    expect(field().find("[data-testid='banner-artwork-field-mobile-preview']").exists()).toBe(false)
    expect(field().find("[data-testid='banner-artwork-field-mobile-dropzone']").exists()).toBe(true)
    expect(field().text()).toContain("The phone artwork will be removed when you save.")
    expect(deletes).toBe(0)
    expect(wrapper.vm.saveDisabled).toBe(false)

    await field().get("[data-testid='banner-artwork-field-mobile-undo-remove']").trigger("click")
    expect(field().find("[data-testid='banner-artwork-field-mobile-preview']").exists()).toBe(true)
    expect(wrapper.vm.saveDisabled).toBe(true)

    await field().get("[data-testid='banner-artwork-field-mobile-remove']").trigger("click")
    await wrapper.get("[data-testid='banner-form']").trigger("submit")
    await vi.waitFor(() => expect(deletes).toBe(1))

    cleanup()
    wrapper.unmount()
  })

  it("edits a banner that has no mobile artwork: the field offers an upload, and adding one posts it", async () => {
    const withoutMobile: BanniereAdmin = {
      ...fixtureBanner,
      fichier_mobile: null,
      largeur_mobile: null,
      hauteur_mobile: null,
      url_mobile: null,
    }
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 800, height: 900, close: () => {} })),
    )
    let posted = false
    const cleanup = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}/image/mobile`, {
      method: "POST",
      handler: () => {
        posted = true
        return fixtureBanner
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: withoutMobile, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()

    expect(wrapper.find("[data-testid='banner-artwork-field-mobile-preview']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='banner-artwork-field-mobile-remove']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='banner-artwork-field-mobile-dropzone']").exists()).toBe(true)
    expect(wrapper.get("[data-testid='banner-artwork-field-mobile-detail']").text()).toContain(
      "cropped around the focus point",
    )
    expect(wrapper.find("[data-testid='banner-artwork-field-mobile-issue']").exists()).toBe(false)

    attachFile(
      wrapper.get("[data-testid='banner-artwork-field-mobile-input']").element as HTMLInputElement,
      new File(["mobile-bytes"], "mobile.jpg", { type: "image/jpeg" }),
    )
    await flushPromises()
    await wrapper.get("[data-testid='banner-form']").trigger("submit")
    await vi.waitFor(() => expect(posted).toBe(true))

    cleanup()
    wrapper.unmount()
  })

  it("moves a banner to the promo carousel with the placement alone in the patch", async () => {
    let observedBody: unknown
    const cleanup = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}`, {
      method: "PATCH",
      handler: async event => {
        observedBody = await readBody(event)
        return { ...fixtureBanner, emplacement: "promo" }
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: fixtureBanner, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()

    expect((wrapper.get("[data-testid='banner-form-emplacement-principal']").element as HTMLInputElement).checked).toBe(
      true,
    )
    expect(wrapper.find("[data-testid='banner-form-emplacement-moving']").exists()).toBe(false)

    await wrapper.get("[data-testid='banner-form-emplacement-promo']").setValue(true)
    expect(wrapper.find("[data-testid='banner-form-emplacement-moving']").exists()).toBe(true)
    await wrapper.get("[data-testid='banner-form']").trigger("submit")
    await vi.waitFor(() => expect(observedBody).toEqual({ emplacement: "promo" }))

    cleanup()
    wrapper.unmount()
  })

  it("refuses a portrait artwork in the main carousel but not in promo, and puts a new landscape one in place before moving a promo into the main carousel", async () => {
    const portraitPromo: BanniereAdmin = {
      ...fixtureBanner,
      emplacement: "promo",
      largeur_large: 1000,
      hauteur_large: 1400,
      fichier_mobile: null,
      largeur_mobile: null,
      hauteur_mobile: null,
      url_mobile: null,
    }
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 3840, height: 1250, close: () => {} })),
    )
    const order: string[] = []
    const cleanupPatch = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}`, {
      method: "PATCH",
      handler: async event => {
        order.push(`patch:${JSON.stringify(await readBody(event))}`)
        return fixtureBanner
      },
    })
    const cleanupImage = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${fixtureBanner.id}/image/large`, {
      method: "POST",
      handler: () => {
        order.push("image:large")
        return fixtureBanner
      },
    })

    const wrapper = await mountSuspended(BannerForm, {
      props: { banner: portraitPromo, formId: "test-banner-form" },
      attachTo: document.body,
    })
    await flushPromises()
    expect(wrapper.find("[data-testid='banner-artwork-field-large-issue']").exists()).toBe(false)

    await wrapper.get("[data-testid='banner-form-emplacement-principal']").setValue(true)
    expect(wrapper.get("[data-testid='banner-artwork-field-large-issue']").text()).toBe(
      "A main banner must be wider than it is tall. Put a square or portrait artwork in Promo.",
    )
    expect(wrapper.vm.saveDisabled).toBe(true)

    attachFile(
      wrapper.get("[data-testid='banner-artwork-field-large-input']").element as HTMLInputElement,
      new File(["large-bytes"], "large.jpg", { type: "image/jpeg" }),
    )
    await flushPromises()
    expect(wrapper.find("[data-testid='banner-artwork-field-large-issue']").exists()).toBe(false)

    await wrapper.get("[data-testid='banner-form']").trigger("submit")
    await vi.waitFor(() => expect(order).toEqual(["image:large", 'patch:{"emplacement":"principal"}']))

    cleanupPatch()
    cleanupImage()
    wrapper.unmount()
  })
})
