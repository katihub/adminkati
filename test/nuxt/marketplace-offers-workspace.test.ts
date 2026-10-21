import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import MarketplaceOffersWorkspace from "@/components/operations/MarketplaceOffersWorkspace.vue"

const offer = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  referenceVendeur: `REF-${id}`,
  statut: "publiee",
  titre: `Produit ${id}`,
  libelleVariante: null,
  prixFcfa: 150000,
  prixReferenceFcfa: null,
  quantiteMinimale: 1,
  publieLe: "2026-10-17T10:00:00.000Z",
  creeLe: "2026-10-17T10:00:00.000Z",
  verifieParKatiLe: null,
  produit: {
    id: `p-${id}`,
    nom: `Produit ${id}`,
    slug: `produit-${id}`,
    statut: "actif",
    marque: "HP",
    categorie: "Informatique",
    image: null,
  },
  boutique: {
    id: "b1",
    nom: "NowTech",
    slug: "nowtech",
    statut: "active",
    suiviStock: true,
    vendeur: { nomLegal: "NowTech Center SARL", statut: "actif" },
  },
  stock: { suivi: true, quantite: 25, reservee: 0, disponible: 25 },
  ...overrides,
})

const PAGE = {
  elements: [
    offer("o1"),
    offer("o2", { statut: "brouillon", stock: { suivi: true, quantite: 0, reservee: 0, disponible: 0 } }),
    offer("o3", {
      boutique: {
        id: "b2",
        nom: "Atelier Mballa",
        slug: "atelier",
        statut: "active",
        suiviStock: false,
        vendeur: { nomLegal: "Awa Mballa", statut: "actif" },
      },
      stock: { suivi: false, quantite: 0, reservee: 0, disponible: null },
    }),
  ],
  pagination: { page: 1, taille: 50, total: 120, pages: 3 },
  compteurs: { publiee: 118, brouillon: 2 },
  boutiques: [
    { id: "b1", nom: "NowTech", offres: 119 },
    { id: "b2", nom: "Atelier Mballa", offres: 1 },
  ],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

describe("marketplace offers workspace", () => {
  it("lists every shop's offers, passes the filters to the API and pages through them", async () => {
    const queries: Record<string, unknown>[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/administration/offres", {
        method: "GET",
        handler: event => {
          const query = getQuery(event)
          queries.push(query)
          return { ...PAGE, pagination: { ...PAGE.pagination, page: Number(query.page ?? 1) } }
        },
      }),
      registerEndpoint("/api/v1/marketplace/categories/administration", { method: "GET", handler: () => [] }),
    ]
    const wrapper = await mountSuspended(MarketplaceOffersWorkspace, { attachTo: document.body })
    await flushPromises()

    expect(queries[0]).toEqual({ page: "1", taille: "50" })
    expect(wrapper.get("[data-testid='marketplace-offers-total']").text()).toBe("120 offers")
    expect(wrapper.get("[data-testid='marketplace-offers-counter-publiee']").text()).toContain("118")
    expect(wrapper.get("[data-testid='marketplace-offer-status-o2']").text()).toBe("Drafts")
    expect(wrapper.get("[data-testid='marketplace-offer-stock-o1']").text()).toBe("25")
    expect(wrapper.get("[data-testid='marketplace-offer-stock-o2']").classes()).toContain("text-destructive")
    expect(wrapper.get("[data-testid='marketplace-offer-stock-o3']").text()).toBe("Not tracked")
    expect(wrapper.get("[data-testid='marketplace-offers-shop']").text()).toContain("NowTech (119)")

    await wrapper.get("[data-testid='marketplace-offers-shop']").setValue("b1")
    await wrapper.get("[data-testid='marketplace-offers-sort']").setValue("prix_desc")
    await wrapper.get("[data-testid='marketplace-offers-stock']").setValue("rupture")
    await flushPromises()
    await vi.waitFor(() =>
      expect(queries.at(-1)).toEqual({ boutiqueId: "b1", tri: "prix_desc", stock: "rupture", page: "1", taille: "50" }),
    )

    // The pager waits for the current page before moving on.
    const next = () => wrapper.get("[data-testid='marketplace-offers-next']")
    await vi.waitFor(() => expect(next().attributes("disabled")).toBeUndefined())
    await next().trigger("click")
    await vi.waitFor(() => expect(queries.at(-1)).toMatchObject({ boutiqueId: "b1", page: "2" }))
    await vi.waitFor(() => expect(wrapper.get("[data-testid='marketplace-offers-page']").text()).toBe("Page 2 of 3"))

    // A new criterion starts again from the first page.
    await wrapper.get("[data-testid='marketplace-offers-counter-brouillon']").trigger("click")
    await vi.waitFor(() => expect(queries.at(-1)).toMatchObject({ statut: "brouillon", page: "1" }))

    // Clearing returns to the unfiltered first page, served from the cache of the first load.
    await wrapper.get("[data-testid='marketplace-offers-clear']").trigger("click")
    await flushPromises()
    for (const filter of ["shop", "status", "stock"])
      expect((wrapper.get(`[data-testid='marketplace-offers-${filter}']`).element as HTMLSelectElement).value).toBe("")
    expect((wrapper.get("[data-testid='marketplace-offers-sort']").element as HTMLSelectElement).value).toBe("recent")
    expect(wrapper.find("[data-testid='marketplace-offers-clear']").exists()).toBe(false)
  })

  it("says so when no offer matches", async () => {
    cleanups = [
      registerEndpoint("/api/v1/marketplace/administration/offres", {
        method: "GET",
        handler: () => ({ ...PAGE, elements: [], pagination: { page: 1, taille: 50, total: 0, pages: 1 } }),
      }),
      registerEndpoint("/api/v1/marketplace/categories/administration", { method: "GET", handler: () => [] }),
    ]
    const wrapper = await mountSuspended(MarketplaceOffersWorkspace, { attachTo: document.body })
    await flushPromises()
    expect(wrapper.text()).toContain("No offer matches these criteria.")
    expect(wrapper.find("[data-testid='marketplace-offers-next']").exists()).toBe(false)
  })
})
