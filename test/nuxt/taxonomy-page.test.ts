import type { TaxonomieResponse } from "@/types/api/taxonomie"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError, getQuery, readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "vue-sonner"
import TaxonomyPage from "@/pages/taxonomy.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const taxonomy: TaxonomieResponse = {
  rayons: [
    { id: "network", slug: "network", nom: "Network", nom_court: "Net", compte_total: 2 },
    { id: "computing", slug: "computing", nom: "Computing", nom_court: "Compute", compte_total: 7 },
  ],
  categories: [
    {
      id: 7,
      nom: "Routers",
      slug: "routers",
      parent_id: null,
      niveau: 0,
      rayon: "network",
      compte_total: 2,
      masquee: false,
    },
    {
      id: 8,
      nom: "Core routers",
      slug: "core-routers",
      parent_id: 7,
      niveau: 1,
      rayon: "network",
      compte_total: 1,
      masquee: false,
    },
  ],
  marques: [
    { nom: "TestBrand", slug: "testbrand", nombre_produits: 2 },
    { nom: "OtherBrand", slug: "otherbrand", nombre_produits: 5 },
  ],
}

function seed(roles = ["direction"]) {
  const queryClient = useNuxtApp().$queryClient
  queryClient.setQueryData(apiQueryKeys.taxonomy.all, taxonomy)
  queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  })
}

