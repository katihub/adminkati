import type { Taxonomie } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import BannerHrefPicker from "@/components/content/BannerHrefPicker.vue"

const CATEGORY = {
  id: 1,
  nom: "Casques",
  slug: "casques",
  parent_id: null,
  niveau: 1,
  rayon: null,
  compte_total: 5,
  masquee: false,
}
const RAYON = { id: "rayon-1", slug: "informatique", nom: "Informatique", nom_court: "Info", compte_total: 10 }

const TAXONOMIE_FIXTURE: Taxonomie = {
  rayons: [RAYON],
  categories: [CATEGORY],
  marques: [],
}

function seedTaxonomie(fixture: Taxonomie) {
  useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], fixture)
}

function hrefOptionLabels() {
  return Array.from(document.body.querySelectorAll("[data-testid='banner-href-picker-option']")).map(element =>
    element.textContent?.trim(),
  )
}

describe("banner href picker", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("emits the /categorie/<slug> path when a category option is selected", async () => {
    seedTaxonomie(TAXONOMIE_FIXTURE)

    const wrapper = await mountSuspended(BannerHrefPicker, {
      props: { modelValue: "" },
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.get("[data-testid='banner-href-picker-trigger']").trigger("click")
    await flushPromises()

    expect(hrefOptionLabels()).toContain(CATEGORY.nom)

    const match = Array.from(document.body.querySelectorAll("[data-testid='banner-href-picker-option']")).find(
      element => element.textContent?.trim() === CATEGORY.nom,
    )
    if (!match) throw new Error(`no option found for label "${CATEGORY.nom}"`)
    match.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flushPromises()

    const emitted = wrapper.emitted("update:modelValue")
    expect(emitted).toBeDefined()
    expect(emitted?.at(-1)?.[0]).toBe(`/categorie/${CATEGORY.slug}`)

    wrapper.unmount()
  })

  it("shows a non-empty inline error when the custom path fails hrefSchema", async () => {
    seedTaxonomie({ rayons: [], categories: [], marques: [] })

    const wrapper = await mountSuspended(BannerHrefPicker, {
      props: { modelValue: "" },
      attachTo: document.body,
    })
    await flushPromises()

    // A blank value starts in picker mode (nothing to fail to match yet) — the
    // "use a custom path" toggle lives inside the popover's own content, so it has to
    // be opened first, the same as reaching any `banner-href-picker-option`. The
    // content is teleported to `document.body` (`PopoverContent`'s portal), so it's
    // reached through `document.body`, never `wrapper.get`, the same as the option
    // lookup above.
    await wrapper.get("[data-testid='banner-href-picker-trigger']").trigger("click")
    await flushPromises()

    const toggle = document.body.querySelector<HTMLButtonElement>("[data-testid='banner-href-picker-custom-toggle']")
    if (!toggle) throw new Error("no custom-path toggle found")
    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flushPromises()

    await wrapper.get("[data-testid='banner-href-picker-custom-input']").setValue("//example.com")
    await wrapper.setProps({ modelValue: "//example.com" })
    await flushPromises()

    const error = wrapper.get("[data-testid='banner-href-picker-custom-error']")
    expect(error.text().trim().length).toBeGreaterThan(0)

    wrapper.unmount()
  })
})
