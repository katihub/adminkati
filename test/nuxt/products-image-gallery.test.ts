import type { ProductImage } from "@/types/api/produits"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import ProductsImageGallery from "@/components/products/ImageGallery.vue"

function makeImages(): ProductImage[] {
  return [
    { rang: 1, url: "https://example.com/a.jpg", chemin_local: null, octets: null, alt: "A" },
    { rang: 2, url: "https://example.com/b.jpg", chemin_local: null, octets: null, alt: "B" },
    { rang: 3, url: "https://example.com/c.jpg", chemin_local: null, octets: null, alt: "C" },
  ]
}

/**
 * happy-dom's `HTMLInputElement.files` setter can't take a real `FileList` from a test —
 *  redefining the property on the instance before dispatching `change` is the standard
 *  escape hatch (see `banner-artwork-field.test.ts`).
 */
function attachFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

const PRODUCT_ID = 9
const PRODUITS_PATH = "/api/v1/catalogue/administration/produits"

describe("products image gallery", () => {
  it("switches the hero preview to a clicked thumbnail without reordering the list", async () => {
    const images = makeImages()
    const wrapper = await mountSuspended(ProductsImageGallery, { props: { modelValue: images, productId: PRODUCT_ID } })

    const thumbnails = wrapper.findAll("[data-testid='products-image-gallery-thumbnail']")
    await thumbnails[2]!.trigger("click")

    expect(wrapper.get("[data-testid='products-image-gallery-hero']").find("img").attributes("src")).toBe(
      "https://example.com/c.jpg",
    )

    // the thumbnail row itself keeps the original order — only the preview changed
    const thumbnailSrcs = wrapper
      .findAll("[data-testid='products-image-gallery-thumbnail'] img")
      .map(img => img.attributes("src"))
    expect(thumbnailSrcs).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
      "https://example.com/c.jpg",
    ])

    // selecting a preview is a local UI concern, not a data change
    expect(wrapper.emitted("update:modelValue")).toBeUndefined()

    wrapper.unmount()
  })

  it("removes an image without changing the hero preview it did not affect", async () => {
    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: makeImages(), productId: PRODUCT_ID },
    })

    const removeButtons = wrapper.findAll("[data-testid='products-image-gallery-thumbnail-remove']")
    await removeButtons[2]!.trigger("click")

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [
        [
          { rang: 1, url: "https://example.com/a.jpg", chemin_local: null, octets: null, alt: "A" },
          { rang: 2, url: "https://example.com/b.jpg", chemin_local: null, octets: null, alt: "B" },
        ],
      ],
    ])

    wrapper.unmount()
  })

  it("clicking a thumbnail's remove button does not also switch the preview", async () => {
    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: makeImages(), productId: PRODUCT_ID },
    })

    const removeButtons = wrapper.findAll("[data-testid='products-image-gallery-thumbnail-remove']")
    await removeButtons[2]!.trigger("click")

    // hero still shows the first image — removing index 2 never selected it
    expect(wrapper.get("[data-testid='products-image-gallery-hero']").find("img").attributes("src")).toBe(
      "https://example.com/a.jpg",
    )

    wrapper.unmount()
  })

  it("adds the image from the URL input on confirm and closes the dialog", async () => {
    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: [], productId: PRODUCT_ID },
      attachTo: document.body,
    })

    await wrapper.get("[data-testid='products-image-gallery-add-tile']").trigger("click")
    await flushPromises()

    const urlInput = document.body.querySelector<HTMLInputElement>("[data-testid='products-image-gallery-url-input']")!
    urlInput.value = "https://example.com/new.jpg"
    urlInput.dispatchEvent(new Event("input"))
    await flushPromises()

    document.body.querySelector<HTMLButtonElement>("[data-testid='products-image-gallery-add-confirm']")?.click()
    await flushPromises()

    expect(wrapper.emitted("update:modelValue")).toEqual([
      [[{ rang: 1, url: "https://example.com/new.jpg", chemin_local: null, octets: null, alt: null }]],
    ])

    wrapper.unmount()
  })

  it("opens the hero image full screen when clicked", async () => {
    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: makeImages(), productId: PRODUCT_ID },
      attachTo: document.body,
    })

    expect(document.body.querySelector("[data-testid='products-image-gallery-fullscreen']")).toBeNull()

    await wrapper.get("[data-testid='products-image-gallery-hero-expand']").trigger("click")
    await flushPromises()

    const fullscreen = document.body.querySelector("[data-testid='products-image-gallery-fullscreen']")
    expect(fullscreen).not.toBeNull()
    expect(
      fullscreen?.querySelector("[data-testid='products-image-gallery-fullscreen-image']")?.getAttribute("src"),
    ).toBe("https://example.com/a.jpg")

    wrapper.unmount()
  })

  it("does not offer a full screen expand control when there is no image", async () => {
    const wrapper = await mountSuspended(ProductsImageGallery, { props: { modelValue: [], productId: PRODUCT_ID } })

    expect(wrapper.find("[data-testid='products-image-gallery-hero-expand']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("cancels the dialog without emitting", async () => {
    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: [], productId: PRODUCT_ID },
      attachTo: document.body,
    })

    await wrapper.get("[data-testid='products-image-gallery-add-tile']").trigger("click")
    await flushPromises()

    document.body.querySelector<HTMLButtonElement>("[data-testid='products-image-gallery-add-cancel']")?.click()
    await flushPromises()

    expect(wrapper.emitted("update:modelValue")).toBeUndefined()

    wrapper.unmount()
  })

  it("uploads a staged file and closes the dialog once the backend confirms it", async () => {
    let uploadCalled = false
    const cleanup = registerEndpoint(`${PRODUITS_PATH}/${PRODUCT_ID}/images`, {
      method: "POST",
      handler: () => {
        uploadCalled = true
        return {
          id: PRODUCT_ID,
          images: [
            {
              rang: 0,
              url: "https://cdn.example.com/stored.webp",
              chemin_local: "produits/9/stored.webp",
              octets: 4096,
              alt: null,
            },
          ],
        }
      },
    })

    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: [], productId: PRODUCT_ID },
      attachTo: document.body,
    })

    await wrapper.get("[data-testid='products-image-gallery-add-tile']").trigger("click")
    await flushPromises()

    const input = document.body.querySelector<HTMLInputElement>("[data-testid='products-image-gallery-file-input']")!
    attachFile(input, new File([new Uint8Array(1024)], "photo.webp", { type: "image/webp" }))
    await flushPromises()
    expect(uploadCalled).toBe(false)

    document.body.querySelector<HTMLButtonElement>("[data-testid='products-image-gallery-add-confirm']")?.click()
    await flushPromises()
    await flushPromises()

    expect(uploadCalled).toBe(true)
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      [
        {
          rang: 0,
          url: "https://cdn.example.com/stored.webp",
          chemin_local: "produits/9/stored.webp",
          octets: 4096,
          alt: null,
        },
      ],
    ])

    cleanup()
    wrapper.unmount()
  })

  it("rejects an unsupported or oversized file before it ever reaches the upload endpoint", async () => {
    let uploadCalled = false
    const cleanup = registerEndpoint(`${PRODUITS_PATH}/${PRODUCT_ID}/images`, {
      method: "POST",
      handler: () => {
        uploadCalled = true
        return { id: PRODUCT_ID, images: [] }
      },
    })

    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: [], productId: PRODUCT_ID },
      attachTo: document.body,
    })

    await wrapper.get("[data-testid='products-image-gallery-add-tile']").trigger("click")
    await flushPromises()

    const input = document.body.querySelector<HTMLInputElement>("[data-testid='products-image-gallery-file-input']")!
    attachFile(input, new File([new Uint8Array(16)], "notes.gif", { type: "image/gif" }))
    await flushPromises()

    expect(
      document.body.querySelector("[data-testid='products-image-gallery-add-error']")?.textContent?.trim().length,
    ).toBeGreaterThan(0)
    expect(uploadCalled).toBe(false)
    expect(document.body.querySelector("[data-testid='products-image-gallery-add-dialog']")).not.toBeNull()

    cleanup()
    wrapper.unmount()
  })

  it("shows an inline error and leaves the image list unchanged when the upload request fails", async () => {
    let uploadAttempted = false
    const cleanup = registerEndpoint(`${PRODUITS_PATH}/${PRODUCT_ID}/images`, {
      method: "POST",
      handler: () => {
        uploadAttempted = true
        throw createError({ statusCode: 500 })
      },
    })

    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: [], productId: PRODUCT_ID },
      attachTo: document.body,
    })

    await wrapper.get("[data-testid='products-image-gallery-add-tile']").trigger("click")
    await flushPromises()

    const input = document.body.querySelector<HTMLInputElement>("[data-testid='products-image-gallery-file-input']")!
    attachFile(input, new File([new Uint8Array(1024)], "photo.jpg", { type: "image/jpeg" }))
    await flushPromises()

    document.body.querySelector<HTMLButtonElement>("[data-testid='products-image-gallery-add-confirm']")?.click()
    await flushPromises()

    expect(uploadAttempted).toBe(true)
    expect(
      document.body.querySelector("[data-testid='products-image-gallery-add-error']")?.textContent?.trim().length,
    ).toBeGreaterThan(0)
    expect(wrapper.emitted("update:modelValue")).toBeUndefined()

    cleanup()
    wrapper.unmount()
  })

  it("still takes a file in add mode, and hands it up instead of uploading it", async () => {
    /* LA ZONE DE DÉPÔT ÉTAIT DÉSACTIVÉE SANS IDENTIFIANT, et c'était une
       impasse plutôt qu'une garde : téléverser exige un produit existant
       (`POST /produits/:id/images`), donc créer une fiche obligeait à
       héberger l'image ailleurs d'abord et à en coller l'URL. Le fichier est
       désormais RETENU — le formulaire l'envoie dès que la création rend
       l'identifiant — et c'est ce que vérifie `stageLocal`. */
    const wrapper = await mountSuspended(ProductsImageGallery, {
      props: { modelValue: [], productId: null },
      attachTo: document.body,
    })

    await wrapper.get("[data-testid='products-image-gallery-add-tile']").trigger("click")
    await flushPromises()

    const input = document.body.querySelector<HTMLInputElement>("[data-testid='products-image-gallery-file-input']")!
    expect(input.disabled).toBe(false)

    const fichier = new File(["x"], "onduleur.jpg", { type: "image/jpeg" })
    Object.defineProperty(input, "files", { value: [fichier], configurable: true })
    input.dispatchEvent(new Event("change", { bubbles: true }))
    await flushPromises()

    const confirmer = document.body.querySelector("[data-testid='products-image-gallery-add-confirm']")
    confirmer?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flushPromises()

    /* Sur le nom, pas sur l'identité : le fichier traverse une frontière
       d'événement et arrive cloné — `toBe` comparerait deux références
       distinctes d'un contenu identique. */
    expect((wrapper.emitted("stageLocal")?.[0]?.[0] as File | undefined)?.name).toBe("onduleur.jpg")

    wrapper.unmount()
  })

  it("deletes a stored image through the dedicated endpoint using its real server rang, not a client-renumbered one", async () => {
    let deleteCalled = false
    const cleanup = registerEndpoint(`${PRODUITS_PATH}/${PRODUCT_ID}/images/5`, {
      method: "DELETE",
      handler: () => {
        deleteCalled = true
        return { id: PRODUCT_ID, images: [] }
      },
    })

    const images: ProductImage[] = [
      { rang: 1, url: "https://example.com/a.jpg", chemin_local: null, octets: null, alt: "A" },
      {
        rang: 5,
        url: "https://cdn.example.com/stored.webp",
        chemin_local: "produits/9/stored.webp",
        octets: 4096,
        alt: null,
      },
    ]
    const wrapper = await mountSuspended(ProductsImageGallery, { props: { modelValue: images, productId: PRODUCT_ID } })

    const removeButtons = wrapper.findAll("[data-testid='products-image-gallery-thumbnail-remove']")
    await removeButtons[1]!.trigger("click")
    await flushPromises()
    await flushPromises()

    expect(deleteCalled).toBe(true)
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      [{ rang: 1, url: "https://example.com/a.jpg", chemin_local: null, octets: null, alt: "A" }],
    ])

    cleanup()
    wrapper.unmount()
  })
})