describe("taxonomy categories workspace", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("renders the default categories tree with its first level expanded", async () => {
    seed()
    const wrapper = await mountSuspended(TaxonomyPage, { route: "/taxonomy", attachTo: document.body })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='taxonomy-tab-categories']")?.getAttribute("aria-current")).toBe(
      "true",
    )
    expect(document.body.querySelector("[data-testid='category-row-7']")?.textContent).toContain("Routers")
    expect(document.body.querySelector("[data-testid='category-row-8']")?.textContent).toContain("Core routers")

    wrapper.unmount()
  })

  it("keeps a matching child and its ancestor context visible after searching", async () => {
    seed()
    const wrapper = await mountSuspended(TaxonomyPage, { route: "/taxonomy", attachTo: document.body })
    await flushPromises()

    /**
     * Search lives as a `Filters` chip (`CategoryToolbar.vue`) that's present inline
     *  from the start (`neutralCategoryFilters`) — its text input is already in the DOM,
     *  no trip through the add-filter menu needed.
     */
    const search = document.body.querySelector<HTMLInputElement>("[data-testid='category-toolbar'] input")
    Object.defineProperty(search, "value", { value: "core", configurable: true })
    search?.dispatchEvent(new Event("input"))
    await flushPromises()

    expect(document.body.querySelector("[data-testid='category-row-7']")?.getAttribute("data-context")).toBe("true")
    expect(document.body.querySelector("[data-testid='category-row-8']")?.textContent).toContain("Core routers")

    wrapper.unmount()
  })

  it("opens a route-selected category in the detail panel and keeps unavailable ids in a panel-level not-found state", async () => {
    seed()
    const selected = await mountSuspended(TaxonomyPage, { route: "/taxonomy?category=8", attachTo: document.body })
    await flushPromises()
    expect(document.body.querySelector("[data-testid='category-panel-view']")?.textContent).toContain("Core routers")
    selected.unmount()

    seed()
    const missing = await mountSuspended(TaxonomyPage, { route: "/taxonomy?category=999", attachTo: document.body })
    await flushPromises()
    expect(document.body.querySelector("[data-testid='category-panel-not-found']")).not.toBeNull()
    missing.unmount()
  })

  it("renders the Departments tab from its route and opens a selected department panel", async () => {
    seed()
    const wrapper = await mountSuspended(TaxonomyPage, {
      route: "/taxonomy?department=network",
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='taxonomy-tab-departments']")?.getAttribute("aria-current")).toBe(
      "true",
    )
    expect(document.body.querySelector("[data-testid='department-table']")?.textContent).toContain("Network")
    expect(document.body.querySelector("[data-testid='department-table']")?.textContent).toContain("Products")
    expect(document.body.querySelector("[data-testid='department-panel-view']")?.textContent).toContain("Network")
    expect(document.body.querySelector("[data-testid='department-panel-actions']")).not.toBeNull()

    wrapper.unmount()
  })

  describe("counter recalculation feedback", () => {
    const RECALCULATE = "/api/v1/catalogue/administration/taxonomie/recalculer"
    const teardown: Array<() => void> = []

    // Registered here so a failing assertion cannot leave a page, dialog or handler behind for the next test.
    afterEach(() => {
      teardown.splice(0).forEach(undo => undo())
      document.body.innerHTML = ""
    })

    async function confirmRecalculation(handler: () => unknown) {
      teardown.push(registerEndpoint(RECALCULATE, { method: "POST", handler }))
      // A recalculation refreshes the taxonomy before it reports back, so that read has to answer.
      teardown.push(
        registerEndpoint("/api/v1/catalogue/administration/taxonomie", { method: "GET", handler: () => taxonomy }),
      )
      seed()
      const wrapper = await mountSuspended(TaxonomyPage, { route: "/taxonomy", attachTo: document.body })
      teardown.push(() => wrapper.unmount())
      await flushPromises()
      document.body.querySelector<HTMLButtonElement>("[data-testid='taxonomy-recalculate-trigger']")?.click()
      await flushPromises()
      document.body.querySelector<HTMLButtonElement>("[data-testid='taxonomy-recalculate-confirm']")?.click()
    }

    function spyOnToasts() {
      const success = vi.spyOn(toast, "success").mockImplementation(() => 1)
      const failure = vi.spyOn(toast, "error").mockImplementation(() => 1)
      teardown.push(
        () => success.mockRestore(),
        () => failure.mockRestore(),
      )
      return { success, failure }
    }

    it("tells the operator when the counters were recalculated", async () => {
      const { success, failure } = spyOnToasts()
      await confirmRecalculation(() => ({ categories: 0, rayons: 12, marques: 102 }))

      await vi.waitFor(() => expect(success).toHaveBeenCalledWith("Counters recalculated."))
      expect(failure).not.toHaveBeenCalled()
    })

    it("tells the operator when the recalculation failed, and why", async () => {
      const { success, failure } = spyOnToasts()
      await confirmRecalculation(() => {
        throw createError({ statusCode: 500, statusMessage: "Server Error" })
      })

      await vi.waitFor(() =>
        expect(failure).toHaveBeenCalledWith("Could not recalculate counters.", {
          description: expect.stringContaining("The service had a problem"),
        }),
      )
      expect(success).not.toHaveBeenCalled()
    })
  })

  it("keeps counter recalculation available in every writable taxonomy tab", async () => {
    seed()
    const wrapper = await mountSuspended(TaxonomyPage, { route: "/taxonomy", attachTo: document.body })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='taxonomy-recalculate-trigger']")).not.toBeNull()

    await document.body.querySelector<HTMLButtonElement>("[data-testid='taxonomy-tab-departments']")?.click()
    await flushPromises()
    expect(document.body.querySelector("[data-testid='taxonomy-recalculate-trigger']")).not.toBeNull()

    await document.body.querySelector<HTMLButtonElement>("[data-testid='taxonomy-tab-brands']")?.click()
    await flushPromises()
    expect(document.body.querySelector("[data-testid='taxonomy-recalculate-trigger']")).not.toBeNull()

    wrapper.unmount()
  })

  it("sorts Departments by product count and loads department products with the department filter", async () => {
    seed()
    const requests: ReturnType<typeof getQuery>[] = []
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "GET",
      handler: event => {
        const query = getQuery(event)
        requests.push(query)
        return {
          total: 1,
          page: Number(query.page),
          taille: 24,
          pages: 1,
          produits: [
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
              categorie_principale_id: 7,
              retire_le: null,
              categorie: "Routers",
              rayon: "network",
              image: null,
            },
          ],
        }
      },
    })
    const wrapper = await mountSuspended(TaxonomyPage, {
      route: "/taxonomy?department=network",
      attachTo: document.body,
    })
    await flushPromises()

    await document.body.querySelector<HTMLElement>("[data-testid='department-sort-products']")?.click()
    const rows = [...document.body.querySelectorAll("[data-testid^='department-row-']")]
    expect(rows[0]?.textContent).toContain("Network")

    await document.body.querySelector<HTMLButtonElement>("[data-testid='department-panel-tab-products']")?.click()
    await vi.waitFor(() => expect(document.body.querySelector("[data-testid='category-product-card']")).not.toBeNull())
    expect(requests[0]).toEqual(expect.objectContaining({ rayon: "network", page: "1" }))

    cleanup()
    wrapper.unmount()
  })

  it("creates a Department from the panel footer with the backend request shape", async () => {
    seed()
    let observedBody: unknown
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/rayons", {
      method: "POST",
      handler: async event => {
        observedBody = await readBody(event)
        return { ...taxonomy.rayons[0], ...(observedBody as object) }
      },
    })
    const wrapper = await mountSuspended(TaxonomyPage, { route: "/taxonomy", attachTo: document.body })
    await flushPromises()

    await document.body.querySelector<HTMLButtonElement>("[data-testid='taxonomy-tab-departments']")?.click()
    await flushPromises()
    await document.body.querySelector<HTMLButtonElement>("[data-testid='department-toolbar-add']")?.click()
    await vi.waitFor(() => expect(document.body.querySelector("[data-testid='department-form']")).not.toBeNull())

    const setInput = (testid: string, value: string) => {
      const input = document.body.querySelector<HTMLInputElement>(`[data-testid='${testid}']`)
      expect(input).not.toBeNull()
      if (!input) return
      input.value = value
      input.dispatchEvent(new Event("input", { bubbles: true }))
    }
    setInput("department-form-id", "networking")
    setInput("department-form-slug", "networking")
    setInput("department-form-name", "Networking")
    setInput("department-form-short-name", "Net")
    await flushPromises()
    const save = document.body.querySelector<HTMLButtonElement>("[data-testid='department-panel-save']")
    expect(save).not.toBeNull()
    expect(save?.disabled).toBe(false)
    await save?.click()
    await flushPromises()

    expect(observedBody).toEqual({ id: "networking", slug: "networking", nom: "Networking", nom_court: "Net" })

    cleanup()
    wrapper.unmount()
  })

  it("renders the Brands tab from its route with a read-only detail panel", async () => {
    seed()
    const wrapper = await mountSuspended(TaxonomyPage, { route: "/taxonomy?brand=testbrand", attachTo: document.body })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='taxonomy-tab-brands']")?.getAttribute("aria-current")).toBe(
      "true",
    )
    expect(document.body.querySelector("[data-testid='brand-table']")?.textContent).toContain("TestBrand")
    expect(document.body.querySelector("[data-testid='brand-table']")?.textContent).toContain("Products")
    expect(document.body.querySelector("[data-testid='brand-panel-view']")?.textContent).toContain("testbrand")
    expect(document.body.querySelector("[data-testid='brand-panel-actions']")).toBeNull()

    wrapper.unmount()
  })

  it("sorts Brands by product count and loads brand products by brand name", async () => {
    seed()
    const requests: ReturnType<typeof getQuery>[] = []
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits", {
      method: "GET",
      handler: event => {
        const query = getQuery(event)
        requests.push(query)
        return {
          total: 1,
          page: Number(query.page),
          taille: 24,
          pages: 1,
          produits: [
            {
              id: 19,
              slug: "edge-router",
              nom: "Edge router",
              prix: 125000,
              prix_reference: null,
              remise_pct: null,
              statut_stock: "en_stock",
              quantite_stock: 10,
              marque: "TestBrand",
              categorie_principale_id: 7,
              retire_le: null,
              categorie: "Routers",
              rayon: "network",
              image: null,
            },
          ],
        }
      },
    })
    const wrapper = await mountSuspended(TaxonomyPage, { route: "/taxonomy?brand=testbrand", attachTo: document.body })
    await flushPromises()

    await document.body.querySelector<HTMLElement>("[data-testid='brand-sort-products']")?.click()
    const rows = [...document.body.querySelectorAll("[data-testid^='brand-row-']")]
    expect(rows[0]?.textContent).toContain("TestBrand")

    await document.body.querySelector<HTMLButtonElement>("[data-testid='brand-panel-tab-products']")?.click()
    await vi.waitFor(() => expect(document.body.querySelector("[data-testid='category-product-card']")).not.toBeNull())
    expect(requests[0]).toEqual(expect.objectContaining({ marque: "TestBrand", page: "1" }))

    cleanup()
    wrapper.unmount()
  })

  it("keeps Department write actions out of the workspace for comptoir users", async () => {
    seed(["comptoir"])
    const wrapper = await mountSuspended(TaxonomyPage, {
      route: "/taxonomy?department=network",
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='department-toolbar-add']")).toBeNull()
    expect(document.body.querySelector("[data-testid='department-panel-actions']")).toBeNull()

    wrapper.unmount()
  })

  it("clears a selected department when switching back to Categories", async () => {
    seed()
    const wrapper = await mountSuspended(TaxonomyPage, {
      route: "/taxonomy?department=network",
      attachTo: document.body,
    })
    await flushPromises()

    await document.body.querySelector<HTMLButtonElement>("[data-testid='taxonomy-tab-categories']")?.click()
    await flushPromises()

    expect(document.body.querySelector("[data-testid='category-tree-table']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='department-panel']")).toBeNull()

    wrapper.unmount()
  })
})
