import type { Taxonomie } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import CategoryPicker from "@/components/products/CategoryPicker.vue"

// Deliberately distinct `id` vs `slug` per rayon — the bug this test locks down was the
// component joining categories to the department by `rayon.slug` while `category.rayon` actually
// holds `rayon.id`. If `id` and `slug` ever coincided, a wrong join could still pass by accident.
const RAYON_INFORMATIQUE = {
  id: "rayon-info-id",
  slug: "informatique-slug",
  nom: "Informatique",
  nom_court: "Info",
  compte_total: 20,
}
const RAYON_MAISON = {
  id: "rayon-maison-id",
  slug: "maison-slug",
  nom: "Maison",
  nom_court: "Maison",
  compte_total: 15,
}

const CATEGORY_A = {
  id: 1,
  nom: "Casques",
  slug: "casques",
  parent_id: null,
  niveau: 1,
  rayon: RAYON_INFORMATIQUE.id,
  compte_total: 10,
  masquee: false,
}
const CATEGORY_B = {
  id: 2,
  nom: "Chargeurs",
  slug: "chargeurs",
  parent_id: null,
  niveau: 1,
  rayon: RAYON_INFORMATIQUE.id,
  compte_total: 6,
  masquee: false,
}
const CATEGORY_C = {
  id: 3,
  nom: "Canapes",
  slug: "canapes",
  parent_id: null,
  niveau: 1,
  rayon: RAYON_MAISON.id,
  compte_total: 4,
  masquee: false,
}

const TAXONOMIE_FIXTURE: Taxonomie = {
  rayons: [RAYON_INFORMATIQUE, RAYON_MAISON],
  categories: [CATEGORY_A, CATEGORY_B, CATEGORY_C],
  marques: [{ nom: "Anker", slug: "anker", nombre_produits: 12, logo_url: null }],
}

function seedTaxonomie() {
  useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], TAXONOMIE_FIXTURE)
}

/**
 * `attachTo: document.body` matters here for the same reason it does in
 * `products-lifecycle.test.ts` — both the `ui/select` content and the `ui/popover`+`ui/command`
 * content this component opens are teleported out of the component's own tree, so they only ever
 * show up under a real `document.body.querySelector`, never under `wrapper.find`.
 */
function mount() {
  return mountSuspended(CategoryPicker, {
    props: { principalId: null, secondaryIds: [], marque: null },
    attachTo: document.body,
  })
}

/**
 * reka-ui's `SelectTrigger` (`node_modules/reka-ui/dist/Select/SelectTrigger.js`) opens on a real
 * `pointerdown` — checked via `event.button === 0`, not a `click` handler — and its handler calls
 * `event.target.hasPointerCapture(event.pointerId)`. Confirmed empirically against happy-dom
 * (`Element.hasPointerCapture` is implemented as a plain `Set.has` lookup that never throws), so a
 * real `PointerEvent` dispatch opens it with no polyfill needed.
 */
function openRayonSelect(trigger: Element) {
  trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }))
}

/**
 * reka-ui's `SelectItem` commits on `pointerup`, mirroring the trigger's `pointerdown` — also
 * confirmed empirically to work unpolyfilled in happy-dom. The item is reached through
 * `document.body` because `SelectContent` is teleported (`SelectPortal`) once the select opens.
 */
function pickRayon(label: string) {
  const item = Array.from(document.body.querySelectorAll("[data-slot='select-item']")).find(
    element => element.textContent?.trim() === label,
  )
  if (!item) throw new Error(`no rayon select item found for label "${label}"`)
  item.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }))
}

function principalOptionLabels() {
  return Array.from(document.body.querySelectorAll("[data-slot='command-item']")).map(element =>
    element.textContent?.trim(),
  )
}

describe("products category picker", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows categories from every department before a department is selected", async () => {
    seedTaxonomie()
    const wrapper = await mount()
    await flushPromises()

    await wrapper.get("[data-testid='products-category-picker-principal']").trigger("click")
    await flushPromises()

    const labels = principalOptionLabels()
    expect(labels).toContain(CATEGORY_A.nom)
    expect(labels).toContain(CATEGORY_B.nom)
    expect(labels).toContain(CATEGORY_C.nom)

    wrapper.unmount()
  })

  it("narrows the principal-category list to only the selected department's categories", async () => {
    seedTaxonomie()
    const wrapper = await mount()
    await flushPromises()

    openRayonSelect(wrapper.get("[data-testid='products-category-picker-rayon']").element)
    await flushPromises()
    pickRayon(RAYON_INFORMATIQUE.nom)
    await flushPromises()

    await wrapper.get("[data-testid='products-category-picker-principal']").trigger("click")
    await flushPromises()

    const labels = principalOptionLabels()
    expect(labels).toContain(CATEGORY_A.nom)
    expect(labels).toContain(CATEGORY_B.nom)
    expect(labels).not.toContain(CATEGORY_C.nom)

    wrapper.unmount()
  })
})
