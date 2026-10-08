import type { Categorie, Rayon } from "@/types/api/taxonomie"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { describe, expect, it, vi } from "vitest"
import CategoryDetailPanel from "@/components/taxonomy/CategoryDetailPanel.vue"
import CategoryForm from "@/components/taxonomy/CategoryForm.vue"
import CategoryPanelActions from "@/components/taxonomy/CategoryPanelActions.vue"
import CategoryTreeTable from "@/components/taxonomy/CategoryTreeTable.vue"
import { installFakeIntersectionObserver } from "./fake-intersection-observer"

const departments: Rayon[] = [{ id: "network", slug: "network", nom: "Network", nom_court: "Net", compte_total: 2 }]
const root: Categorie = {
  id: 7,
  nom: "Routers",
  slug: "routers",
  parent_id: null,
  niveau: 0,
  rayon: "network",
  compte_total: 2,
  masquee: false,
}
const child: Categorie = {
  id: 8,
  nom: "Core routers",
  slug: "core-routers",
  parent_id: 7,
  niveau: 1,
  rayon: "network",
  compte_total: 1,
  masquee: false,
}

describe("category workspace components", () => {
  it("keeps write actions out of the detail panel for comptoir users", async () => {
    const wrapper = await mountSuspended(CategoryDetailPanel, {
      attachTo: document.body,
      props: { open: true, category: root, canWrite: false },
    })

    expect(document.body.querySelector("[data-testid='category-panel-view']")?.textContent).toContain("Routers")
    expect(document.body.querySelector("[data-testid='category-panel-actions']")).toBeNull()

    wrapper.unmount()
  })

  it("exposes edit, visibility, and delete intent only to direction users", async () => {
    const wrapper = await mountSuspended(CategoryDetailPanel, {
      attachTo: document.body,
      props: { open: true, category: root, canWrite: true },
    })

    expect(document.body.querySelector("[data-testid='category-panel-edit']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='category-panel-visibility']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='category-panel-delete']")).not.toBeNull()

    wrapper.unmount()
  })

  it("keeps a context ancestor selectable while exposing its child hierarchy", async () => {
    const wrapper = await mountSuspended(CategoryTreeTable, {
      props: {
        nodes: [{ category: root, children: [{ category: child, children: [] }] }],
        expandedIds: new Set([7]),
        matchingIds: new Set([8]),
      },
    })

    await wrapper.get("[data-testid='category-row-7']").trigger("click")

    expect(wrapper.get("[data-testid='category-row-8']").text()).toContain("Core routers")
    expect(wrapper.emitted("select")).toEqual([[root]])
  })

  it("submits only fields changed from the loaded category", async () => {
    const wrapper = await mountSuspended(CategoryForm, {
      props: { category: root, categories: [root, child], departments, pending: false },
    })

    await wrapper.get("[data-testid='category-form-name']").setValue("Updated routers")
    await wrapper.get("[data-testid='category-form']").trigger("submit")

    expect(wrapper.emitted("submit")).toEqual([[{ nom: "Updated routers" }]])
  })

  it("submits a new category under the parent selected from the dropdown", async () => {
    const wrapper = await mountSuspended(CategoryForm, {
      attachTo: document.body,
      props: { category: null, categories: [root, child], departments, pending: false },
    })

    await wrapper.get("[data-testid='category-form-name']").setValue("Switches")
    wrapper
      .get("[data-testid='category-form-parent']")
      .element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }))
    await flushPromises()

    const parentOption = document.body.querySelector<HTMLElement>("[data-testid='category-form-parent-option-7']")
    expect(parentOption).not.toBeNull()
    parentOption?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }))
    await flushPromises()

    await wrapper.get("[data-testid='category-form']").trigger("submit")

    expect(wrapper.emitted("submit")).toEqual([[{ nom: "Switches", slug: "switches", parent_id: 7 }]])
    wrapper.unmount()
  })

  it("submits a root category with the department selected from the dropdown", async () => {
    const wrapper = await mountSuspended(CategoryForm, {
      attachTo: document.body,
      props: { category: null, categories: [root, child], departments, pending: false },
    })

    await wrapper.get("[data-testid='category-form-name']").setValue("Switches")
    wrapper
      .get("[data-testid='category-form-department']")
      .element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }))
    await flushPromises()

    const departmentOption = document.body.querySelector<HTMLElement>(
      "[data-testid='category-form-department-option-network']",
    )
    expect(departmentOption).not.toBeNull()
    departmentOption?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }))
    await flushPromises()

    await wrapper.get("[data-testid='category-form']").trigger("submit")

    /* `parent_id: null` EST ATTENDU, ET EXPLICITEMENT. Omise, la clé était
       ignorée par le service — qui ne lit que ce qui est présent — et
       détacher une catégorie vers la racine se terminait sans erreur sans
       rien changer. Une action qui ment sur son succès est pire qu'un refus. */
    expect(wrapper.emitted("submit")).toEqual([
      [{ nom: "Switches", slug: "switches", rayon_id: "network", parent_id: null }],
    ])
    wrapper.unmount()
  })

  it("submits a new category when Save Changes is pressed in the panel footer", async () => {
    const form = await mountSuspended(CategoryForm, {
      attachTo: document.body,
      props: { category: null, categories: [root, child], departments, pending: false },
    })
    await form.get("[data-testid='category-form-name']").setValue("Switches")
    form
      .get("[data-testid='category-form-parent']")
      .element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }))
    await flushPromises()
    document.body
      .querySelector<HTMLElement>("[data-testid='category-form-parent-option-7']")
      ?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }))
    await flushPromises()

    const actions = await mountSuspended(CategoryPanelActions, {
      attachTo: document.body,
      props: { category: null, creating: true, editing: false, dirty: true, pending: false },
    })
    await actions.get("[data-testid='category-panel-save']").trigger("click")
    await flushPromises()

    expect(form.emitted("submit")).toEqual([[{ nom: "Switches", slug: "switches", parent_id: 7 }]])

    actions.unmount()
    form.unmount()
  })

  it("shows the selected category's child hierarchy in the Overview tab", async () => {
    const wrapper = await mountSuspended(CategoryDetailPanel, {
      attachTo: document.body,
      props: { open: true, category: root, categories: [root, child], canWrite: false },
    })

    expect(document.body.querySelector("[data-testid='category-panel-subcategories']")?.textContent).toContain(
      "Core routers",
    )

    wrapper.unmount()
  })

  it("lazily fetches every category product page and renders the required card details", async () => {
    const requests: ReturnType<typeof getQuery>[] = []
    const observer = installFakeIntersectionObserver()
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "GET",
      handler: event => {
        const query = getQuery(event)
        requests.push(query)
        return {
          total: 2,
          page: Number(query.page),
          taille: 24,
          pages: 2,
          produits:
            Number(query.page) === 1
              ? [
                  {
                    id: 19,
                    slug: "edge-router",
                    nom: "Edge router",
                    prix: 125000,
                    prix_reference: null,
                    remise_pct: null,
                    statut_stock: "en_stock",
                    quantite_stock: 10,
                    marque: null,
                    categorie_principale_id: 8,
                    retire_le: null,
                    categorie: "Core routers",
                    rayon: "network",
                    image: "/images/edge-router.jpg",
                  },
                ]
              : [
                  {
                    id: 20,
                    slug: "mesh-node",
                    nom: "Mesh node",
                    prix: 99000,
                    prix_reference: null,
                    remise_pct: null,
                    statut_stock: "rupture",
                    quantite_stock: 0,
                    marque: null,
                    categorie_principale_id: 8,
                    retire_le: null,
                    categorie: "Core routers",
                    rayon: "network",
                    image: null,
                  },
                ],
        }
      },
    })
    const wrapper = await mountSuspended(CategoryDetailPanel, {
      attachTo: document.body,
      props: { open: true, category: root, categories: [root, child], canWrite: false },
    })

    expect(requests).toHaveLength(0)
    await document.body.querySelector<HTMLButtonElement>("[data-testid='category-panel-tab-products']")?.click()
    await flushPromises()

    expect(requests).toEqual([expect.objectContaining({ categorie: "7", etat: "tous", taille: "24", page: "1" })])
    await vi.waitFor(() => expect(document.body.querySelector("[data-testid='category-product-card']")).not.toBeNull())
    const card = document.body.querySelector("[data-testid='category-product-card']")
    expect(card?.querySelector("[data-testid='category-product-image']")).not.toBeNull()
    expect(card?.textContent).toContain("Edge router")
    expect(card?.textContent).toContain("125")
    expect(card?.querySelector("[data-testid='category-product-stock']")?.textContent).toContain("In stock")
    expect(card?.closest("a")?.getAttribute("href")).toBe("/products?id=19")

    expect(requests).toHaveLength(1)
    observer.setVisible(true)
    await vi.waitFor(() =>
      expect(document.body.querySelectorAll("[data-testid='category-product-card']")).toHaveLength(2),
    )
    expect(requests[1]).toMatchObject({ categorie: "7", page: "2" })
    expect(document.body.textContent).toContain("Mesh node")

    observer.restore()
    cleanup()
    wrapper.unmount()
  })
})
